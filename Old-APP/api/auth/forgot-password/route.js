import { NextResponse } from 'next/server';
import pool from '@/lib/database';
import { sendEmail } from '@/lib/email';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// Generate random 6-digit code
function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request) {
  try {
    const { emailOrUsername } = await request.json();

    if (!emailOrUsername) {
      return NextResponse.json(
        { error: 'Email or username is required' },
        { status: 400 }
      );
    }    // Check if user exists by email or username
    const checkUserQuery = `
      SELECT account_id, account_email, account_username 
      FROM account 
      WHERE account_email = $1 OR account_username = $1
    `;
    
    const userResult = await pool.query(checkUserQuery, [emailOrUsername]);

    if (userResult.rows.length === 0) {
      return NextResponse.json(
        { error: 'No account found with this email or username' },
        { status: 404 }
      );
    }

    const user = userResult.rows[0];
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now    // Store or update the reset code in database
    const upsertCodeQuery = `
      INSERT INTO password_reset_codes (account_id, code, expires_at, created_at)
      VALUES ($1, $2, $3, NOW())
      ON CONFLICT (account_id)
      DO UPDATE SET 
        code = $2,
        expires_at = $3,
        created_at = NOW(),
        used = false
    `;

    await pool.query(upsertCodeQuery, [user.account_id, verificationCode, expiresAt]);

    // Send email with verification code
    const emailContent = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #5585b5;">Password Reset Request</h2>
        <p>Hello ${user.account_username},</p>
        <p>You have requested to reset your password for your GO JOB account.</p>
        <p>Your verification code is:</p>
        <div style="background: #f8f9fa; padding: 20px; text-align: center; border-radius: 8px; margin: 20px 0;">
          <h1 style="color: #5585b5; font-size: 2em; margin: 0; letter-spacing: 3px;">${verificationCode}</h1>
        </div>
        <p>This code will expire in 15 minutes.</p>
        <p>If you didn't request this password reset, please ignore this email.</p>
        <p>Best regards,<br>GO JOB Team</p>
      </div>
    `;    const emailResult = await sendEmail(
      user.account_email,
      'Password Reset Verification Code',
      emailContent
    );

    if (!emailResult.success) {
      return NextResponse.json(
        { error: 'Failed to send verification email' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      message: 'Verification code sent successfully',
      email: user.account_email.replace(/(.{2}).*(@.*)/, '$1***$2') // Partially hide email
    });

  } catch (error) {
    console.error('Forgot password error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
