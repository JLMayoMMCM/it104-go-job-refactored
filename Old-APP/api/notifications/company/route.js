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
        { error: 'Only employees can access company notifications' },
        { status: 403 }
      );
    }

    const { employee_id, company_id } = employeeQuery.rows[0];

    // Get company notifications for this company
    const notificationsQuery = await client.query(`
      SELECT 
        cn.company_notification_id,
        cn.notification_text,
        cn.notification_date,
        cn.sender_account_id,
        COALESCE(ecnr.is_read, false) as is_read,
        p.first_name,
        p.last_name
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

    const notifications = notificationsQuery.rows.map(row => ({
      id: row.company_notification_id,
      text: row.notification_text,
      date: row.notification_date,
      isRead: row.is_read,
      senderName: row.first_name && row.last_name 
        ? `${row.first_name} ${row.last_name}` 
        : 'System'
    }));

    return NextResponse.json({ notifications });

  } catch (error) {
    console.error('Error fetching company notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function PUT(request) {
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
    const { notificationId, isRead } = await request.json();

    if (!notificationId || typeof isRead !== 'boolean') {
      return NextResponse.json(
        { error: 'Notification ID and read status are required' },
        { status: 400 }
      );
    }

    // Verify user is an employee
    const employeeQuery = await client.query(
      'SELECT employee_id FROM Employee WHERE account_id = $1',
      [payload.userId]
    );

    if (employeeQuery.rows.length === 0) {
      return NextResponse.json(
        { error: 'Only employees can update notification status' },
        { status: 403 }
      );
    }

    const employee_id = employeeQuery.rows[0].employee_id;

    // Update or insert read status
    await client.query(`
      INSERT INTO employee_company_notification_read (employee_id, company_notification_id, is_read)
      VALUES ($1, $2, $3)
      ON CONFLICT (employee_id, company_notification_id)
      DO UPDATE SET is_read = $3
    `, [employee_id, notificationId, isRead]);

    return NextResponse.json({ message: 'Notification status updated successfully' });

  } catch (error) {
    console.error('Error updating notification status:', error);
    return NextResponse.json(
      { error: 'Failed to update notification status' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
