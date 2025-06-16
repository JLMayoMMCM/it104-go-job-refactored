import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase';

export async function GET(request) {
  try {
    const { searchParams, pathname } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const jobId = pathname.split('/').pop();

    if (!accountId || !jobId) {
      return NextResponse.json({ success: false, error: 'Account ID and Job ID are required' }, { status: 400 });
    }

    const supabase = createClient();

    // Get jobseeker data to access job_seeker_id for checking saved/applied status
    const { data: jobSeekerData, error: jobSeekerError } = await supabase
      .from('job_seeker')
      .select('job_seeker_id')
      .eq('account_id', accountId)
      .single();

    if (jobSeekerError || !jobSeekerData) {
      return NextResponse.json({ success: false, error: 'Job seeker not found' }, { status: 404 });
    }

    const jobSeekerId = jobSeekerData.job_seeker_id;

    // Fetch job details
    const { data: jobData, error: jobError } = await supabase
      .from('job')
      .select(`
        job_id,
        job_name,
        job_description,
        job_requirements,
        job_responsibilities,
        job_location,
        job_salary,
        job_posted_date,
        job_closing_date,
        job_is_active,
        company:company_id (
          company_id,
          company_name,
          company_logo,
          company_rating
        ),
        job_type:job_type_id (
          job_type_name
        ),
        experience_level:job_experience_level_id (
          experience_level_name
        ),
        job_category_list (
          job_category:job_category_id (
            job_category_name,
            category_field:category_field_id (
              category_field_id,
              category_field_name
            )
          )
        )
      `)
      .eq('job_id', jobId)
      .single();

    if (jobError || !jobData) {
      console.error('Job fetch error:', jobError);
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    // Check if job is saved by this jobseeker
    let isSaved = false;
    try {
      const { data: savedData, error: savedError } = await supabase
        .from('saved_jobs')
        .select('saved_job_id')
        .eq('job_seeker_id', jobSeekerId)
        .eq('job_id', jobId)
        .limit(1);
        
      if (savedError) {
        console.warn('Saved status check error:', savedError);
      } else {
        isSaved = savedData && savedData.length > 0;
      }
    } catch (error) {
      console.warn('Error checking saved status:', error);
    }

    // Check if jobseeker has applied to this job
    let hasApplied = false;
    try {
      const { data: appliedData, error: appliedError } = await supabase
        .from('job_requests')
        .select('request_id')
        .eq('job_seeker_id', jobSeekerId)
        .eq('job_id', jobId)
        .limit(1);
        
      if (appliedError) {
        console.warn('Applied status check error:', appliedError);
      } else {
        hasApplied = appliedData && appliedData.length > 0;
      }
    } catch (error) {
      console.warn('Error checking applied status:', error);
    }

    // Get jobseeker's preferred fields for match percentage
    const { data: preferences, error: prefError } = await supabase
      .from('jobseeker_field_preference')
      .select('preferred_job_field_id')
      .eq('jobseeker_id', jobSeekerId);

    let matchPercentage = 0;
    if (prefError) {
      console.warn('Preferences fetch error:', prefError);
    } else {
      const preferredFields = preferences?.map(p => p.preferred_job_field_id) || [];
      if (preferredFields.length > 0) {
        // Calculate match percentage based on matching categories
        const jobCategories = jobData.job_category_list?.map(jcl => jcl.job_category?.category_field?.category_field_id) || [];
        const matchingFieldsCount = jobCategories.filter(fieldId => preferredFields.includes(fieldId)).length;
        const totalPreferredFields = preferredFields.length;
        matchPercentage = totalPreferredFields > 0 ? Math.round((matchingFieldsCount / totalPreferredFields) * 100) : 0;
      }
    }

    // Calculate days since posted
    const postedDate = new Date(jobData.job_posted_date);
    const now = new Date();
    const daysDiff = Math.floor((now - postedDate) / (1000 * 60 * 60 * 24));
    let postedAgo;
    if (daysDiff === 0) {
      postedAgo = 'Today';
    } else if (daysDiff === 1) {
      postedAgo = '1 day ago';
    } else if (daysDiff < 7) {
      postedAgo = `${daysDiff} days ago`;
    } else {
      const weeksDiff = Math.floor(daysDiff / 7);
      postedAgo = weeksDiff === 1 ? '1 week ago' : `${weeksDiff} weeks ago`;
    }

    // Format job data for frontend
    const formattedJob = {
      id: jobData.job_id,
      title: jobData.job_name,
      company: jobData.company?.company_name || 'Unknown Company',
      companyId: jobData.company?.company_id || null,
      companyLogo: jobData.company?.company_logo || '/Assets/Logo.png',
      companyRating: jobData.company?.company_rating || 0,
      location: jobData.job_location || 'Not specified',
      type: jobData.job_type?.job_type_name || 'Not specified',
      salary: jobData.job_salary || 'Not specified',
      posted: postedAgo,
      description: jobData.job_description || 'No description provided.',
      requirements: jobData.job_requirements || 'No specific requirements listed.',
      responsibilities: jobData.job_responsibilities || 'No specific responsibilities listed.',
      experienceLevel: jobData.experience_level?.experience_level_name || 'Not specified',
      category: jobData.job_category_list?.[0]?.job_category?.job_category_name || 'Not specified',
      field: jobData.job_category_list?.[0]?.job_category?.category_field?.category_field_name || 'Not specified',
      matchPercentage: matchPercentage
    };

    return NextResponse.json({
      success: true,
      data: {
        job: formattedJob,
        isSaved: isSaved,
        hasApplied: hasApplied
      }
    });

  } catch (error) {
    console.error('Unexpected error fetching job details:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}
