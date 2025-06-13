import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import pool from '@/lib/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-here'
);

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

    // Verify user is an employee and get their company_id
    const employeeQuery = await client.query(
      'SELECT employee_id, company_id FROM Employee WHERE account_id = $1',
      [payload.userId]
    );

    if (employeeQuery.rows.length === 0) {
      return NextResponse.json(
        { error: 'Only employees can mark notifications as read' },
        { status: 403 }
      );
    }

    const { employee_id, company_id } = employeeQuery.rows[0];

    await client.query('BEGIN');

    // Get all company notification IDs for this company
    const notificationIdsQuery = await client.query(
      'SELECT company_notification_id FROM company_notifications WHERE company_id = $1',
      [company_id]
    );

    // Mark all notifications as read for this employee
    for (const row of notificationIdsQuery.rows) {
      await client.query(`
        INSERT INTO employee_company_notification_read (employee_id, company_notification_id, is_read)
        VALUES ($1, $2, true)
        ON CONFLICT (employee_id, company_notification_id)
        DO UPDATE SET is_read = true
      `, [employee_id, row.company_notification_id]);
    }

    await client.query('COMMIT');

    return NextResponse.json({ 
      message: 'All notifications marked as read',
      count: notificationIdsQuery.rows.length
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error marking all notifications as read:', error);
    return NextResponse.json(
      { error: 'Failed to mark notifications as read' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
