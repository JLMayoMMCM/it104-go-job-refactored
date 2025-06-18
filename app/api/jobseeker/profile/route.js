import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase';
import bcrypt from 'bcryptjs';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      console.error('Missing accountId parameter');
      return NextResponse.json({ success: false, error: 'Account ID is required' }, { status: 400 });
    }

    console.log('Fetching profile for accountId:', accountId);
    const supabase = createClient();

    // Fetch account data with correct field names including resume
    const { data: accountData, error: accountError } = await supabase
      .from('account')
      .select('account_id, account_profile_photo, account_email, account_phone, account_resume')
      .eq('account_id', accountId)
      .single();

    if (accountError) {
      console.error('Account query error:', accountError);
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
    }

    if (!accountData) {
      console.error('No account data found for ID:', accountId);
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
    }

    console.log('Account data found:', accountData);

    // Fetch job_seeker data to get person_id and education/experience levels
    const { data: jobSeekerData, error: jobSeekerError } = await supabase
      .from('job_seeker')
      .select('job_seeker_id, person_id, job_seeker_experience_level_id, job_seeker_education_level_id')
      .eq('account_id', accountId)
      .single();

    if (jobSeekerError) {
      console.error('Job seeker query error:', jobSeekerError);
      return NextResponse.json({ success: false, error: 'Job seeker data not found' }, { status: 404 });
    }

    if (!jobSeekerData) {
      console.error('No job seeker data found for accountId:', accountId);
      return NextResponse.json({ success: false, error: 'Job seeker data not found' }, { status: 404 });
    }

    console.log('Job seeker data found:', jobSeekerData);

    // Fetch person data with JOINs to get human-readable values
    const { data: personData, error: personError } = await supabase
      .from('person')
      .select(`
        person_id, 
        first_name, 
        last_name, 
        date_of_birth,
        nationality:nationality_id(nationality_name),
        gender:gender(gender_name),
        address:address_id(premise_name, street_name, barangay_name, city_name)
      `)
      .eq('person_id', jobSeekerData.person_id)
      .single();

    if (personError) {
      console.error('Person query error:', personError);
      return NextResponse.json({ success: false, error: 'Person data not found' }, { status: 404 });
    }

    if (!personData) {
      console.error('No person data found for person_id:', jobSeekerData.person_id);
      return NextResponse.json({ success: false, error: 'Person data not found' }, { status: 404 });
    }

    console.log('Person data found:', personData);

    // Fetch job preferences
    const { data: jobPreferencesData, error: jobPreferencesError } = await supabase
      .from('job_seeker_job_category')
      .select('job_category_id, job_field_id')
      .eq('job_seeker_id', jobSeekerData.job_seeker_id);

    if (jobPreferencesError) {
      console.error('Job preferences query error:', jobPreferencesError);
      // Don't fail the whole request for this error, just return empty preferences
    }

    const jobPreferences = jobPreferencesData?.map(pref => ({
      category_id: pref.job_category_id,
      field_id: pref.job_field_id
    })) || [];

    console.log('Job preferences found:', jobPreferences);

    // Fetch education level name
    let educationLevel = '';
    if (jobSeekerData.job_seeker_education_level_id) {
      const { data: educationData, error: educationError } = await supabase
        .from('job_seeker_education_level')
        .select('education_level_name')
        .eq('job_seeker_education_level_id', jobSeekerData.job_seeker_education_level_id)
        .single();

      if (educationError) {
        console.error('Education level query error:', educationError);
      } else if (educationData) {
        educationLevel = educationData.education_level_name;
      }
    }

    // Fetch experience level name
    let experienceLevel = '';
    if (jobSeekerData.job_seeker_experience_level_id) {
      const { data: experienceData, error: experienceError } = await supabase
        .from('job_seeker_experience_level')
        .select('experience_level_name')
        .eq('job_seeker_experience_level_id', jobSeekerData.job_seeker_experience_level_id)
        .single();

      if (experienceError) {
        console.error('Experience level query error:', experienceError);
      } else if (experienceData) {
        experienceLevel = experienceData.experience_level_name;
      }
    }

    // Format address for frontend
    let fullAddress = '';
    if (personData.address && personData.address.city_name) {
      const addressParts = [];
      if (personData.address.premise_name) addressParts.push(personData.address.premise_name);
      if (personData.address.street_name) addressParts.push(personData.address.street_name);
      if (personData.address.barangay_name) addressParts.push(personData.address.barangay_name);
      addressParts.push(personData.address.city_name);
      fullAddress = addressParts.join(', ');
    }

    // Format resume data if it exists
    let resumeData = null;
    if (accountData.account_resume) {
      resumeData = {
        url: accountData.account_resume,
        name: 'Resume.pdf',
        size: 'Unknown size'
      };
    }

    console.log('Successfully formatted profile data');

    // Return formatted data matching what the frontend expects
    return NextResponse.json({
      success: true,
      data: {
        account: {
          account_id: accountData.account_id,
          profile_photo: accountData.account_profile_photo,
          resume: resumeData
        },
        person: {
          person_id: personData.person_id,
          first_name: personData.first_name,
          last_name: personData.last_name,
          email: accountData.account_email, // Get email from account table
          phone: accountData.account_phone, // Get phone from account table
          address: fullAddress,
          nationality: personData.nationality?.nationality_name || 'Not specified',
          gender: personData.gender?.gender_name || 'Not specified',
          education_level: educationLevel,
          experience_level: experienceLevel
        },
        job_preferences: jobPreferences
      }
    });
  } catch (error) {
    console.error('Unexpected error fetching jobseeker profile:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { accountId, password, firstName, lastName, email, phone, premise, street, barangay, city, nationality, gender, educationLevel, experienceLevel } = body;

    if (!accountId) {
      return NextResponse.json({ success: false, error: 'Account ID is required' }, { status: 400 });
    }

    if (!password) {
      return NextResponse.json({ success: false, error: 'Password is required to update profile' }, { status: 400 });
    }

    const supabase = createClient();

    // First, verify the password
    const { data: accountData, error: accountError } = await supabase
      .from('account')
      .select('account_id, account_password')
      .eq('account_id', accountId)
      .single();

    if (accountError || !accountData) {
      return NextResponse.json({ success: false, error: 'Account not found' }, { status: 404 });
    }

    // Compare provided password with stored hash
    const passwordValid = await bcrypt.compare(password, accountData.account_password);
    if (!passwordValid) {
      return NextResponse.json({ success: false, error: 'Invalid password. Please enter your correct password to update your profile.' }, { status: 401 });
    }

    // Get job seeker data
    const { data: jobSeekerData, error: jobSeekerError } = await supabase
      .from('job_seeker')
      .select('job_seeker_id, person_id')
      .eq('account_id', accountId)
      .single();

    if (jobSeekerError || !jobSeekerData) {
      return NextResponse.json({ success: false, error: 'Job seeker data not found' }, { status: 404 });
    }

    // Update person data
    const addressParts = [];
    if (premise) addressParts.push(premise);
    if (street) addressParts.push(street);
    if (barangay) addressParts.push(barangay);
    if (city) addressParts.push(city);
    const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : '';

    // First get the nationality ID from the name
    let nationalityId = null;
    if (nationality && nationality !== 'Not specified') {
      const { data: nationalityData, error: nationalityError } = await supabase
        .from('nationality')
        .select('nationality_id')
        .eq('nationality_name', nationality)
        .single();

      if (nationalityError) {
        console.error('Nationality query error:', nationalityError);
      } else if (nationalityData) {
        nationalityId = nationalityData.nationality_id;
      }
    }

    // Get gender ID from name
    let genderId = null;
    if (gender && gender !== 'Not specified') {
      const { data: genderData, error: genderError } = await supabase
        .from('gender')
        .select('gender_id')
        .eq('gender_name', gender)
        .single();

      if (genderError) {
        console.error('Gender query error:', genderError);
      } else if (genderData) {
        genderId = genderData.gender_id;
      }
    }

    // Get education level ID from name
    let educationLevelId = null;
    if (educationLevel) {
      const { data: educationData, error: educationError } = await supabase
        .from('job_seeker_education_level')
        .select('job_seeker_education_level_id')
        .eq('education_level_name', educationLevel)
        .single();

      if (educationError) {
        console.error('Education level query error:', educationError);
      } else if (educationData) {
        educationLevelId = educationData.job_seeker_education_level_id;
      }
    }

    // Get experience level ID from name
    let experienceLevelId = null;
    if (experienceLevel) {
      const { data: experienceData, error: experienceError } = await supabase
        .from('job_seeker_experience_level')
        .select('job_seeker_experience_level_id')
        .eq('experience_level_name', experienceLevel)
        .single();

      if (experienceError) {
        console.error('Experience level query error:', experienceError);
      } else if (experienceData) {
        experienceLevelId = experienceData.job_seeker_experience_level_id;
      }
    }

    // Update person data
    const { data: updatedPerson, error: personError } = await supabase
      .from('person')
      .update({
        first_name: firstName,
        last_name: lastName,
        nationality_id: nationalityId,
        gender_id: genderId,
        address_id: fullAddress ? await getOrCreateAddressId(supabase, premise, street, barangay, city) : null
      })
      .eq('person_id', jobSeekerData.person_id)
      .select()
      .single();

    if (personError) {
      console.error('Error updating person data:', personError);
      return NextResponse.json({ success: false, error: 'Failed to update personal information' }, { status: 500 });
    }

    // Update account data (email and phone)
    const { data: updatedAccount, error: accountUpdateError } = await supabase
      .from('account')
      .update({
        account_email: email,
        account_phone: phone
      })
      .eq('account_id', accountId)
      .select()
      .single();

    if (accountUpdateError) {
      console.error('Error updating account data:', accountUpdateError);
      return NextResponse.json({ success: false, error: 'Failed to update contact information' }, { status: 500 });
    }

    // Update job seeker education and experience levels
    const { data: updatedJobSeeker, error: jobSeekerUpdateError } = await supabase
      .from('job_seeker')
      .update({
        job_seeker_education_level_id: educationLevelId,
        job_seeker_experience_level_id: experienceLevelId
      })
      .eq('job_seeker_id', jobSeekerData.job_seeker_id)
      .select()
      .single();

    if (jobSeekerUpdateError) {
      console.error('Error updating job seeker data:', jobSeekerUpdateError);
      return NextResponse.json({ success: false, error: 'Failed to update job seeker information' }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Profile updated successfully' });
  } catch (error) {
    console.error('Unexpected error updating jobseeker profile:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}

// Helper function to get or create address ID
async function getOrCreateAddressId(supabase, premise, street, barangay, city) {
  try {
    // First check if address already exists
    const addressParts = [];
    if (premise) addressParts.push(premise);
    if (street) addressParts.push(street);
    if (barangay) addressParts.push(barangay);
    if (city) addressParts.push(city);
    const fullAddress = addressParts.join(', ');

    // Since we don't have a unique identifier for address based on content,
    // we'll create a new one each time to avoid conflicts
    const { data: newAddress, error: newAddressError } = await supabase
      .from('address')
      .insert({
        premise_name: premise || '',
        street_name: street || '',
        barangay_name: barangay || '',
        city_name: city || ''
      })
      .select('address_id')
      .single();

    if (newAddressError) {
      console.error('Error creating new address:', newAddressError);
      return null;
    }

    return newAddress.address_id;
  } catch (error) {
    console.error('Error in getOrCreateAddressId:', error);
    return null;
  }
}
