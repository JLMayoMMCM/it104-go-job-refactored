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
    const { jobId, isActive } = await request.json();

    if (!jobId || typeof isActive !== 'boolean') {
      return NextResponse.json(
        { error: 'Job ID and isActive status are required' },
        { status: 400 }
      );
    }

    // Verify employee has permission to modify this job
    const jobQuery = await client.query(`
      SELECT j.job_id, j.job_name
      FROM Job j
      JOIN Employee e ON j.company_id = e.company_id
      WHERE j.job_id = $1 AND e.account_id = $2
    `, [jobId, payload.userId]);

    if (jobQuery.rows.length === 0) {
      return NextResponse.json(
        { error: 'Job not found or unauthorized' },
        { status: 404 }
      );
    }

    // Update job status
    await client.query(`
      UPDATE Job 
      SET job_is_active = $1
      WHERE job_id = $2
    `, [isActive, jobId]);

    return NextResponse.json({
      message: `Job ${isActive ? 'activated' : 'deactivated'} successfully`
    });

  } catch (error) {
    console.error('Error toggling job status:', error);
    return NextResponse.json(
      { error: 'Failed to update job status' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
