import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import { sendVerificationEmail } from '../../../../lib/emailService';

export async function POST(request) {
  try {
    const formData = await request.json();
    
    const {
      companyName, companyEmail, companyPhone, companyWebsite, companyDescription,
      premiseName, streetName, barangayName, cityName
    } = formData;

    // Validate required fields
    if (!companyName || !companyEmail || !companyPhone || !streetName || !barangayName || !cityName) {
      return NextResponse.json(
        { message: 'All required fields must be provided' },
        { status: 400 }
      );
    }

    // Check if company email already exists
    const { data: existingCompany, error: checkError } = await supabase
      .from('company')
      .select('company_email')
      .eq('company_email', companyEmail);

    if (checkError) {
      console.error('Database check error:', checkError);
      return NextResponse.json(
        { message: 'Database error occurred' },
        { status: 500 }
      );
    }

    if (existingCompany && existingCompany.length > 0) {
      return NextResponse.json(
        { message: 'Company email is already registered' },
        { status: 400 }
      );
    }

    // Create address record
    const { data: addressData, error: addressError } = await supabase
      .from('address')
      .insert({
        premise_name: premiseName || null,
        street_name: streetName,
        barangay_name: barangayName,
        city_name: cityName
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

    // Create company record (temporarily without verification)
    const { data: companyData, error: companyError } = await supabase
      .from('company')      .insert({
        company_name: companyName,
        company_email: companyEmail,
        company_phone: companyPhone,
        company_website: companyWebsite || null,
        company_description: companyDescription || null,
        address_id: addressData.address_id
      })
      .select()
      .single();

    if (companyError) {
      console.error('Company creation error:', companyError);
      // Cleanup address
      await supabase.from('address').delete().eq('address_id', addressData.address_id);
      return NextResponse.json(
        { message: 'Failed to create company record' },
        { status: 500 }
      );
    }

    // Generate verification code
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 30 * 60 * 1000); // 30 minutes for company verification

    // Store verification code (we'll use a temporary table or modify the verification_codes table)
    // For now, let's create a temporary account entry for the company verification
    const tempAccountNumber = `TEMP_COMP_${Date.now()}`;
    
    const { data: tempAccountData, error: tempAccountError } = await supabase
      .from('account')
      .insert({
        account_email: companyEmail,
        account_username: `temp_${companyData.company_id}`,
        account_number: tempAccountNumber,
        account_password: 'temp_password', // This will be replaced
        account_type_id: 1, // Company type
        account_is_verified: false
      })
      .select()
      .single();

    if (tempAccountError) {
      console.error('Temp account creation error:', tempAccountError);
      // Cleanup company and address
      await supabase.from('company').delete().eq('company_id', companyData.company_id);
      await supabase.from('address').delete().eq('address_id', addressData.address_id);
      return NextResponse.json(
        { message: 'Failed to create verification record' },
        { status: 500 }
      );
    }

    // Store verification code
    const { error: codeError } = await supabase
      .from('verification_codes')
      .insert({
        account_id: tempAccountData.account_id,
        code: verificationCode,
        expires_at: expiresAt.toISOString()
      });

    if (codeError) {
      console.error('Error storing verification code:', codeError);
    }

    // Send verification email using direct service
    try {
      await sendVerificationEmail({
        email: companyEmail,
        code: verificationCode,
        type: 'company_registration',
        companyName: companyName
      });
    } catch (emailError) {
      console.error('Error sending verification email:', emailError);
    }

    return NextResponse.json({
      message: 'Company registration initiated. Please check your email for verification code to complete registration.',
      companyId: companyData.company_id,
      tempAccountId: tempAccountData.account_id,
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
