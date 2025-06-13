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

    // Get employee's company
    const employeeQuery = await client.query(
      'SELECT company_id FROM Employee WHERE account_id = $1',
      [payload.userId]
    );

    if (employeeQuery.rows.length === 0) {
      return NextResponse.json(
        { error: 'Employee not found' },
        { status: 404 }
      );
    }

    const companyId = employeeQuery.rows[0].company_id;
    
    // Get active jobs count
    const activeJobsQuery = await client.query(
      'SELECT COUNT(*) as count FROM Job WHERE company_id = $1 AND job_is_active = true',
      [companyId]
    );
    
    // Get pending job requests count
    const pendingRequestsQuery = await client.query(`
      SELECT COUNT(*) as count
      FROM Job_requests jr
      JOIN Job j ON jr.job_id = j.job_id
      WHERE j.company_id = $1 AND jr.request_status = 'pending'
    `, [companyId]);
    
    // Get filled positions count (accepted requests in the current month)
    const filledPositionsQuery = await client.query(`
      SELECT COUNT(*) as count
      FROM Job_requests jr
      JOIN Job j ON jr.job_id = j.job_id
      WHERE j.company_id = $1 
      AND jr.request_status = 'accepted'
      AND jr.response_date >= date_trunc('month', CURRENT_DATE)
    `, [companyId]);

    // Get total jobs count
    const totalJobsQuery = await client.query(
      'SELECT COUNT(*) as count FROM Job WHERE company_id = $1',
      [companyId]
    );

    const stats = {
      activeJobs: parseInt(activeJobsQuery.rows[0].count),
      pendingApplications: parseInt(pendingRequestsQuery.rows[0].count),
      filledPositions: parseInt(filledPositionsQuery.rows[0].count),
      totalJobs: parseInt(totalJobsQuery.rows[0].count)
    };

    return NextResponse.json(stats);

  } catch (error) {
    console.error('Error fetching employee stats:', error);
    return NextResponse.json(
      { error: 'Failed to fetch employee statistics' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
