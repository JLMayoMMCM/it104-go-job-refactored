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

    // Get jobseeker stats
    const statsQuery = await client.query(`
      SELECT 
        COUNT(jr.request_id) as applications,
        COUNT(CASE WHEN jr.request_status = 'pending' THEN 1 END) as pending,
        COUNT(CASE WHEN jr.request_status = 'accepted' THEN 1 END) as accepted,
        COUNT(CASE WHEN jr.request_status = 'rejected' THEN 1 END) as rejected,
        COUNT(sj.saved_job_id) as saved_jobs
      FROM Job_seeker js
      LEFT JOIN Job_requests jr ON js.job_seeker_id = jr.job_seeker_id
      LEFT JOIN Saved_jobs sj ON js.job_seeker_id = sj.job_seeker_id
      WHERE js.account_id = $1
      GROUP BY js.job_seeker_id
    `, [payload.userId]);

    const stats = statsQuery.rows[0] || {
      applications: 0,
      pending: 0,
      accepted: 0,
      rejected: 0,
      saved_jobs: 0
    };

    return NextResponse.json({
      applications: parseInt(stats.applications),
      pending: parseInt(stats.pending),
      accepted: parseInt(stats.accepted),
      rejected: parseInt(stats.rejected),
      savedJobs: parseInt(stats.saved_jobs)
    });

  } catch (error) {
    console.error('Error fetching jobseeker stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch statistics' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
