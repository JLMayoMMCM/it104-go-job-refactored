import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { sendVerificationEmail } from '../../../../lib/emailService';
import bcrypt from 'bcryptjs';

export async function POST(request) {
  try {
    const formData = await request.json();
    
    // NOTE TO FRONTEND: The following fields must be collected in the company registration form
    // for the initial employee (company administrator).
    const {
      // Company Details
      companyName, companyEmail, companyPhone, companyWebsite, companyDescription, companyNationalityId,
      // Address Details
      premiseName, streetName, barangayName, cityName,
      // Person/Employee Details
      firstName, lastName, middleName, dateOfBirth, gender,
      // Account Details
      username, password
    } = formData;

    // --- Validation ---
    if (!companyName || !companyEmail || !password || !firstName || !lastName || !username || !dateOfBirth || !gender) {
      return NextResponse.json(
        { message: 'All required fields for company and initial employee must be provided.' },
        { status: 400 }
      );
    }

    // --- Check for Existing Account ---
    const { data: existing, error: checkError } = await supabase
      .from('account')
      .select('account_email, account_username')
      .or(`account_email.eq.${companyEmail},account_username.eq.${username}`);

    if (checkError) {
      console.error('Database check error:', checkError);
      return NextResponse.json({ message: 'Database error occurred' }, { status: 500 });
    }
    if (existing && existing.length > 0) {
      const emailExists = existing.some(acc => acc.account_email === companyEmail);
      const usernameExists = existing.some(acc => acc.account_username === username);
      if (emailExists) return NextResponse.json({ message: 'This email is already registered.' }, { status: 400 });
      if (usernameExists) return NextResponse.json({ message: 'This username is already taken.' }, { status: 400 });
    }
    
    // --- Start Transaction ---
    // 1. Create Address
    const { data: addressData, error: addressError } = await supabase
      .from('address')
      .insert({ premise_name: premiseName, street_name: streetName, barangay_name: barangayName, city_name: cityName })
      .select().single();

    if (addressError) {
      console.error('Address creation error:', addressError);
      return NextResponse.json({ message: 'Failed to create address record.' }, { status: 500 });
    }

    // 2. Create Company
    const { data: companyData, error: companyError } = await supabase
      .from('company')
      .insert({
        company_name: companyName,
        company_email: companyEmail,
        company_phone: companyPhone,
        company_website: companyWebsite,
        company_description: companyDescription,
        company_nationality_id: parseInt(companyNationalityId),
        address_id: addressData.address_id
      })
      .select().single();

    if (companyError) {
      console.error('Company creation error:', companyError);
      await supabase.from('address').delete().eq('address_id', addressData.address_id); // Rollback
      return NextResponse.json({ message: 'Failed to create company record.' }, { status: 500 });
    }

    // 3. Create Person for the initial employee
    const { data: personData, error: personError } = await supabase
        .from('person')
        .insert({
            first_name: firstName,
            last_name: lastName,
            middle_name: middleName || null,
            date_of_birth: dateOfBirth,
            gender: parseInt(gender),
            address_id: addressData.address_id, // Use same address as company
            nationality_id: parseInt(companyNationalityId) // Assume same nationality
        })
        .select().single();

    if (personError) {
        console.error('Person creation error:', personError);
        await supabase.from('company').delete().eq('company_id', companyData.company_id); // Rollback
        await supabase.from('address').delete().eq('address_id', addressData.address_id); // Rollback
        return NextResponse.json({ message: 'Failed to create person record for employee.' }, { status: 500 });
    }

    // 4. Create Account for the employee
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    const accountNumber = `EMP${Date.now()}`;
    const { data: accountData, error: accountError } = await supabase
      .from('account')
      .insert({
        account_email: companyEmail, // Use company email for the main contact
        account_username: username,
        account_phone: companyPhone,
        account_number: accountNumber,
        account_password: hashedPassword,
        account_type_id: 1, // Employee/Company type
        account_is_verified: false,
      })
      .select().single();

    if (accountError) {
      console.error('Account creation error:', accountError);
      await supabase.from('person').delete().eq('person_id', personData.person_id); // Rollback
      await supabase.from('company').delete().eq('company_id', companyData.company_id); // Rollback
      await supabase.from('address').delete().eq('address_id', addressData.address_id); // Rollback
      return NextResponse.json({ message: 'Failed to create account record.' }, { status: 500 });
    }
    
    // 5. Create Employee record to link everything
    const { error: employeeError } = await supabase
      .from('employee')
      .insert({
        person_id: personData.person_id,
        account_id: accountData.account_id,
        company_id: companyData.company_id,
        position_name: 'Administrator' // Default position for initial employee
      });

    if (employeeError) {
        console.error('Employee creation error:', employeeError);
        await supabase.from('account').delete().eq('account_id', accountData.account_id); // Rollback
        await supabase.from('person').delete().eq('person_id', personData.person_id); // Rollback
        await supabase.from('company').delete().eq('company_id', companyData.company_id); // Rollback
        await supabase.from('address').delete().eq('address_id', addressData.address_id); // Rollback
        return NextResponse.json({ message: 'Failed to create employee record.' }, { status: 500 });
    }

    // --- Generate and Store Verification Code ---
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes

    const { error: codeError } = await supabase.from('verification_codes').insert({
      account_id: accountData.account_id,
      code: verificationCode,
      expires_at: expiresAt.toISOString(),
    });

    if (codeError) {
      console.error('Error storing verification code:', codeError);
    }

    // --- Send Verification Email ---
    try {
      await sendVerificationEmail({
        email: companyEmail,
        code: verificationCode,
        type: 'registration',
        name: firstName,
      });
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
    }

    return NextResponse.json({
      message: 'Company registration successful. Please check your email for a verification code.',
      companyId: companyData.company_id,
      accountId: accountData.account_id,
      success: true,
    });
  } catch (error) {
    console.error('Company Registration Error:', error);
    return NextResponse.json({ message: 'Internal server error' }, { status: 500 });
  }
}
