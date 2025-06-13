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

    // Get applications for all jobs posted by this employee's company
    const applicationsQuery = await client.query(`
      SELECT 
        jr.request_id,
        jr.job_id,
        jr.job_seeker_id,
        jr.request_date,
        jr.request_status,
        jr.cover_letter,
        jr.employee_response,
        jr.response_date,
        j.job_name,
        p.first_name || ' ' || p.last_name as applicant_name,
        a.account_email as applicant_email,
        a.account_id as applicant_account_id
      FROM Job_requests jr
      JOIN Job j ON jr.job_id = j.job_id
      JOIN Employee e ON j.company_id = e.company_id
      JOIN Job_seeker js ON jr.job_seeker_id = js.job_seeker_id
      JOIN Person p ON js.person_id = p.person_id
      JOIN Account a ON js.account_id = a.account_id
      WHERE e.account_id = $1
      ORDER BY jr.request_date DESC
    `, [payload.userId]);

    return NextResponse.json(applicationsQuery.rows);

  } catch (error) {
    console.error('Error fetching applications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applications' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
