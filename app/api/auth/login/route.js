import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { sendVerificationEmail } from '../../../lib/emailService';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const { usernameOrEmail, password, accountType } = await request.json();

    if (!usernameOrEmail || !password || !accountType) {
      return NextResponse.json(
        { message: 'Username/email, password, and account type are required' },
        { status: 400 }
      );
    }

    // Find account by username or email with the specified account type
    const { data: accounts, error: accountError } = await supabase
      .from('account')
      .select('*')
      .eq('account_type_id', accountType)
      .or(`account_username.eq.${usernameOrEmail},account_email.eq.${usernameOrEmail}`);

    if (accountError) {
      console.error('Database error:', accountError);
      return NextResponse.json(
        { message: 'Database error occurred' },
        { status: 500 }
      );
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    const account = accounts[0];

    // Verify password
    const isPasswordValid = await bcrypt.compare(password, account.account_password);

    if (!isPasswordValid) {
      return NextResponse.json(
        { message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if account is verified
    if (!account.account_is_verified) {
      // Generate and send verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store verification code - first delete existing, then insert new
      const { error: deleteError } = await supabase
        .from('verification_codes')
        .delete()
        .eq('account_id', account.account_id);

      if (deleteError) {
        console.error('Error deleting existing verification code:', deleteError);
      }

      const { error: codeError } = await supabase
        .from('verification_codes')
        .insert({
          account_id: account.account_id,
          code: verificationCode,
          expires_at: expiresAt.toISOString()
        });

      if (codeError) {
        console.error('Error storing verification code:', codeError);
        return NextResponse.json(
          { message: 'Error generating verification code. Please try again.' },
          { status: 500 }
        );
      }

      // Send verification email using direct service
      try {
        await sendVerificationEmail({
          email: account.account_email,
          code: verificationCode,
          type: 'registration'
        });
      } catch (emailError) {
        console.error('Error sending verification email:', emailError);
      }

      return NextResponse.json({
        message: 'Account not verified. Verification code sent to your email.',
        requiresVerification: true,
        verificationType: 'Registration',
        accountId: account.account_id
      });
    }

    // Account is verified - generate login verification code
    const loginVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store login verification code - first delete existing, then insert new
    const { error: deleteLoginError } = await supabase
      .from('verification_codes')
      .delete()
      .eq('account_id', account.account_id);

    if (deleteLoginError) {
      console.error('Error deleting existing login verification code:', deleteLoginError);
    }

    const { error: loginCodeError } = await supabase
      .from('verification_codes')
      .insert({
        account_id: account.account_id,
        code: loginVerificationCode,
        expires_at: expiresAt.toISOString()
      });

    if (loginCodeError) {
      console.error('Error storing login verification code:', loginCodeError);
      return NextResponse.json(
        { message: 'Error generating login verification code. Please try again.' },
        { status: 500 }
      );
    }

    // Send login verification email using direct service
    try {
      await sendVerificationEmail({
        email: account.account_email,
        code: loginVerificationCode,
        type: 'login'
      });
    } catch (emailError) {
      console.error('Error sending login verification email:', emailError);
    }

    return NextResponse.json({
      message: 'Login verification code sent to your email',
      requiresVerification: true,
      verificationType: 'Login',
      accountId: account.account_id
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
