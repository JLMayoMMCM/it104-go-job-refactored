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

    // Get user's resume
    const resumeQuery = await client.query(
      'SELECT account_resume FROM Account WHERE account_id = $1',
      [payload.userId]
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
        'Content-Disposition': 'inline; filename="resume.pdf"'
      }
    });

  } catch (error) {
    console.error('Error fetching resume:', error);
    return NextResponse.json(
      { error: 'Failed to fetch resume' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// DELETE endpoint to remove resume
export async function DELETE(request) {
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

    // Remove user's resume
    await client.query(
      'UPDATE Account SET account_resume = NULL WHERE account_id = $1',
      [payload.userId]
    );

    return NextResponse.json({
      message: 'Resume removed successfully'
    });

  } catch (error) {
    console.error('Error removing resume:', error);
    return NextResponse.json(
      { error: 'Failed to remove resume' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
