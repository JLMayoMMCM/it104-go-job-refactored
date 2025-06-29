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

    const { data: accounts, error: accountError } = await supabase
      .from('account')
      .select('*')
      .eq('account_type_id', accountType)
      .or(`account_username.eq.${usernameOrEmail},account_email.eq.${usernameOrEmail}`);

    if (accountError) {
      console.error('Database error:', accountError);
      return NextResponse.json({ message: 'Database error occurred' }, { status: 500 });
    }

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    const account = accounts[0];

    const isPasswordValid = await bcrypt.compare(password, account.account_password);
    if (!isPasswordValid) {
      return NextResponse.json({ message: 'Invalid credentials' }, { status: 401 });
    }

    // --- Handle Unverified Accounts ---
    if (!account.account_is_verified) {
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Use UTC+8 (Philippine Time) for dates
      const now = new Date();
      // Add 8 hours to get UTC+8
      const nowPHT = new Date(now.getTime() + (8 * 60 * 60 * 1000));
      const expiresAtPHT = new Date(nowPHT.getTime() + 2 * 60 * 1000); // 2 minutes

      console.log('Time debug for verification code:', {
        currentTime: now.toISOString(),
        currentTimePHT: nowPHT.toISOString(),
        expiresAtPHT: expiresAtPHT.toISOString(),
        accountId: account.account_id,
        code: verificationCode
      });

      // Delete existing codes and insert the new one
      await supabase.from('verification_codes').delete().eq('account_id', account.account_id);
      const { error: codeError } = await supabase.from('verification_codes').insert({
        account_id: account.account_id,
        code: verificationCode,
        expires_at: expiresAtPHT.toISOString(),
      });

      if (codeError) {
        console.error('Error storing verification code:', codeError);
        return NextResponse.json({ message: 'Error generating verification code' }, { status: 500 });
      }

      // Check if this is an employee by looking up employee data
      const { data: employeeData, error: employeeError } = await supabase
        .from('employee')
        .select('*, company:company_id(*), person:person_id(*)')
        .eq('account_id', account.account_id)
        .single();

      if (!employeeError && employeeData) {
        // This is an employee
        // Distinguish between main company contact and other employees
        if (employeeData.company.company_email === account.account_email) {
          // Main contact verifies via their own email
          await sendVerificationEmail({
            email: account.account_email,
            code: verificationCode,
            type: 'registration',
            name: employeeData.person.first_name,
          });

          return NextResponse.json({
            message: 'Account not verified. A new verification code has been sent to your email.',
            requiresVerification: true,
            verificationType: 'registration',
            accountId: account.account_id,
          });
        } else {
          // Other employees need verification from the company
          await sendVerificationEmail({
            email: employeeData.company.company_email,
            code: verificationCode,
            type: 'employee_registration',
            name: employeeData.person.first_name,
            lastName: employeeData.person.last_name,
            position: employeeData.position_name,
            companyName: employeeData.company.company_name,
            employeeEmail: account.account_email,
          });

          return NextResponse.json({
            message: 'Account not verified. Verification sent to your company email.',
            requiresVerification: true,
            verificationType: 'employee_registration',
            accountId: account.account_id,
          });
        }
      } else {
        // This is a jobseeker
        const { data: jobSeekerData, error: jobSeekerError } = await supabase
          .from('job_seeker')
          .select('*, person:person_id(*)')
          .eq('account_id', account.account_id)
          .single();

        if (jobSeekerError || !jobSeekerData) {
          console.error('Error fetching jobseeker data:', jobSeekerError);
          return NextResponse.json({ message: 'Could not find jobseeker details' }, { status: 500 });
        }

        await sendVerificationEmail({
          email: account.account_email,
          code: verificationCode,
          type: 'registration',
          name: jobSeekerData.person ? jobSeekerData.person.first_name : account.account_username,
        });

        return NextResponse.json({
          message: 'Account not verified. A new verification code has been sent to your email.',
          requiresVerification: true,
          verificationType: 'registration',
          accountId: account.account_id,
        });
      }
    }

    // --- Handle Verified Accounts (2FA Login) ---
    const loginVerificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    // Use UTC+8 (Philippine Time) for dates
    const now = new Date();
    // Add 8 hours to get UTC+8
    const nowPHT = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    const expiresAtPHT = new Date(nowPHT.getTime() + 2 * 60 * 1000); // 2 minutes

    console.log('Time debug for login verification:', {
      currentTime: now.toISOString(),
      currentTimePHT: nowPHT.toISOString(),
      expiresAtPHT: expiresAtPHT.toISOString(),
      accountId: account.account_id,
      code: loginVerificationCode
    });

    await supabase.from('verification_codes').delete().eq('account_id', account.account_id);
    const { error: loginCodeError } = await supabase.from('verification_codes').insert({
      account_id: account.account_id,
      code: loginVerificationCode,
      expires_at: expiresAtPHT.toISOString(),
    });

    if (loginCodeError) {
      console.error('Error storing login verification code:', loginCodeError);
      return NextResponse.json({ message: 'Error generating login code' }, { status: 500 });
    }

    let userName = account.account_username;

    if (account.account_type_id === 1) { // Jobseeker
      const { data: jobSeekerData } = await supabase
        .from('job_seeker')
        .select('person:person_id(first_name)')
        .eq('account_id', account.account_id)
        .single();
      if (jobSeekerData && jobSeekerData.person) {
        userName = jobSeekerData.person.first_name;
      }
    } else if (account.account_type_id === 2) { // Employee or Company
      const { data: employeeData } = await supabase
        .from('employee')
        .select('person:person_id(first_name)')
        .eq('account_id', account.account_id)
        .single();
      if (employeeData && employeeData.person) {
        userName = employeeData.person.first_name;
      }
    }

    await sendVerificationEmail({
      email: account.account_email,
      code: loginVerificationCode,
      type: 'login',
      name: userName,
    });

    return NextResponse.json({
      message: 'Login verification code sent to your email',
      requiresVerification: true,
      verificationType: 'Login', // Frontend hint
      accountId: account.account_id,
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
