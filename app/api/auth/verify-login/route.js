import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(request) {
  try {
    const { code, accountId } = await request.json();

    if (!code || !accountId) {
      return NextResponse.json(
        { message: 'Verification code and account ID are required' },
        { status: 400 }
      );
    }

    // Find and verify the login verification code
    const { data: verificationCode, error: verificationError } = await supabase
      .from('verification_codes')
      .select('*')
      .eq('account_id', accountId)
      .eq('code', code)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (verificationError || !verificationCode) {
      return NextResponse.json(
        { message: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    // Get account details
    const { data: account, error: accountError } = await supabase
      .from('account')
      .select('account_id, account_username, account_email, account_type_id')
      .eq('account_id', accountId)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { message: 'Account not found' },
        { status: 404 }
      );
    }

    // Delete the verification code (single use)
    await supabase.from('verification_codes').delete().eq('id', verificationCode.id);

    // Here you could generate a JWT token or session token
    // For now, we'll just return success
    return NextResponse.json({
      message: 'Login verification successful',
      success: true,
      user: {
        id: account.account_id,
        username: account.account_username,
        email: account.account_email,
        accountType: account.account_type_id
      }
      // token: generatedJWTToken // Add JWT token here if implementing
    });

  } catch (error) {
    console.error('Login verification error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
