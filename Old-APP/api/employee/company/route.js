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

    // Get employee's company with address
    const companyQuery = await client.query(`
      SELECT 
        c.*,
        addr.premise_name,
        addr.street_name,
        addr.barangay_name,
        addr.city_name
      FROM Employee e
      JOIN Company c ON e.company_id = c.company_id
      JOIN Address addr ON c.address_id = addr.address_id
      WHERE e.account_id = $1
    `, [payload.userId]);

    if (companyQuery.rows.length === 0) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(companyQuery.rows[0]);

  } catch (error) {
    console.error('Error fetching company data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch company data' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
