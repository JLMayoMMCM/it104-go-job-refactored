import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { sendVerificationEmail } from '../../../../lib/emailService';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const formData = await request.json();
    
    const {
      firstName, lastName, middleName, dateOfBirth, gender, nationalityId,
      email, username, phone, password, educationLevelId, experienceLevelId, description
    } = formData;

    // Validate required fields
    if (!firstName || !lastName || !dateOfBirth || !gender || !nationalityId ||
        !email || !username || !phone || !password || !educationLevelId || !experienceLevelId) {
      return NextResponse.json(
        { message: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    // Check if email or username already exists
    const { data: existingAccounts, error: checkError } = await supabase
      .from('account')
      .select('account_email, account_username')
      .or(`account_email.eq.${email},account_username.eq.${username}`);

    if (checkError) {
      console.error('Database check error:', checkError);
      return NextResponse.json(
        { message: 'Database error occurred' },
        { status: 500 }
      );
    }

    if (existingAccounts && existingAccounts.length > 0) {
      const emailExists = existingAccounts.some(acc => acc.account_email === email);
      const usernameExists = existingAccounts.some(acc => acc.account_username === username);
      
      if (emailExists && usernameExists) {
        return NextResponse.json(
          { message: 'Email and username are already registered' },
          { status: 400 }
        );
      } else if (emailExists) {
        return NextResponse.json(
          { message: 'Email is already registered' },
          { status: 400 }
        );
      } else {
        return NextResponse.json(
          { message: 'Username is already taken' },
          { status: 400 }
        );
      }
    }

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Generate account number
    const accountNumber = `JS${Date.now()}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;

    // Start transaction by creating address entry (null values)
    const { data: addressData, error: addressError } = await supabase
      .from('address')
      .insert({
        premise_name: null,
        street_name: null,
        barangay_name: null,
        city_name: null
      })
      .select()
      .single();

    if (addressError) {
      console.error('Address creation error:', addressError);
      return NextResponse.json(
        { message: 'Failed to create address record' },
        { status: 500 }
      );
    }

    // Create person record
    const { data: personData, error: personError } = await supabase
      .from('person')
      .insert({
        first_name: firstName,
        last_name: lastName,
        middle_name: middleName || null,
        date_of_birth: dateOfBirth,
        gender: parseInt(gender),
        address_id: addressData.address_id,
        nationality_id: parseInt(nationalityId)
      })
      .select()
      .single();

    if (personError) {
      console.error('Person creation error:', personError);
      // Cleanup address
      await supabase.from('address').delete().eq('address_id', addressData.address_id);
      return NextResponse.json(
        { message: 'Failed to create person record' },
        { status: 500 }
      );
    }

    // Create account record
    const { data: accountData, error: accountError } = await supabase
      .from('account')
      .insert({
        account_email: email,
        account_username: username,
        account_phone: phone,
        account_number: accountNumber,
        account_password: hashedPassword,
        account_type_id: 2, // Jobseeker type
        account_is_verified: false
      })
      .select()
      .single();

    if (accountError) {
      console.error('Account creation error:', accountError);
      // Cleanup person and address
      await supabase.from('person').delete().eq('person_id', personData.person_id);
      await supabase.from('address').delete().eq('address_id', addressData.address_id);
      return NextResponse.json(
        { message: 'Failed to create account record' },
        { status: 500 }
      );
    }

    // Create jobseeker record
    const { data: jobseekerData, error: jobseekerError } = await supabase
      .from('job_seeker')
      .insert({
        person_id: personData.person_id,
        account_id: accountData.account_id,
        job_seeker_description: description || null,
        job_seeker_experience_level_id: experienceLevelId,
        job_seeker_education_level_id: educationLevelId
      })
      .select()
      .single();

    if (jobseekerError) {
      console.error('Jobseeker creation error:', jobseekerError);
      // Cleanup account, person, and address
      await supabase.from('account').delete().eq('account_id', accountData.account_id);
      await supabase.from('person').delete().eq('person_id', personData.person_id);
      await supabase.from('address').delete().eq('address_id', addressData.address_id);
      return NextResponse.json(
        { message: 'Failed to create jobseeker record' },
        { status: 500 }
      );
    }


    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    // Store verification code
    const { error: codeError } = await supabase
      .from('verification_codes')
      .insert({
        account_id: accountData.account_id,
        code: verificationCode,
        expires_at: expiresAt.toISOString()
      });

    if (codeError) {
      console.error('Error storing verification code:', codeError);
    }

    // Send verification email using direct service
    try {
      await sendVerificationEmail({
        email: email,
        code: verificationCode,
        type: 'registration',
        name: firstName
      });
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
    }

    return NextResponse.json({
      message: 'Jobseeker registration successful. Please check your email for verification code.',
      accountId: accountData.account_id,
      success: true
    });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
