import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase';
import { createNotification, NotificationTypes } from '../../../lib/notificationService';
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

    // Fetch account data with correct field names
    const { data: accountData, error: accountError } = await supabase
      .from('account')
      .select('account_id, account_profile_photo, account_email, account_phone, account_is_verified')
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
      .select('job_seeker_id, person_id, job_seeker_experience_level_id, job_seeker_education_level_id, job_seeker_resume')
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
      .from('jobseeker_preference')
      .select('preferred_job_category_id')
      .eq('jobseeker_id', jobSeekerData.job_seeker_id);

    if (jobPreferencesError) {
      console.error('Job preferences query error:', jobPreferencesError);
      // Don't fail the whole request for this error, just return empty preferences
    }

    // Also fetch field preferences if they exist
    const { data: fieldPreferencesData, error: fieldPreferencesError } = await supabase
      .from('jobseeker_field_preference')
      .select('preferred_job_field_id')
      .eq('jobseeker_id', jobSeekerData.job_seeker_id);

    if (fieldPreferencesError) {
      console.error('Field preferences query error:', fieldPreferencesError);
      // Don't fail the whole request for this error, just return empty preferences
    }

    // Combine category and field preferences with actual names
    const jobPreferences = [];
    if (jobPreferencesData && jobPreferencesData.length > 0) {
      for (const pref of jobPreferencesData) {
        // Fetch category name
        let categoryName = '';
        const { data: categoryData, error: categoryError } = await supabase
          .from('job_category')
          .select('job_category_name, category_field_id')
          .eq('job_category_id', pref.preferred_job_category_id)
          .single();
        
        if (categoryError) {
          console.error(`Category name query error for ID ${pref.preferred_job_category_id}:`, categoryError);
        } else if (categoryData) {
          categoryName = categoryData.job_category_name;
        }
        
        // Fetch field name if available in category data or from field preferences
        let fieldName = '';
        let fieldId = 0;
        if (categoryData && categoryData.category_field_id) {
          fieldId = categoryData.category_field_id;
          const { data: fieldData, error: fieldError } = await supabase
            .from('category_field')
            .select('category_field_name')
            .eq('category_field_id', categoryData.category_field_id)
            .single();
          
          if (fieldError) {
            console.error(`Field name query error for ID ${categoryData.category_field_id}:`, fieldError);
          } else if (fieldData) {
            fieldName = fieldData.category_field_name;
          }
        } else if (fieldPreferencesData && fieldPreferencesData.length > 0) {
          // Fallback to field preferences if category doesn't have field ID
          const fieldPref = fieldPreferencesData[0]; // Use first available field preference
          fieldId = fieldPref.preferred_job_field_id;
          const { data: fieldData, error: fieldError } = await supabase
            .from('category_field')
            .select('category_field_name')
            .eq('category_field_id', fieldPref.preferred_job_field_id)
            .single();
          
          if (fieldError) {
            console.error(`Field name query error for ID ${fieldPref.preferred_job_field_id}:`, fieldError);
          } else if (fieldData) {
            fieldName = fieldData.category_field_name;
          }
        }
        
        jobPreferences.push({
          category_id: pref.preferred_job_category_id,
          category_name: categoryName || `Category ${pref.preferred_job_category_id}`,
          field_id: fieldId,
          field_name: fieldName || 'Not specified'
        });
      }
    }

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
    if (jobSeekerData.job_seeker_resume) {
      // Extract filename from URL if possible
      let filename = 'Resume.pdf';
      try {
        const urlParts = jobSeekerData.job_seeker_resume.split('/');
        filename = urlParts[urlParts.length - 1].split('?')[0] || 'Resume.pdf';
      } catch (e) {
        console.error('Error extracting filename from URL:', e);
      }
      
      // Default size text
      let sizeText = 'Size not available';
      
      // Attempt to get file size via HEAD request if it's a direct file URL
      try {
        const response = await fetch(jobSeekerData.job_seeker_resume, { method: 'HEAD' });
        if (response.ok) {
          const contentLength = response.headers.get('content-length');
          if (contentLength) {
            const sizeBytes = parseInt(contentLength, 10);
            if (sizeBytes < 1024) {
              sizeText = `${sizeBytes} B`;
            } else if (sizeBytes < 1048576) {
              sizeText = `${Math.round(sizeBytes / 1024)} KB`;
            } else {
              sizeText = `${(sizeBytes / 1048576).toFixed(1)} MB`;
            }
          }
        }
      } catch (e) {
        console.error('Error fetching file size:', e);
      }
      
      resumeData = {
        url: jobSeekerData.job_seeker_resume,
        name: filename,
        size: sizeText
      };
    }

    console.log('Successfully formatted profile data');

    // Return formatted data matching what the frontend expects
    const responseData = {
      account: {
        account_id: accountData.account_id,
        profile_photo: accountData.account_profile_photo,
        resume: resumeData,
        account_is_verified: accountData.account_is_verified
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
    };

    return NextResponse.json({ success: true, data: responseData });
  } catch (error) {
    console.error('Unexpected error in GET jobseeker profile:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const { accountId, firstName, lastName, email, phone, educationLevelId, experienceLevelId } = await request.json();

    if (!accountId) {
      return NextResponse.json({ success: false, error: 'Account ID is required' }, { status: 400 });
    }

    const supabase = createClient();

    // Update account information
    const { error: accountUpdateError } = await supabase
      .from('account')
      .update({
        account_email: email,
        account_phone: phone
      })
      .eq('account_id', accountId);

    if (accountUpdateError) {
      console.error('Error updating account:', accountUpdateError);
      return NextResponse.json({ success: false, error: 'Failed to update account information' }, { status: 500 });
    }

    // Get person_id from job_seeker table
    const { data: jobSeekerData, error: jobSeekerError } = await supabase
      .from('job_seeker')
      .select('person_id')
      .eq('account_id', accountId)
      .single();

    if (jobSeekerError) {
      console.error('Error fetching job seeker data:', jobSeekerError);
      return NextResponse.json({ success: false, error: 'Failed to fetch job seeker data' }, { status: 500 });
    }

    // Update person information
    const { error: personUpdateError } = await supabase
      .from('person')
      .update({
        first_name: firstName,
        last_name: lastName
      })
      .eq('person_id', jobSeekerData.person_id);

    if (personUpdateError) {
      console.error('Error updating person:', personUpdateError);
      return NextResponse.json({ success: false, error: 'Failed to update personal information' }, { status: 500 });
    }

    // Update job seeker education and experience levels
    const { error: jobSeekerUpdateError } = await supabase
      .from('job_seeker')
      .update({
        job_seeker_education_level_id: educationLevelId,
        job_seeker_experience_level_id: experienceLevelId
      })
      .eq('account_id', accountId);

    if (jobSeekerUpdateError) {
      console.error('Error updating job seeker:', jobSeekerUpdateError);
      return NextResponse.json({ success: false, error: 'Failed to update job seeker information' }, { status: 500 });
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
    // Always create a new address record even if fields are empty
    // This ensures we never return null and violate the NOT NULL constraint
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
      // Fallback to a default address if creation fails
      const { data: defaultAddress, error: defaultError } = await supabase
        .from('address')
        .select('address_id')
        .limit(1)
        .single();
      
      if (defaultError) {
        console.error('Error fetching default address:', defaultError);
        throw new Error('Unable to create or fetch address');
      }
      
      return defaultAddress.address_id;
    }

    return newAddress.address_id;
  } catch (error) {
    console.error('Error in getOrCreateAddressId:', error);
    throw error;
  }
}
