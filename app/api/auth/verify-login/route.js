import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { generateToken } from '../../../lib/auth';

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
      .select('account_id, account_username, account_email, account_type_id, account_profile_photo')
      .eq('account_id', accountId)
      .single();

    if (accountError || !account) {
      return NextResponse.json(
        { message: 'Account not found' },
        { status: 404 }
      );
    }

    // Determine user role by checking for a profile in job_seeker or employee table
    let userRole;
    let redirectPath;
    let tokenPayload;
    let userResponse;

    // 1. Check if the user is a job seeker
    const { data: jobSeekerData, error: jobSeekerError } = await supabase
      .from('job_seeker')
      .select('*, person:person_id(*)')
      .eq('account_id', accountId)
      .maybeSingle(); // Use maybeSingle() to prevent errors if no row is found

    if (jobSeekerError) {
      console.error('Database error while checking for job seeker profile:', jobSeekerError);
      return NextResponse.json({ message: 'An error occurred while verifying your profile.' }, { status: 500 });
    }
    
    if (jobSeekerData) {
      // Found a job seeker profile
      userRole = 'jobseeker';
      redirectPath = '/Dashboard/jobseeker';
      tokenPayload = {
        account_id: account.account_id,
        username: account.account_username,
        email: account.account_email,
        accountType: 1, // Job Seeker
        role: userRole,
        person_id: jobSeekerData.person.person_id,
        job_seeker_id: jobSeekerData.job_seeker_id
      };
      userResponse = { ...account, role: userRole, ...jobSeekerData.person };

    } else {
      // 2. If not a job seeker, check if they are an employee
      const { data: employeeData, error: employeeError } = await supabase
        .from('employee')
        .select('*, person:person_id(*), company:company_id(*)')
        .eq('account_id', accountId)
        .maybeSingle();

      if (employeeError) {
        console.error('Database error while checking for employee profile:', employeeError);
        return NextResponse.json({ message: 'An error occurred while verifying your profile.' }, { status: 500 });
      }
      
      if (employeeData) {
        // Found an employee profile
        userRole = 'employee';
        redirectPath = '/Dashboard/employee';
        tokenPayload = {
          account_id: account.account_id,
          username: account.account_username,
          email: account.account_email,
          accountType: 2, // Employee
          role: userRole,
          person_id: employeeData.person.person_id,
          employee_id: employeeData.employee_id,
          company_id: employeeData.company.company_id
        };
        userResponse = { ...account, role: userRole, ...employeeData.person, company: employeeData.company };

      } else {
        // 3. If no profile is found, return an error
        console.error('No profile (job seeker or employee) found for account ID:', accountId);
        return NextResponse.json({ message: 'Could not find a user profile associated with this account.' }, { status: 404 });
      }
    }

    await supabase.from('verification_codes').delete().eq('id', verificationCode.id);

    const token = generateToken(tokenPayload);

    // Create secure HTTP-only cookie
    const response = NextResponse.json({
      message: 'Login verification successful',
      success: true,
      user: userResponse,
      redirectPath: redirectPath
    });

    response.cookies.set('session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      path: '/',
      maxAge: 60 * 60 // 1 hour
    });

    return response;

  } catch (error) {
    console.error('Login verification error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
