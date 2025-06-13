import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import pool from '@/lib/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-here'
);

export async function POST(request) {
  const client = await pool.connect();
  
  try {
    const { email, code } = await request.json();

    if (!email || !code) {
      return NextResponse.json(
        { error: 'Email and verification code are required' },
        { status: 400 }
      );
    }

    // Validate code format
    if (!/^\d{6}$/.test(code)) {
      return NextResponse.json(
        { error: 'Invalid verification code format' },
        { status: 400 }
      );
    }    // Get user by email with account type
    const userQuery = await client.query(`
      SELECT 
        a.account_id, a.account_username, a.account_email, a.account_is_verified,
        at.account_type_name
      FROM Account a
      JOIN Account_type at ON a.account_type_id = at.account_type_id
      WHERE a.account_email = $1
    `, [email]);

    if (userQuery.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userQuery.rows[0];

    if (user.account_is_verified) {
      return NextResponse.json(
        { error: 'Account already verified' },
        { status: 400 }
      );
    }

    // Validate verification code against database
    const codeQuery = await client.query(
      'SELECT code, expires_at FROM Verification_codes WHERE account_id = $1',
      [user.account_id]
    );

    if (codeQuery.rows.length === 0) {
      return NextResponse.json(
        { error: 'No verification code found. Please request a new one.' },
        { status: 400 }
      );
    }

    const { code: storedCode, expires_at } = codeQuery.rows[0];

    // Check if code has expired
    if (new Date() > new Date(expires_at)) {
      // Delete expired code
      await client.query(
        'DELETE FROM Verification_codes WHERE account_id = $1',
        [user.account_id]
      );
      return NextResponse.json(
        { error: 'Verification code has expired. Please request a new one.' },
        { status: 400 }
      );
    }

    // Validate the code
    if (code !== storedCode) {
      return NextResponse.json(
        { error: 'Invalid verification code' },
        { status: 400 }
      );
    }

    // Mark account as verified and remove verification code
    await client.query('BEGIN');
    
    await client.query(
      'UPDATE Account SET account_is_verified = true WHERE account_id = $1',
      [user.account_id]
    );

    await client.query(
      'DELETE FROM Verification_codes WHERE account_id = $1',
      [user.account_id]
    );    await client.query('COMMIT');

    // Check if job seeker has preferences set
    let hasPreferences = false;
    if (user.account_type_name === 'Job Seeker') {
      const preferencesQuery = await client.query(`
        SELECT COUNT(*) as preference_count
        FROM Jobseeker_preference jp
        JOIN Person p ON jp.person_id = p.person_id
        JOIN Job_seeker js ON p.person_id = js.person_id
        WHERE js.account_id = $1
      `, [user.account_id]);
      
      hasPreferences = parseInt(preferencesQuery.rows[0].preference_count) > 0;
    }

    // Generate JWT token
    const token = await new SignJWT({ 
      userId: user.account_id,
      email: user.account_email,
      username: user.account_username 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);    return NextResponse.json({
      message: 'Email verified successfully',
      token,
      user: {
        id: user.account_id,
        email: user.account_email,
        username: user.account_username,
        isVerified: true,
        isJobSeeker: user.account_type_name === 'Job Seeker',
        isEmployee: user.account_type_name === 'Company',
        hasPreferences
      }
    });

  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    console.error('Verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// Export other HTTP methods to satisfy Next.js requirements
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
