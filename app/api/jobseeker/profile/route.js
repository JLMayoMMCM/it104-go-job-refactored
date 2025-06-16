import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase';

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

    // Fetch education level if available
    let educationLevel = 'Not specified';
    if (jobSeekerData.job_seeker_education_level_id) {
      const { data: educationData, error: educationError } = await supabase
        .from('job_seeker_education_level')
        .select('education_level_name')
        .eq('job_seeker_education_level_id', jobSeekerData.job_seeker_education_level_id)
        .single();

      if (!educationError && educationData) {
        educationLevel = educationData.education_level_name;
      } else {
        console.warn('Education level not found for ID:', jobSeekerData.job_seeker_education_level_id);
      }
    }

    // Fetch experience level if available
    let experienceLevel = 'Not specified';
    if (jobSeekerData.job_seeker_experience_level_id) {
      const { data: experienceData, error: experienceError } = await supabase
        .from('job_seeker_experience_level')
        .select('experience_level_name')
        .eq('job_seeker_experience_level_id', jobSeekerData.job_seeker_experience_level_id)
        .single();

      if (!experienceError && experienceData) {
        experienceLevel = experienceData.experience_level_name;
      } else {
        console.warn('Experience level not found for ID:', jobSeekerData.job_seeker_experience_level_id);
      }
    }

    // Fetch job category preferences with proper JOINs
    const { data: categoryPreferencesData, error: categoryPreferencesError } = await supabase
      .from('jobseeker_preference')
      .select(`
        preferred_job_category_id,
        job_category:preferred_job_category_id(job_category_id, job_category_name, category_field_id, category_field:category_field_id(category_field_id, category_field_name))
      `)
      .eq('jobseeker_id', jobSeekerData.job_seeker_id);

    if (categoryPreferencesError) {
      console.error('Error fetching job category preferences:', categoryPreferencesError);
    }

    // Format job preferences with actual field and category names
    const jobPreferences = categoryPreferencesData?.map(pref => ({
      field_id: pref.job_category?.category_field?.category_field_id || 0,
      field_name: pref.job_category?.category_field?.category_field_name || 'Unknown Field',
      category_id: pref.job_category?.job_category_id || 0,
      category_name: pref.job_category?.job_category_name || 'Unknown Category'
    })) || [];

    // Format address string
    const addressParts = [];
    if (personData.address?.premise_name) addressParts.push(personData.address.premise_name);
    if (personData.address?.street_name) addressParts.push(personData.address.street_name);
    if (personData.address?.barangay_name) addressParts.push(personData.address.barangay_name);
    if (personData.address?.city_name) addressParts.push(personData.address.city_name);
    const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'No address provided';

    // Format resume data
    let resumeData = null;
    if (accountData.account_resume) {
      // Extract filename from URL
      const url = new URL(accountData.account_resume);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      resumeData = {
        url: accountData.account_resume,
        name: fileName.replace(/^resume_\d+_\d+\./, '').replace(/^resume_/, '') || 'Resume.pdf',
        size: 'Unknown size' // We don't store file size in DB, but could be added later
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
