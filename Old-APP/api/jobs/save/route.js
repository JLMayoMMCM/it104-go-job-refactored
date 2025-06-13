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
    const { jobId } = await request.json();

    if (!jobId) {
      return NextResponse.json(
        { error: 'Job ID is required' },
        { status: 400 }
      );
    }

    // Verify user is a job seeker
    const jobSeekerQuery = await client.query(
      'SELECT job_seeker_id FROM Job_seeker WHERE account_id = $1',
      [payload.userId]
    );

    if (jobSeekerQuery.rows.length === 0) {
      return NextResponse.json(
        { error: 'Only job seekers can save jobs' },
        { status: 403 }
      );
    }

    const jobSeekerId = jobSeekerQuery.rows[0].job_seeker_id;

    // Check if job is already saved
    const savedJobQuery = await client.query(
      'SELECT saved_job_id FROM Saved_jobs WHERE job_id = $1 AND job_seeker_id = $2',
      [jobId, jobSeekerId]
    );

    if (savedJobQuery.rows.length > 0) {
      // Remove from saved jobs
      await client.query(
        'DELETE FROM Saved_jobs WHERE job_id = $1 AND job_seeker_id = $2',
        [jobId, jobSeekerId]
      );

      return NextResponse.json({
        message: 'Job removed from saved jobs',
        isSaved: false
      });
    } else {
      // Add to saved jobs
      await client.query(
        'INSERT INTO Saved_jobs (job_id, job_seeker_id) VALUES ($1, $2)',
        [jobId, jobSeekerId]
      );

      return NextResponse.json({
        message: 'Job saved successfully',
        isSaved: true
      });
    }

  } catch (error) {
    console.error('Error saving/unsaving job:', error);
    return NextResponse.json(
      { error: 'Failed to save/unsave job' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
