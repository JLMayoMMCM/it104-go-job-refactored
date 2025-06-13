import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import pool from '@/lib/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-here'
);

export async function GET(request) {
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

    // Get job seeker's saved jobs
    const savedJobsQuery = await client.query(`
      SELECT 
        sj.saved_job_id,
        sj.saved_date,
        j.job_id,
        j.job_name,
        j.job_location,
        j.job_salary,
        j.job_description,
        j.job_is_active,
        j.job_posted_date,
        c.company_name,
        c.company_logo,
        jt.job_type_name,
        CASE WHEN jr.request_id IS NOT NULL THEN true ELSE false END as has_applied
      FROM Saved_jobs sj
      JOIN Job_seeker js ON sj.job_seeker_id = js.job_seeker_id
      JOIN Job j ON sj.job_id = j.job_id
      JOIN Company c ON j.company_id = c.company_id
      JOIN Job_type jt ON j.job_type_id = jt.job_type_id
      LEFT JOIN Job_requests jr ON j.job_id = jr.job_id AND jr.job_seeker_id = js.job_seeker_id
      WHERE js.account_id = $1
      ORDER BY sj.saved_date DESC
    `, [payload.userId]);

    const savedJobs = savedJobsQuery.rows.map(job => ({
      ...job,
      company_logo: job.company_logo ? Buffer.from(job.company_logo).toString('base64') : null
    }));

    return NextResponse.json(savedJobs);

  } catch (error) {
    console.error('Error fetching saved jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch saved jobs' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
