import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import pool from '@/lib/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-here'
);

export async function POST(request) {
  const client = await pool.connect();
  
  try {
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { payload } = await jwtVerify(token, JWT_SECRET);

    const {
      jobName,
      jobDescription,
      jobLocation,
      jobTypeId,
      jobSalary,
      jobQuantity,
      jobTime,
      jobRequirements,
      jobBenefits,
      jobClosingDate,
      jobCategories
    } = await request.json();

    // Validation
    if (!jobName || !jobDescription || !jobLocation || !jobTypeId) {
      return NextResponse.json(
        { error: 'Job name, description, location, and type are required' },
        { status: 400 }
      );
    }

    if (!jobCategories || jobCategories.length === 0) {
      return NextResponse.json(
        { error: 'At least one job category must be selected' },
        { status: 400 }
      );
    }

    // Get employee's company
    const employeeQuery = await client.query(
      'SELECT company_id FROM Employee WHERE account_id = $1',
      [payload.userId]
    );

    if (employeeQuery.rows.length === 0) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    const companyId = employeeQuery.rows[0].company_id;

    await client.query('BEGIN');

    // Create job
    const jobResult = await client.query(`
      INSERT INTO Job (
        company_id, job_name, job_description, job_location, job_type_id,
        job_salary, job_quantity, job_time, job_requirements, job_benefits, job_closing_date
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING job_id
    `, [
      companyId,
      jobName,
      jobDescription,
      jobLocation,
      jobTypeId,
      jobSalary || null,
      jobQuantity || 1,
      jobTime || null,
      jobRequirements || null,
      jobBenefits || null,
      jobClosingDate || null
    ]);

    // Create job categories associations
    for (const categoryId of jobCategories) {
      await client.query(
        'INSERT INTO Job_Category_List (job_id, job_category_id) VALUES ($1, $2)',
        [jobResult.rows[0].job_id, categoryId]
      );
    }    // Send notification to all employees of the company about successful job creation
    await client.query(`
      INSERT INTO company_notifications (company_id, notification_text, sender_account_id)
      VALUES ($1, $2, $3)
    `, [
      companyId,
      `Job "${jobName}" has been successfully created and is now active for applications.`,
      payload.userId
    ]);

    await client.query('COMMIT');

    return NextResponse.json({
      message: 'Job created successfully',
      jobId: jobResult.rows[0].job_id
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating job:', error);
    return NextResponse.json(
      { error: 'Failed to create job' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
