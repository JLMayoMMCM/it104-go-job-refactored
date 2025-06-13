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

    // Get all employees in the same company
    const employeesQuery = await client.query(`
      SELECT 
        e.employee_id,
        e.position_name,
        p.first_name || ' ' || p.last_name as full_name,
        a.account_email,
        a.account_username
      FROM Employee e1
      JOIN Employee e ON e1.company_id = e.company_id
      JOIN Person p ON e.person_id = p.person_id
      JOIN Account a ON e.account_id = a.account_id
      WHERE e1.account_id = $1
      ORDER BY p.first_name, p.last_name
    `, [payload.userId]);

    return NextResponse.json(employeesQuery.rows);

  } catch (error) {
    console.error('Error fetching company employees:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company employees' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
