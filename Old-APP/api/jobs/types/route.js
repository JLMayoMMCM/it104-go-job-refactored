import { NextResponse } from 'next/server';
import pool from '@/lib/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';


export async function GET() {
  const client = await pool.connect();
  
  try {
    const typesQuery = await client.query(`
      SELECT job_type_id, job_type_name
      FROM Job_type
      ORDER BY job_type_name
    `);

    return NextResponse.json(typesQuery.rows);

  } catch (error) {
    console.error('Error fetching job types:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job types' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
