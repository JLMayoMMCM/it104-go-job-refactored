import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';

export async function GET(request, { params }) {
  try {
    const { jobSeekerAccountId } = params;
    const { searchParams } = new URL(request.url);
    const employeeAccountId = searchParams.get('employeeAccountId');

    if (!jobSeekerAccountId || !employeeAccountId) {
      return NextResponse.json({ error: 'Job seeker account ID and employee account ID are required' }, { status: 400 });
    }

    // Verify that the employee has the right to view this applicant
    // (i.e., the applicant has applied to a job from the employee's company)
    const { data: employee, error: empError } = await supabase
      .from('employee')
      .select('company_id')
      .eq('account_id', employeeAccountId)
      .single();

    if (empError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Check if this job seeker has applied to any job from this company
    const { data: jobRequests, error: requestError } = await supabase
      .from('job_requests')
      .select(`
        request_id,
        job:job_id (
          company_id
        ),
        job_seeker:job_seeker_id (
          account_id
        )
      `)
      .eq('job_seeker.account_id', jobSeekerAccountId);

    if (requestError) {
      console.error('Error checking job requests:', requestError);
      return NextResponse.json({ error: 'Failed to verify access' }, { status: 500 });
    }

    // Check if any request is for a job from this company
    const hasAccess = jobRequests.some(request => 
      request.job && request.job.company_id === employee.company_id
    );

    if (!hasAccess) {
      return NextResponse.json({ error: 'Unauthorized access to applicant profile' }, { status: 403 });
    }

    // Fetch account data
    const { data: accountData, error: accountError } = await supabase
      .from('account')
      .select('account_id, account_profile_photo, account_email, account_phone, account_resume')
      .eq('account_id', jobSeekerAccountId)
      .single();

    if (accountError || !accountData) {
      return NextResponse.json({ error: 'Applicant account not found' }, { status: 404 });
    }

    // Fetch job_seeker data
    const { data: jobSeekerData, error: jobSeekerError } = await supabase
      .from('job_seeker')
      .select('job_seeker_id, person_id, job_seeker_experience_level_id, job_seeker_education_level_id')
      .eq('account_id', jobSeekerAccountId)
      .single();

    if (jobSeekerError || !jobSeekerData) {
      return NextResponse.json({ error: 'Job seeker data not found' }, { status: 404 });
    }

    // Fetch person data with JOINs
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

    if (personError || !personData) {
      return NextResponse.json({ error: 'Person data not found' }, { status: 404 });
    }

    // Fetch education level
    let educationLevel = 'Not specified';
    if (jobSeekerData.job_seeker_education_level_id) {
      const { data: educationData, error: educationError } = await supabase
        .from('job_seeker_education_level')
        .select('education_level_name')
        .eq('job_seeker_education_level_id', jobSeekerData.job_seeker_education_level_id)
        .single();

      if (!educationError && educationData) {
        educationLevel = educationData.education_level_name;
      }
    }

    // Fetch experience level
    let experienceLevel = 'Not specified';
    if (jobSeekerData.job_seeker_experience_level_id) {
      const { data: experienceData, error: experienceError } = await supabase
        .from('job_seeker_experience_level')
        .select('experience_level_name')
        .eq('job_seeker_experience_level_id', jobSeekerData.job_seeker_experience_level_id)
        .single();

      if (!experienceError && experienceData) {
        experienceLevel = experienceData.experience_level_name;
      }
    }

    // Fetch job preferences
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

    // Format job preferences
    const jobPreferences = categoryPreferencesData?.map(pref => ({
      field_id: pref.job_category?.category_field?.category_field_id || 0,
      field_name: pref.job_category?.category_field?.category_field_name || 'Unknown Field',
      category_id: pref.job_category?.job_category_id || 0,
      category_name: pref.job_category?.job_category_name || 'Unknown Category'
    })) || [];

    // Format address
    const addressParts = [];
    if (personData.address?.premise_name) addressParts.push(personData.address.premise_name);
    if (personData.address?.street_name) addressParts.push(personData.address.street_name);
    if (personData.address?.barangay_name) addressParts.push(personData.address.barangay_name);
    if (personData.address?.city_name) addressParts.push(personData.address.city_name);
    const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : 'No address provided';

    // Format resume data
    let resumeData = null;
    if (accountData.account_resume) {
      const url = new URL(accountData.account_resume);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts[pathParts.length - 1];
      
      resumeData = {
        url: accountData.account_resume,
        name: fileName.replace(/^resume_\d+_\d+\./, '').replace(/^resume_/, '') || 'Resume.pdf',
        size: 'Unknown size'
      };
    }

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
          email: accountData.account_email,
          phone: accountData.account_phone,
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
    console.error('Unexpected error fetching applicant profile:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}
