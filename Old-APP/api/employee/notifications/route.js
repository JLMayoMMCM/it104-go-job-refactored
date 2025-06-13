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
    const { payload } = await jwtVerify(token, JWT_SECRET);    // First, check if user is an employee and get their details
    const employeeQuery = await client.query(
      'SELECT employee_id, company_id FROM Employee WHERE account_id = $1',
      [payload.userId]
    );    // Check if user is an employee - if not, return empty array
    if (employeeQuery.rows.length === 0) {
      return NextResponse.json([]);
    }

    const { employee_id, company_id } = employeeQuery.rows[0];
    
    // Employees only get company notifications, not individual notifications
    const companyNotificationsQuery = await client.query(`
      SELECT 
        cn.company_notification_id as notification_id,
        cn.notification_text,
        cn.notification_date,
        COALESCE(ecnr.is_read, false) as is_read,
        CASE 
          WHEN p.first_name IS NOT NULL THEN CONCAT(p.first_name, ' ', p.last_name)
          ELSE 'System'
        END as sender_name,
        'company' as notification_type
      FROM company_notifications cn
      LEFT JOIN employee_company_notification_read ecnr 
        ON cn.company_notification_id = ecnr.company_notification_id 
        AND ecnr.employee_id = $1
      LEFT JOIN account a ON cn.sender_account_id = a.account_id
      LEFT JOIN job_seeker js ON a.account_id = js.account_id
      LEFT JOIN person p ON js.person_id = p.person_id
      WHERE cn.company_id = $2
      ORDER BY cn.notification_date DESC
    `, [employee_id, company_id]);

    const allNotifications = companyNotificationsQuery.rows;

    return NextResponse.json(allNotifications);

  } catch (error) {
    console.error('Error fetching employee notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
