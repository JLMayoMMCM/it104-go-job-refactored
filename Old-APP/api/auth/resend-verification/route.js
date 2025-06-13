import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import pool from '@/lib/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-here'
);

export async function POST(request) {
  const client = await pool.connect();
  
  try {
    const authHeader = request.headers.get('authorization');
    const { email } = await request.json();

    let userEmail = email;

    // If authenticated, get email from token
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const { payload } = await jwtVerify(token, JWT_SECRET);
        userEmail = payload.email;
      } catch (error) {
        // If token is invalid, fall back to email from request body
      }
    }

    if (!userEmail) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user exists
    const userQuery = await client.query(
      'SELECT account_id, account_is_verified FROM Account WHERE account_email = $1',
      [userEmail]
    );

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

    // Generate new verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await client.query('BEGIN');

    // Ensure verification_codes table exists
    await client.query(`
      CREATE TABLE IF NOT EXISTS Verification_codes (
        account_id INTEGER PRIMARY KEY REFERENCES Account(account_id) ON DELETE CASCADE,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Insert or update verification code
    await client.query(
      'INSERT INTO Verification_codes (account_id, code, expires_at) VALUES ($1, $2, $3) ON CONFLICT (account_id) DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at, created_at = CURRENT_TIMESTAMP',
      [user.account_id, verificationCode, expiresAt]
    );

    await client.query('COMMIT');    // Send verification email via API
    let emailSent = false;
    let emailError = null;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/email/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: userEmail, code: verificationCode })
      });
      const data = await res.json();
      emailSent = data.success;
      if (!data.success) emailError = data.error;
    } catch (emailSendError) {
      emailError = emailSendError.message;
    }

    // Provide appropriate response based on email status
    const responseMessage = emailError && emailError.includes('Email credentials not configured')
      ? 'Verification email generated! Email verification is currently disabled (development mode).'
      : emailSent 
        ? 'Verification email sent successfully! Please check your email.'
        : 'Verification email generated! However, email could not be sent. Please contact support.';
    
    return NextResponse.json({
      message: responseMessage,
      emailSent: emailSent,
      emailSimulated: emailError && emailError.includes('Email credentials not configured'),
      // Remove this in production - only for demo when email is not configured
      code: process.env.NODE_ENV === 'development' && emailError ? verificationCode : undefined
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error resending verification email:', error);
    return NextResponse.json(
      { error: 'Failed to resend verification email' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
