import { NextResponse } from 'next/server';
import pool from '@/lib/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { emailOrUsername, code } = await request.json();

    if (!emailOrUsername || !code) {
      return NextResponse.json(
        { error: 'Email/username and verification code are required' },
        { status: 400 }
      );
    }    // Get user and check if code is valid
    const checkCodeQuery = `
      SELECT prc.*, a.account_email, a.account_username 
      FROM password_reset_codes prc
      JOIN account a ON prc.account_id = a.account_id
      WHERE (a.account_email = $1 OR a.account_username = $1)
        AND prc.code = $2
        AND prc.expires_at > NOW()
        AND prc.used = false
    `;

    const result = await pool.query(checkCodeQuery, [emailOrUsername, code]);

    if (result.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      message: 'Verification code is valid',
      valid: true
    });

  } catch (error) {
    console.error('Verify reset code error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
