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
    const userId = params.id;
    
    // Get resume data from database
    const resumeQuery = await client.query(
      'SELECT account_resume FROM Account WHERE account_id = $1',
      [userId]
    );

    if (resumeQuery.rows.length === 0 || !resumeQuery.rows[0].account_resume) {
      return NextResponse.json(
        { error: 'Resume not found' },
        { status: 404 }
      );
    }

    const resumeBuffer = resumeQuery.rows[0].account_resume;
    
    return new NextResponse(resumeBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="resume_${userId}.pdf"`,
      },
    });

  } catch (error) {
    console.error('Error serving resume:', error);
    return NextResponse.json(
      { error: 'Failed to serve resume' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
