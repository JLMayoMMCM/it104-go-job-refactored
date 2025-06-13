import { NextResponse } from 'next/server';
import pool from '@/lib/database';
import bcrypt from 'bcrypt';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function POST(request) {
  try {
    const { emailOrUsername, code, newPassword } = await request.json();

    if (!emailOrUsername || !code || !newPassword) {
      return NextResponse.json(
        { error: 'All fields are required' },
        { status: 400 }
      );
    }

    if (newPassword.length < 6) {
      return NextResponse.json(
        { error: 'Password must be at least 6 characters long' },
        { status: 400 }
      );
    }    // Verify the code one more time and get user ID
    const checkCodeQuery = `
      SELECT prc.account_id, a.account_email, a.account_username 
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
    }    const { account_id } = result.rows[0];

    // Hash the new password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(newPassword, saltRounds);

    // Start transaction
    const client = await pool.connect();
    
    try {
      await client.query('BEGIN');      // Update user password
      const updatePasswordQuery = `
        UPDATE account 
        SET account_password = $1
        WHERE account_id = $2
      `;
      await client.query(updatePasswordQuery, [hashedPassword, account_id]);

      // Mark the reset code as used
      const markCodeUsedQuery = `
        UPDATE password_reset_codes 
        SET used = true 
        WHERE account_id = $1 AND code = $2
      `;
      await client.query(markCodeUsedQuery, [account_id, code]);

      await client.query('COMMIT');

      return NextResponse.json({
        message: 'Password reset successfully'
      });

    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Reset password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
