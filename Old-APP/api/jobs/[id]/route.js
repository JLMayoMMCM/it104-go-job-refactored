import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import pool from '@/lib/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-here'
);

export async function GET(request, { params }) {
  const client = await pool.connect();
  
  try {
    const jobId = params.id;
    const authHeader = request.headers.get('authorization');
    let userId = null;

    // Check if user is authenticated
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const { payload } = await jwtVerify(token, JWT_SECRET);
        userId = payload.userId;
      } catch (error) {
        // Token invalid, continue as guest
      }
    }

    // Get job details with company information
    const jobQuery = await client.query(`
      SELECT 
        j.*,
        c.company_id, c.company_name, c.company_rating, c.company_logo,
        c.company_description, c.company_website, c.company_phone,
        jt.job_type_name,
        a.premise_name, a.street_name, a.barangay_name, a.city_name
      FROM Job j
      JOIN Company c ON j.company_id = c.company_id
      JOIN Job_type jt ON j.job_type_id = jt.job_type_id
      JOIN Address a ON c.address_id = a.address_id
      WHERE j.job_id = $1
    `, [jobId]);

    if (jobQuery.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found' },
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

    let hasApplied = false;
    let isSaved = false;

    // Check if user has applied or saved this job (only for authenticated users)
    if (userId) {
      const applicationQuery = await client.query(`
        SELECT 1 FROM Job_requests jr
        JOIN Job_seeker js ON jr.job_seeker_id = js.job_seeker_id
        WHERE jr.job_id = $1 AND js.account_id = $2
      `, [jobId, userId]);

      hasApplied = applicationQuery.rows.length > 0;

      const savedQuery = await client.query(`
        SELECT 1 FROM Saved_jobs sj
        JOIN Job_seeker js ON sj.job_seeker_id = js.job_seeker_id
        WHERE sj.job_id = $1 AND js.account_id = $2
      `, [jobId, userId]);

      isSaved = savedQuery.rows.length > 0;
    }

    return NextResponse.json({
      ...job,
      hasApplied,
      isSaved
    });

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
