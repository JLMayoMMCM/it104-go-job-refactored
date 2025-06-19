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

    // Fetch job_seeker data if account type is Job Seeker (type 2)
    let jobSeeker = null;
    let person = null;
    if (account.account_type_id === 2) {
      const { data: jobSeekerData, error: jobSeekerError } = await supabase
        .from('job_seeker')
        .select('job_seeker_id, person_id')
        .eq('account_id', accountId)
        .single();

      if (jobSeekerError) {
        console.error('Error fetching job seeker data:', jobSeekerError);
      } else {
        jobSeeker = jobSeekerData;
        if (jobSeekerData.person_id) {
          const { data: personData, error: personError } = await supabase
            .from('person')
            .select('person_id, first_name, last_name')
            .eq('person_id', jobSeekerData.person_id)
            .single();

          if (personError) {
            console.error('Error fetching person data:', personError);
          } else {
            person = personData;
          }
        }
      }
    }

    await supabase.from('verification_codes').delete().eq('id', verificationCode.id);

    const tokenPayload = {
      account_id: account.account_id,
      username: account.account_username,
      email: account.account_email,
      accountType: account.account_type_id,
      person_id: person ? person.person_id : null,
      job_seeker_id: jobSeeker ? jobSeeker.job_seeker_id : null
    };

    const token = generateToken(tokenPayload);

    // Create secure HTTP-only cookie
    const response = NextResponse.json({
      message: 'Login verification successful',
      success: true,
      user: {
        account_id: account.account_id,
        username: account.account_username,
        email: account.account_email,
        accountType: account.account_type_id,
        profilePhoto: account.account_profile_photo || null,
        person_id: person ? person.person_id : null,
        firstName: person ? person.first_name : '',
        lastName: person ? person.last_name : '',
        job_seeker_id: jobSeeker ? jobSeeker.job_seeker_id : null
      }
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
