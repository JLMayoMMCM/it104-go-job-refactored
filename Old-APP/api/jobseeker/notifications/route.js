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

    // Get notifications for the job seeker
    const notificationsQuery = await client.query(`
      SELECT 
        n.notification_id,
        n.notification_text,
        n.notification_date,
        n.is_read,
        sender_acc.account_username as sender_name
      FROM Notifications n
      LEFT JOIN Account sender_acc ON n.sender_account_id = sender_acc.account_id
      WHERE n.account_id = $1
      ORDER BY n.notification_date DESC
    `, [payload.userId]);

    return NextResponse.json(notificationsQuery.rows);

  } catch (error) {
    console.error('Error fetching notifications:', error);
    return NextResponse.json(
      { error: 'Failed to fetch notifications' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
