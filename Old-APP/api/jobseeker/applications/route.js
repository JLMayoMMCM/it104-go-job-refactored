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

    // Get job seeker's applications
    const applicationsQuery = await client.query(`
      SELECT 
        jr.request_id,
        jr.request_date,
        jr.request_status,
        jr.cover_letter,
        jr.employee_response,
        jr.response_date,
        j.job_id,
        j.job_name,
        j.job_location,
        j.job_salary,
        j.job_description,
        c.company_name,
        c.company_logo,
        jt.job_type_name
      FROM Job_requests jr
      JOIN Job_seeker js ON jr.job_seeker_id = js.job_seeker_id
      JOIN Job j ON jr.job_id = j.job_id
      JOIN Company c ON j.company_id = c.company_id
      JOIN Job_type jt ON j.job_type_id = jt.job_type_id
      WHERE js.account_id = $1
      ORDER BY jr.request_date DESC
    `, [payload.userId]);

    const applications = applicationsQuery.rows.map(app => ({
      ...app,
      company_logo: app.company_logo ? Buffer.from(app.company_logo).toString('base64') : null
    }));

    return NextResponse.json(applications);

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
