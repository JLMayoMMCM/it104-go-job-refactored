import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import pool from '@/lib/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-here'
);

export async function POST(request, { params }) {
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
    const companyId = params.id;
    const { rating, reviewText } = await request.json();

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json(
        { error: 'Rating must be between 1 and 5' },
        { status: 400 }
      );
    }

    await client.query('BEGIN');

    // Get job seeker ID
    const jobSeekerQuery = await client.query(
      'SELECT job_seeker_id FROM Job_seeker WHERE account_id = $1',
      [payload.userId]
    );

    if (jobSeekerQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'Only job seekers can rate companies' },
        { status: 403 }
      );
    }

    const jobSeekerId = jobSeekerQuery.rows[0].job_seeker_id;

    // Insert or update rating
    await client.query(`
      INSERT INTO Company_ratings (company_id, job_seeker_id, rating, review_text)
      VALUES ($1, $2, $3, $4)
      ON CONFLICT (company_id, job_seeker_id)
      DO UPDATE SET rating = $3, review_text = $4, rating_date = CURRENT_TIMESTAMP
    `, [companyId, jobSeekerId, rating, reviewText]);

    // Update company's average rating
    const avgRatingQuery = await client.query(`
      SELECT AVG(rating)::NUMERIC(3,2) as avg_rating
      FROM Company_ratings
      WHERE company_id = $1
    `, [companyId]);

    const avgRating = avgRatingQuery.rows[0].avg_rating;

    await client.query(
      'UPDATE Company SET company_rating = $1 WHERE company_id = $2',
      [avgRating, companyId]
    );

    await client.query('COMMIT');

    return NextResponse.json({
      message: 'Rating submitted successfully',
      averageRating: parseFloat(avgRating)
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error rating company:', error);
    return NextResponse.json(
      { error: 'Failed to submit rating' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
