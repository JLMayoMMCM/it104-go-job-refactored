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

    // Verify user is an employee and get their company_id
    const employeeQuery = await client.query(
      'SELECT employee_id, company_id FROM Employee WHERE account_id = $1',
      [payload.userId]
    );

    if (employeeQuery.rows.length === 0) {
      return NextResponse.json(
        { error: 'Only employees can access notification count' },
        { status: 403 }
      );
    }

    const { employee_id, company_id } = employeeQuery.rows[0];

    // Count unread notifications for this employee
    const unreadCountQuery = await client.query(`
      SELECT COUNT(*) as unread_count
      FROM company_notifications cn
      LEFT JOIN employee_company_notification_read ecnr 
        ON cn.company_notification_id = ecnr.company_notification_id 
        AND ecnr.employee_id = $1
      WHERE cn.company_id = $2 
        AND (ecnr.is_read IS NULL OR ecnr.is_read = false)
    `, [employee_id, company_id]);

    const unreadCount = parseInt(unreadCountQuery.rows[0].unread_count);

    return NextResponse.json({ unreadCount });

  } catch (error) {
    console.error('Error fetching unread notification count:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notification count' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
