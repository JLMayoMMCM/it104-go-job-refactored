import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import pool from '@/lib/database';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-here'
);

export async function GET(request, { params }) {
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
    const jobId = params.id;

    // Get job details for the specific company
    const jobQuery = await client.query(`
      SELECT 
        j.*,
        jt.job_type_name
      FROM Job j
      JOIN Job_type jt ON j.job_type_id = jt.job_type_id
      JOIN Employee e ON j.company_id = e.company_id
      WHERE j.job_id = $1 AND e.account_id = $2
    `, [jobId, payload.userId]);

    if (jobQuery.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found or unauthorized' },
        { status: 404 }
      );
    }

    const job = jobQuery.rows[0];

    // Get job categories
    const categoriesQuery = await client.query(`
      SELECT jc.job_category_id, jc.job_category_name, cf.category_field_name
      FROM Job_Category_List jcl
      JOIN Job_category jc ON jcl.job_category_id = jc.job_category_id
      JOIN Category_field cf ON jc.category_field_id = cf.category_field_id
      WHERE jcl.job_id = $1
    `, [jobId]);

    job.categories = categoriesQuery.rows;

    return NextResponse.json(job);

  } catch (error) {
    console.error('Error fetching job details:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job details' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function PUT(request, { params }) {
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
    const jobId = params.id;

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
      jobCategories,
      jobIsActive
    } = await request.json();

    await client.query('BEGIN');    // Verify job belongs to the employee's company and get company_id
    const jobCheck = await client.query(`
      SELECT j.job_id, e.company_id
      FROM Job j
      JOIN Employee e ON j.company_id = e.company_id
      WHERE j.job_id = $1 AND e.account_id = $2
    `, [jobId, payload.userId]);

    if (jobCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Job not found or unauthorized' },
        { status: 404 }
      );
    }

    const companyId = jobCheck.rows[0].company_id;

    // Update job details
    const updateJobQuery = `
      UPDATE Job 
      SET 
        job_name = $1,
        job_description = $2,
        job_location = $3,
        job_type_id = $4,
        job_salary = $5,
        job_quantity = $6,
        job_time = $7,
        job_requirements = $8,
        job_benefits = $9,
        job_closing_date = $10,
        job_is_active = $11
      WHERE job_id = $12
      RETURNING job_id
    `;

    const updateResult = await client.query(updateJobQuery, [
      jobName,
      jobDescription,
      jobLocation,
      jobTypeId,
      jobSalary || null,
      jobQuantity,
      jobTime,
      jobRequirements,
      jobBenefits,
      jobClosingDate || null,
      jobIsActive,
      jobId
    ]);

    if (updateResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Failed to update job' },
        { status: 500 }
      );
    }

    // Delete existing job categories
    await client.query('DELETE FROM Job_Category_List WHERE job_id = $1', [jobId]);

    // Insert new job categories
    for (const categoryId of jobCategories) {
      await client.query(
        'INSERT INTO Job_Category_List (job_id, job_category_id) VALUES ($1, $2)',
        [jobId, categoryId]
      );
    }    // Send notification to all employees of the company about job update
    await client.query(`
      INSERT INTO company_notifications (company_id, notification_text, sender_account_id)
      VALUES ($1, $2, $3)
    `, [
      companyId,
      `Job "${jobName}" has been successfully updated.`,
      payload.userId
    ]);

    await client.query('COMMIT');

    return NextResponse.json({
      message: 'Job updated successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating job:', error);
    return NextResponse.json(
      { error: 'Failed to update job' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function DELETE(request, { params }) {
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
    const jobId = params.id;

    await client.query('BEGIN');    // Verify job belongs to the employee's company and get job details
    const jobCheck = await client.query(`
      SELECT j.job_id, j.job_name, e.company_id
      FROM Job j
      JOIN Employee e ON j.company_id = e.company_id
      WHERE j.job_id = $1 AND e.account_id = $2
    `, [jobId, payload.userId]);

    if (jobCheck.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Job not found or unauthorized' },
        { status: 404 }
      );
    }

    const { job_name: jobName, company_id: companyId } = jobCheck.rows[0];

    // Delete job (CASCADE will handle related records)
    await client.query('DELETE FROM Job WHERE job_id = $1', [jobId]);    // Send notification to all employees of the company about job deletion
    await client.query(`
      INSERT INTO company_notifications (company_id, notification_text, sender_account_id)
      VALUES ($1, $2, $3)
    `, [
      companyId,
      `Job "${jobName}" has been deleted successfully.`,
      payload.userId
    ]);

    await client.query('COMMIT');

    return NextResponse.json({
      message: 'Job deleted successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error deleting job:', error);
    return NextResponse.json(
      { error: 'Failed to delete job' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
