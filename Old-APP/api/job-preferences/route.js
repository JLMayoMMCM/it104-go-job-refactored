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

    // Get user's job preferences
    const preferencesQuery = await client.query(`
      SELECT 
        jc.job_category_id,
        jc.job_category_name,
        cf.category_field_name
      FROM Jobseeker_preference jp
      JOIN Job_category jc ON jp.preferred_job_category_id = jc.job_category_id
      JOIN Category_field cf ON jc.category_field_id = cf.category_field_id
      JOIN Person p ON jp.person_id = p.person_id
      JOIN Job_seeker js ON p.person_id = js.person_id
      WHERE js.account_id = $1
      ORDER BY cf.category_field_name, jc.job_category_name
    `, [payload.userId]);

    return NextResponse.json(preferencesQuery.rows);

  } catch (error) {
    console.error('Error fetching job preferences:', error);
    return NextResponse.json(
      { error: 'Failed to fetch job preferences' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function POST(request) {
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
    const { categoryIds } = await request.json();

    if (!Array.isArray(categoryIds)) {
      return NextResponse.json(
        { error: 'Category IDs must be an array' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Get user's person_id
    const personQuery = await client.query(`
      SELECT p.person_id
      FROM Person p
      JOIN Job_seeker js ON p.person_id = js.person_id
      WHERE js.account_id = $1
    `, [payload.userId]);

    if (personQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Job seeker profile not found' },
        { status: 404 }
      );
    }

    const personId = personQuery.rows[0].person_id;

    // Delete existing preferences
    await client.query(
      'DELETE FROM Jobseeker_preference WHERE person_id = $1',
      [personId]
    );

    // Insert new preferences
    for (const categoryId of categoryIds) {
      await client.query(
        'INSERT INTO Jobseeker_preference (person_id, preferred_job_category_id) VALUES ($1, $2)',
        [personId, categoryId]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({
      message: 'Job preferences updated successfully'
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating job preferences:', error);
    return NextResponse.json(
      { error: 'Failed to update job preferences' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
