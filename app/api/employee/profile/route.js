import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';
import { createNotification, NotificationTypes } from '../../../lib/notificationService';
import bcrypt from 'bcryptjs';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Get employee data with related person and company information
    const { data: employeeData, error: empError } = await supabase
      .from('employee')
      .select(`
        employee_id,
        position_name,
        person:person_id (
          person_id,
          first_name,
          last_name,
          middle_name,
          date_of_birth,
          gender:gender (
            gender_id,
            gender_name
          ),
        nationality:nationality_id (
          nationality_id,
          nationality_name
        ),
          address:address_id (
            address_id,
            premise_name,
            street_name,
            barangay_name,
            city_name
          )
        ),
        account:account_id (
          account_id,
          account_email,
          account_username,
          account_profile_photo,
          account_phone,
          account_number,
          account_is_verified
        ),        company:company_id (
          company_id,
          company_name,
          company_email,
          company_phone,
          company_website,
          company_description,
          company_logo,
          address:address_id (
            address_id,
            premise_name,
            street_name,
            barangay_name,
            city_name
          )
        )
      `)
      .eq('account_id', accountId)
      .single();

    if (empError || !employeeData) {
      console.error('Employee fetch error:', empError);
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Add account_is_verified to top-level for easier frontend access (optional)
    if (employeeData.account && typeof employeeData.account.account_is_verified !== 'undefined') {
      employeeData.account_is_verified = employeeData.account.account_is_verified;
    }

    return NextResponse.json({
      success: true,
      data: employeeData
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      accountId,
      password,
      // Person fields
      first_name,
      last_name,
      middle_name,
      date_of_birth,
      gender_id,
      nationality_id,
      // Account fields
      account_phone,
      // Address fields
      premise_name,
      street_name,
      barangay_name,
      city_name,
      // Employee fields
      position_name,
      // Profile photo (optional)
      profile_photo
    } = body;

    if (!accountId || !password) {
      return NextResponse.json({ error: 'Account ID and password are required' }, { status: 400 });
    }

    // Verify password
    const { data: account, error: authError } = await supabase
      .from('account')
      .select('account_password')
      .eq('account_id', accountId)
      .single();

    if (authError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    // Compare provided password with stored hash
    const passwordMatch = await bcrypt.compare(password, account.account_password);
    if (!passwordMatch) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Get employee data to find related IDs
    const { data: employee, error: empError } = await supabase
      .from('employee')
      .select('person_id, account_id')
      .eq('account_id', accountId)
      .single();

    if (empError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Get person data to find address_id
    const { data: person, error: personError } = await supabase
      .from('person')
      .select('address_id')
      .eq('person_id', employee.person_id)
      .single();

    if (personError || !person) {
      return NextResponse.json({ error: 'Person data not found' }, { status: 404 });
    }

    // Update address
    const { error: addressError } = await supabase
      .from('address')
      .update({
        premise_name,
        street_name,
        barangay_name,
        city_name
      })
      .eq('address_id', person.address_id);

    if (addressError) {
      console.error('Address update error:', addressError);
      return NextResponse.json({ error: 'Failed to update address' }, { status: 500 });
    }

    // Update person
    const { error: personUpdateError } = await supabase
      .from('person')
      .update({
        first_name,
        last_name,
        middle_name,
        date_of_birth,
        gender: gender_id,
        nationality_id
      })
      .eq('person_id', employee.person_id);

    if (personUpdateError) {
      console.error('Person update error:', personUpdateError);
      return NextResponse.json({ error: 'Failed to update personal information' }, { status: 500 });
    }

    // Update account
    const accountUpdateData = {
      account_phone
    };
    
    // Only update profile photo if provided
    if (profile_photo) {
      accountUpdateData.account_profile_photo = profile_photo;
    }
    
    const { error: accountUpdateError } = await supabase
      .from('account')
      .update(accountUpdateData)
      .eq('account_id', accountId);

    if (accountUpdateError) {
      console.error('Account update error:', accountUpdateError);
      return NextResponse.json({ error: 'Failed to update account information' }, { status: 500 });
    }

    // Update employee
    const { error: employeeUpdateError } = await supabase
      .from('employee')
      .update({
        position_name
      })
      .eq('account_id', accountId);

    if (employeeUpdateError) {
      console.error('Employee update error:', employeeUpdateError);
      return NextResponse.json({ error: 'Failed to update employee information' }, { status: 500 });
    }

    // Create notification for successful profile update
    try {
      await createNotification(
        accountId,
        NotificationTypes.PROFILE_UPDATE,
        'Your profile has been successfully updated'
      );
    } catch (notifError) {
      console.error('Error creating profile update notification:', notifError);
      // Don't fail the profile update if notification fails
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
