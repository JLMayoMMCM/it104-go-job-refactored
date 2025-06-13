import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { sendVerificationEmail } from '../../../lib/emailService';

export async function POST(request) {
  try {
    const { accountId, companyId, type } = await request.json();

    if (!accountId && !companyId) {
      return NextResponse.json(
        { message: 'Account ID or Company ID is required' },
        { status: 400 }
      );
    }

    let email, name, targetAccountId;

    if (type === 'company') {
      // Get company details
      const { data: company, error: companyError } = await supabase
        .from('company')
        .select('company_name, company_email')
        .eq('company_id', companyId)
        .single();

      if (companyError || !company) {
        return NextResponse.json(
          { message: 'Company not found' },
          { status: 404 }
        );
      }

      // Find temp account for company
      const { data: tempAccount, error: tempError } = await supabase
        .from('account')
        .select('account_id')
        .like('account_username', `temp_${companyId}`)
        .single();

      if (tempError || !tempAccount) {
        return NextResponse.json(
          { message: 'Verification session not found' },
          { status: 404 }
        );
      }

      email = company.company_email;
      name = company.company_name;
      targetAccountId = tempAccount.account_id;
    } else {
      // Get account details
      const { data: account, error: accountError } = await supabase
        .from('account')
        .select('account_email')
        .eq('account_id', accountId)
        .single();

      if (accountError || !account) {
        return NextResponse.json(
          { message: 'Account not found' },
          { status: 404 }
        );
      }

      // Get person details for name
      const { data: person, error: personError } = await supabase
        .from('person')
        .select('first_name')
        .eq('person_id', (await supabase
          .from(type === 'employee' ? 'employee' : 'job_seeker')
          .select('person_id')
          .eq('account_id', accountId)
          .single()).data?.person_id)
        .single();

      email = account.account_email;
      name = person?.first_name || 'User';
      targetAccountId = accountId;
    }

    // Delete existing verification codes for this account
    await supabase
      .from('verification_codes')
      .delete()
      .eq('account_id', targetAccountId);

    // Generate new verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + (type === 'company' ? 30 : 10) * 60 * 1000); // 30 min for company, 10 min for others

    // Store new verification code
    const { error: codeError } = await supabase
      .from('verification_codes')
      .insert({
        account_id: targetAccountId,
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

    // Send verification email using direct service
    try {
      await sendVerificationEmail({
        email: email,
        code: verificationCode,
        type: type === 'company' ? 'company_registration' : 'registration',
        name: name,
        companyName: type === 'company' ? name : undefined
      });
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
      // Don't fail the request if email fails
    }

    return NextResponse.json({
      message: 'Verification code sent successfully',
      success: true
    });

  } catch (error) {
    console.error('Resend verification error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
