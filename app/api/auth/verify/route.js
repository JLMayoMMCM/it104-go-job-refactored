import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(request) {
  try {
    const { code, accountId, companyId, type } = await request.json();

    if (!code || (!accountId && !companyId)) {
      return NextResponse.json(
        { message: 'Verification code and account/company ID are required' },
        { status: 400 }
      );
    }

    // Find verification code
    let verificationQuery;
    if (accountId) {
      verificationQuery = supabase
        .from('verification_codes')
        .select('*')
        .eq('account_id', accountId)
        .eq('code', code)
        .gt('expires_at', new Date().toISOString())
        .single();
    } else {
      // For company verification, we need to find the temp account
      const { data: tempAccount, error: tempError } = await supabase
        .from('account')
        .select('account_id')
        .like('account_username', `temp_${companyId}`)
        .single();

      if (tempError || !tempAccount) {
        return NextResponse.json(
          { message: 'Invalid verification request' },
          { status: 400 }
        );
      }

      verificationQuery = supabase
        .from('verification_codes')
        .select('*')
        .eq('account_id', tempAccount.account_id)
        .eq('code', code)
        .gt('expires_at', new Date().toISOString())
        .single();
    }

    const { data: verificationCode, error: verificationError } = await verificationQuery;

    if (verificationError || !verificationCode) {
      return NextResponse.json(
        { message: 'Invalid or expired verification code' },
        { status: 400 }
      );
    }

    // Handle different verification types
    if (type === 'company') {
      // For company verification, we need to clean up the temp account
      // and mark the company as verified (if we had such a field)
      
      // Delete the temp account and verification code
      await supabase.from('verification_codes').delete().eq('id', verificationCode.id);
      await supabase.from('account').delete().eq('account_id', verificationCode.account_id);

      return NextResponse.json({
        message: 'Company registration completed successfully',
        success: true
      });
    } else {
      // For jobseeker and employee verification
      const { error: updateError } = await supabase
        .from('account')
        .update({ account_is_verified: true })
        .eq('account_id', accountId);

      if (updateError) {
        console.error('Error updating account verification:', updateError);
        return NextResponse.json(
          { message: 'Failed to verify account' },
          { status: 500 }
        );
      }

      // Delete the verification code
      await supabase.from('verification_codes').delete().eq('id', verificationCode.id);

      return NextResponse.json({
        message: 'Account verified successfully',
        success: true
      });
    }

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
