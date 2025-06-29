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
      .select('*')
      .eq('account_id', accountId)
      .single();

    if (accountError || !account) {
      console.error('Error fetching account:', accountError);
      return NextResponse.json(
        { message: 'Account not found' },
        { status: 404 }
      );
    }

    // Check if account is already verified
    if (account.account_is_verified) {
      return NextResponse.json(
        { message: 'Account is already verified' },
        { status: 400 }
      );
    }

    // For employee accounts, we need to send verification to company email
    if (account.account_type_id === 1) { // Employee type
      // Get employee and company details
      const { data: employeeData, error: employeeError } = await supabase
        .from('employee')
        .select(`
          employee_id,
          company:company_id (
            company_id,
            company_name,
            company_email
          ),
          person:person_id (
            first_name,
            last_name
          ),
          position_name
        `)
        .eq('account_id', accountId)
        .single();

      if (employeeError || !employeeData) {
        console.error('Error fetching employee data:', employeeError);
        return NextResponse.json(
          { message: 'Failed to fetch employee data' },
          { status: 500 }
        );
      }

      // Generate new verification code
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Use UTC+8 (Philippine Time) for dates
      const now = new Date();
      // Add 8 hours to get UTC+8
      const nowPHT = new Date(now.getTime() + (8 * 60 * 60 * 1000));
      const expiresAtPHT = new Date(nowPHT.getTime() + 2 * 60 * 1000); // 2 minutes

      console.log('Time debug for resend verification:', {
        currentTime: now.toISOString(),
        currentTimePHT: nowPHT.toISOString(),
        expiresAtPHT: expiresAtPHT.toISOString(),
        accountId: account.account_id,
        code: verificationCode
      });

      // Delete any existing verification codes
      await supabase.from('verification_codes').delete().eq('account_id', account.account_id);

      // Insert new verification code
      const { error: codeError } = await supabase.from('verification_codes').insert({
        account_id: account.account_id,
        code: verificationCode,
        expires_at: expiresAtPHT.toISOString(),
      });

      if (codeError) {
        console.error('Error storing verification code:', codeError);
        return NextResponse.json(
          { message: 'Error generating verification code. Please try again.' },
          { status: 500 }
        );
      }

      // Send verification email to company email
      try {
        await sendVerificationEmail({
          email: employeeData.company.company_email,
          code: verificationCode,
          type: 'employee_registration',
          name: employeeData.person.first_name,
          lastName: employeeData.person.last_name,
          position: employeeData.position_name,
          companyName: employeeData.company.company_name,
          employeeEmail: account.account_email
        });
      } catch (emailError) {
        console.error('Error sending verification email:', emailError);
      }

      // Send notification to employee email
      try {
        await sendVerificationEmail({
          email: account.account_email,
          type: 'employee_registration_notification',
          name: employeeData.person.first_name,
          companyName: employeeData.company.company_name
        });
      } catch (emailError) {
        console.error('Error sending employee notification email:', emailError);
      }

      return NextResponse.json({
        message: 'Verification code resent to company email',
        success: true
      });
    }

    // For non-employee accounts, proceed with normal verification
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Use UTC+8 (Philippine Time) for dates
    const now = new Date();
    // Add 8 hours to get UTC+8
    const nowPHT = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const expiresAtPHT = new Date(nowPHT.getTime() + 2 * 60 * 1000); // 2 minutes

    console.log('Time debug for resend verification:', {
      currentTime: now.toISOString(),
      currentTimePHT: nowPHT.toISOString(),
      expiresAtPHT: expiresAtPHT.toISOString(),
      accountId: account.account_id,
      code: verificationCode
    });

    // Delete any existing verification codes
    await supabase.from('verification_codes').delete().eq('account_id', account.account_id);

    // Insert new verification code
    const { error: codeError } = await supabase.from('verification_codes').insert({
      account_id: account.account_id,
      code: verificationCode,
      expires_at: expiresAtPHT.toISOString(),
    });

    if (codeError) {
      console.error('Error storing verification code:', codeError);
      return NextResponse.json(
        { message: 'Error generating verification code. Please try again.' },
        { status: 500 }
      );
    }

    // Send verification email
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
      message: 'Verification code resent successfully',
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
