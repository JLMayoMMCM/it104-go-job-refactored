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

    // Get employee's company jobs
    const jobsQuery = await client.query(`
      SELECT 
        j.*,
        jt.job_type_name,
        COUNT(jr.request_id) as application_count
      FROM Job j
      JOIN Job_type jt ON j.job_type_id = jt.job_type_id
      JOIN Employee e ON j.company_id = e.company_id
      LEFT JOIN Job_requests jr ON j.job_id = jr.job_id
      WHERE e.account_id = $1
      GROUP BY j.job_id, jt.job_type_name
      ORDER BY j.job_posted_date DESC
    `, [payload.userId]);

    return NextResponse.json(jobsQuery.rows);

  } catch (error) {
    console.error('Error fetching job history:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job history' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
