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
    const { jobId, coverLetter } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Verify user is a job seeker
    const jobSeekerQuery = await client.query(
      'SELECT job_seeker_id FROM Job_seeker WHERE account_id = $1',
      [payload.userId]
    );

    if (jobSeekerQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Only job seekers can apply for jobs' },
        { status: 403 }
      );
    }

    const jobSeekerId = jobSeekerQuery.rows[0].job_seeker_id;

    // Verify job exists and is active
    const jobQuery = await client.query(
      'SELECT job_id, job_name, job_is_active FROM Job WHERE job_id = $1',
      [jobId]
    );

    if (jobQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Job not found' },
        { status: 404 }
      );
    }

    const job = jobQuery.rows[0];

    if (!job.job_is_active) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'This job is no longer accepting applications' },
        { status: 400 }
      );
    }

    // Check if user has already applied
    const existingApplicationQuery = await client.query(
      'SELECT request_id FROM Job_requests WHERE job_id = $1 AND job_seeker_id = $2',
      [jobId, jobSeekerId]
    );

    if (existingApplicationQuery.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'You have already applied for this job' },
        { status: 400 }
      );
    }

    // Insert the job application
    const applicationResult = await client.query(`
      INSERT INTO Job_requests (job_id, job_seeker_id, cover_letter)
      VALUES ($1, $2, $3)
      RETURNING request_id
    `, [jobId, jobSeekerId, coverLetter]);    // Get job and company details for notification
    const jobDetailsQuery = await client.query(`
      SELECT j.job_name, c.company_name, c.company_id, js.person_id
      FROM Job j
      JOIN Company c ON j.company_id = c.company_id
      JOIN Job_seeker js ON js.job_seeker_id = $2
      WHERE j.job_id = $1
    `, [jobId, jobSeekerId]);

    if (jobDetailsQuery.rows.length > 0) {
      const jobDetails = jobDetailsQuery.rows[0];
      
      // Get job seeker name for notification
      const jobSeekerNameQuery = await client.query(`
        SELECT first_name, last_name FROM Person WHERE person_id = $1
      `, [jobDetails.person_id]);
      
      const jobSeekerName = jobSeekerNameQuery.rows.length > 0 
        ? `${jobSeekerNameQuery.rows[0].first_name} ${jobSeekerNameQuery.rows[0].last_name}`
        : 'A job seeker';
      
      // Send notification to company (all employees will see this)
      await client.query(`
        INSERT INTO company_notifications (company_id, notification_text, sender_account_id)
        VALUES ($1, $2, $3)
      `, [
        jobDetails.company_id,
        `${jobSeekerName} has applied for the "${jobDetails.job_name}" position.`,
        payload.userId
      ]);
    }

    await client.query('COMMIT');

    return NextResponse.json({
      message: 'Application submitted successfully',
      applicationId: applicationResult.rows[0].request_id
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error submitting job application:', error);
    return NextResponse.json(
      { error: 'Failed to submit application' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
