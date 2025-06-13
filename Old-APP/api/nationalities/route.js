import { NextResponse } from 'next/server';
import pool from '@/lib/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';


export async function GET() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      'SELECT nationality_id, nationality_name FROM nationality ORDER BY nationality_name ASC'
    );
    
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Error fetching nationalities:', error);
    return NextResponse.json(
      { error: 'Failed to fetch nationalities' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
