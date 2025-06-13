import { NextResponse } from 'next/server';
import pool from '@/lib/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';


export async function GET() {
  const client = await pool.connect();
  
  try {
    const categoriesQuery = await client.query(`
      SELECT 
        jc.job_category_id,
        jc.job_category_name,
        cf.category_field_id,
        cf.category_field_name
      FROM Job_category jc
      JOIN Category_field cf ON jc.category_field_id = cf.category_field_id
      ORDER BY cf.category_field_name, jc.job_category_name
    `);

    return NextResponse.json(categoriesQuery.rows);

  } catch (error) {
    console.error('Error fetching job categories:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job categories' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
