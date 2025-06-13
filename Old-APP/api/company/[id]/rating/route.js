import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import pool from '@/lib/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-here'
);

export async function GET(request, { params }) {
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

    // Get job seeker's rating for this company
    const ratingQuery = await client.query(`
      SELECT cr.rating, cr.review_text, cr.rating_date
      FROM Company_ratings cr
      JOIN Job_seeker js ON cr.job_seeker_id = js.job_seeker_id
      WHERE cr.company_id = $1 AND js.account_id = $2
    `, [companyId, payload.userId]);

    if (ratingQuery.rows.length === 0) {
      return NextResponse.json({ hasRated: false });
    }

    return NextResponse.json({
      hasRated: true,
      ...ratingQuery.rows[0]
    });

  } catch (error) {
    console.error('Error fetching user rating:', error);
    return NextResponse.json(
      { error: 'Failed to fetch rating' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
