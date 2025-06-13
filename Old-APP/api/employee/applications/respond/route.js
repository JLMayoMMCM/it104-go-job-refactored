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
    const { applicationId, status, response } = await request.json();

    if (!applicationId || !status) {
      return NextResponse.json(
        { error: 'Application ID and status are required' },
        { status: 400 }
      );
    }

    if (!['accepted', 'rejected'].includes(status)) {
      return NextResponse.json(
        { error: 'Status must be either accepted or rejected' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Verify employee has permission to respond to this application
    const applicationQuery = await client.query(`
      SELECT jr.*, j.job_name, js.account_id as applicant_account_id
      FROM Job_requests jr
      JOIN Job j ON jr.job_id = j.job_id
      JOIN Employee e ON j.company_id = e.company_id
      JOIN Job_seeker js ON jr.job_seeker_id = js.job_seeker_id
      WHERE jr.request_id = $1 AND e.account_id = $2
    `, [applicationId, payload.userId]);

    if (applicationQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Application not found or unauthorized' },
        { status: 404 }
      );
    }

    const application = applicationQuery.rows[0];

    // Update application status
    await client.query(`
      UPDATE Job_requests 
      SET request_status = $1, employee_response = $2, response_date = CURRENT_TIMESTAMP
      WHERE request_id = $3
    `, [status, response, applicationId]);

    // Create notification for applicant
    await client.query(`
      INSERT INTO Notifications (account_id, notification_text, sender_account_id)
      VALUES ($1, $2, $3)
    `, [
      application.applicant_account_id,
      `Your application for ${application.job_name} has been ${status}. ${response ? 'Message: ' + response : ''}`,
      payload.userId
    ]);

    await client.query('COMMIT');

    return NextResponse.json({
      message: `Application ${status} successfully`
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error responding to application:', error);
    return NextResponse.json(
      { error: 'Failed to respond to application' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
