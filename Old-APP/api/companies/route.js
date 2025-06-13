import { NextResponse } from 'next/server';
import pool from '@/lib/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';


export async function GET() {
  const client = await pool.connect();
  
  try {
    // Get all companies for employer selection
    const companiesQuery = await client.query(`
      SELECT company_id, company_name, 
             addr.city_name, addr.barangay_name
      FROM Company c
      JOIN Address addr ON c.address_id = addr.address_id
      ORDER BY company_name ASC
    `);

    return NextResponse.json(companiesQuery.rows);

  } catch (error) {
    console.error('Error fetching companies:', error);
    return NextResponse.json(
      { error: 'Failed to fetch companies' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
