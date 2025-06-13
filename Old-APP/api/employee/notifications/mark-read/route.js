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
    }    const token = authHeader.split(' ')[1];
    const { payload } = await jwtVerify(token, JWT_SECRET);
    const { notificationId, notificationType } = await request.json();

    if (!notificationId) {
      return NextResponse.json(
        { error: 'Notification ID is required' },
        { status: 400 }
      );
    }    // Verify user is an employee
    const employeeQuery = await client.query(
      'SELECT employee_id FROM Employee WHERE account_id = $1',
      [payload.userId]
    );

    if (employeeQuery.rows.length === 0) {
      return NextResponse.json(
        { error: 'Only employees can access this endpoint' },
        { status: 403 }
      );
    }

    // Employees can only mark company notifications as read
    if (notificationType !== 'company') {
      return NextResponse.json(
        { error: 'Employees can only mark company notifications as read' },
        { status: 400 }
      );
    }

    const employee_id = employeeQuery.rows[0].employee_id;

    const result = await client.query(`
      INSERT INTO employee_company_notification_read (employee_id, company_notification_id, is_read)
      VALUES ($1, $2, true)
      ON CONFLICT (employee_id, company_notification_id)
      DO UPDATE SET is_read = true
      RETURNING employee_id
    `, [employee_id, notificationId]);    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Notification not found or unauthorized' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Notification marked as read'
    });

  } catch (error) {
    console.error('Error marking notification as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notification as read' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
