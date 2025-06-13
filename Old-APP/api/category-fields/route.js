import { NextResponse } from 'next/server';
import pool from '@/lib/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';


export async function GET() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      'SELECT category_field_id, category_field_name FROM Category_field ORDER BY category_field_name'
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching category fields:', error);
    return NextResponse.json(
      { error: 'Failed to fetch category fields' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
