import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { sendVerificationEmail } from '../../../lib/emailService';

export async function POST(request) {
  try {
    const { accountId } = await request.json();

    if (!accountId) {
      return NextResponse.json(
        { message: 'Account ID is required' },
        { status: 400 }
      );
    }

    // Get account details
    const { data: account, error: accountError } = await supabase
      .from('account')
      .select('account_email, account_is_verified')
      .eq('account_id', accountId)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { message: 'Account not found' },
        { status: 404 }
      );
    }

    if (!account.account_is_verified) {
      return NextResponse.json(
        { message: 'Account must be verified first' },
        { status: 400 }
      );
    }

    // Delete existing verification codes for this account
    await supabase
      .from('verification_codes')
      .delete()
      .eq('account_id', accountId);

    // Generate new login verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Store new verification code
    const { error: codeError } = await supabase
      .from('verification_codes')
      .insert({
        account_id: accountId,
        code: verificationCode,
        expires_at: expiresAt.toISOString()
      });

    if (codeError) {
      console.error('Error storing verification code:', codeError);
      return NextResponse.json(
        { message: 'Failed to generate verification code' },
        { status: 500 }
      );
    }

    // Send login verification email using direct service
    try {
      await sendVerificationEmail({
        email: account.account_email,
        code: verificationCode,
        type: 'login'
      });
    } catch (emailError) {
      console.error('Error sending login verification email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      message: 'Login verification code sent successfully',
      success: true
    });

  } catch (error) {
    console.error('Resend login verification error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
