import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { sendVerificationEmail } from '../../../lib/emailService';

export async function POST(request) {
  try {
    const { accountId, code } = await request.json();

    console.log('Verification attempt:', { 
      accountId, 
      code,
      codeType: typeof code,
      timestamp: new Date().toISOString()
    });

    if (!accountId || !code) {
      console.log('Missing required fields:', { accountId: !!accountId, code: !!code });
      return NextResponse.json({ message: 'Account ID and code are required' }, { status: 400 });
    }

    // First, get all verification codes for this account to help diagnose issues
    const { data: allCodes, error: allCodesError } = await supabase
      .from('verification_codes')
      .select('code, expires_at, created_at')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false });

    if (allCodes && allCodes.length > 0) {
      console.log('All verification codes for account:', allCodes.map(c => ({
        code: c.code,
        expires_at: c.expires_at,
        created_at: c.created_at,
        is_expired: new Date(c.expires_at) < new Date(),
        matches_input: c.code === code
      })));
    } else {
      console.log('No verification codes found for account:', accountId);
    }

    // Get the most recent verification code
    const { data: vCode, error: vCodeError } = await supabase
      .from('verification_codes')
      .select('code, expires_at, created_at')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (vCodeError || !vCode) {
      console.log('Verification code lookup error:', { 
        error: vCodeError, 
        codeFound: !!vCode,
        accountId 
      });
      return NextResponse.json({ 
        message: 'No valid verification code found. Please request a new code.',
        debug: { error: 'no_code_found' }
      }, { status: 400 });
    }

    // Check if verification code exists and hasn't expired
    const now = new Date();
    // Create a new Date object representing the current time in PHT (UTC+8), stored as a UTC value
    const nowPHTinUTC = new Date(now.getTime() + (8 * 60 * 60 * 1000));
    
    // The stored expiration time is a string from the DB.
    // It represents a PHT time stored in UTC format.
    // Appending 'Z' ensures it is parsed as UTC, preventing timezone misinterpretation.
    const expirationTimeStr = vCode.expires_at;
    const expirationPHT = new Date(expirationTimeStr.endsWith('Z') ? expirationTimeStr : expirationTimeStr + 'Z');

    console.log('Time debug:', {
      rawExpirationTime: vCode.expires_at,
      currentTimeForCompare: nowPHTinUTC.toISOString(),
      expirationTimeForCompare: expirationPHT.toISOString(),
      isExpired: nowPHTinUTC > expirationPHT
    });

    if (nowPHTinUTC > expirationPHT) {
      console.log('Verification code has expired');
      return NextResponse.json({ 
        message: 'Verification code has expired. Please request a new one.',
        debug: {
          currentTime: nowPHTinUTC.toISOString(),
          expirationTime: expirationPHT.toISOString()
        }
      }, { status: 400 });
    }

    if (vCode.code !== code) {
      return NextResponse.json({ 
        message: 'Invalid verification code. Please check and try again.',
        debug: { 
          error: 'code_mismatch',
          expected: vCode.code,
          received: code
        }
      }, { status: 400 });
    }

    // --- Verification successful, update account ---
    const { data: updatedAccount, error: updateError } = await supabase
      .from('account')
      .update({ account_is_verified: true })
      .eq('account_id', accountId)
      .select()
      .single();

    if (updateError || !updatedAccount) {
      console.error('Error updating account verification:', updateError);
      return NextResponse.json({ message: 'Failed to verify account' }, { status: 500 });
    }

    // --- Clean up verification code ---
    await supabase.from('verification_codes').delete().eq('account_id', accountId);

    // --- Post-verification actions (e.g., send confirmation emails) ---
    if (updatedAccount.account_type_id === 1) { // Employee or Jobseeker
      const { data: employeeData, error: employeeError } = await supabase
        .from('employee')
        .select('*, company:company_id(*), person:person_id(*)')
        .eq('account_id', accountId)
        .single();
      
      if (employeeData && !employeeError) {
        // This is an employee
        // Send confirmation to company
        await sendVerificationEmail({
          email: employeeData.company.company_email,
          type: 'employee_verification_confirmed',
          name: employeeData.person.first_name,
          lastName: employeeData.person.last_name,
          position: employeeData.position_name,
          companyName: employeeData.company.company_name,
        }).catch(e => console.error("Failed to send company confirmation email:", e));

        // Send confirmation to employee
        await sendVerificationEmail({
          email: updatedAccount.account_email,
          type: 'employee_verification_complete',
          name: employeeData.person.first_name,
          companyName: employeeData.company.company_name,
        }).catch(e => console.error("Failed to send employee confirmation email:", e));
      } else {
        // This is a jobseeker
        const { data: jobseekerData, error: jobseekerError } = await supabase
          .from('job_seeker')
          .select('*, person:person_id(*)')
          .eq('account_id', accountId)
          .single();
      
        if (jobseekerError) {
          console.error('Error fetching jobseeker data:', jobseekerError);
          // Continue with verification even if email sending fails
        } else if (jobseekerData) {
          await sendVerificationEmail({
            email: updatedAccount.account_email,
            type: 'jobseeker_verification_complete',
            name: jobseekerData.person ? jobseekerData.person.first_name : updatedAccount.account_username,
          }).catch(e => console.error("Failed to send jobseeker confirmation email:", e));
        }
      }
    }

    return NextResponse.json({
      message: 'Account verified successfully',
      success: true,
    });

  } catch (error) {
    console.error('Verification error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
