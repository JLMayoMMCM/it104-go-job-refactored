import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const type = searchParams.get('type'); // 'recommended' or 'recent'

    if (!accountId) {
      return NextResponse.json({ success: false, error: 'Account ID is required' }, { status: 400 });
    }

    const supabase = createClient();

    // Get jobseeker data to access preferences
    const { data: jobSeekerData, error: jobSeekerError } = await supabase
      .from('job_seeker')
      .select('job_seeker_id, job_seeker_experience_level_id')
      .eq('account_id', accountId)
      .single();

    if (jobSeekerError || !jobSeekerData) {
      return NextResponse.json({ success: false, error: 'Job seeker not found' }, { status: 404 });
    }

    if (type === 'recommended') {
      // Get user's job field preferences
      const { data: preferences, error: prefError } = await supabase
        .from('jobseeker_field_preference')
        .select('preferred_job_field_id')
        .eq('jobseeker_id', jobSeekerData.job_seeker_id);

      if (prefError) {
        console.error('Preferences fetch error:', prefError);
        return NextResponse.json({ success: false, error: 'Failed to fetch preferences' }, { status: 500 });
      }

      const preferredFields = preferences?.map(p => p.preferred_job_field_id) || [];

      if (preferredFields.length === 0) {
        // If no preferences, return empty recommended jobs
        return NextResponse.json({
          success: true,
          data: []
        });
      }

      // Get job categories that match user's preferred fields
      const { data: matchingCategories, error: catError } = await supabase
        .from('job_category')
        .select('job_category_id')
        .in('category_field_id', preferredFields);

      if (catError) {
        console.error('Categories fetch error:', catError);
        return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 });
      }

      const categoryIds = matchingCategories?.map(c => c.job_category_id) || [];

      if (categoryIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: []
        });
      }

      // Get jobs that match the categories
      const { data: jobCategoryList, error: jclError } = await supabase
        .from('job_category_list')
        .select('job_id')
        .in('job_category_id', categoryIds);

      if (jclError) {
        console.error('Job category list fetch error:', jclError);
        return NextResponse.json({ success: false, error: 'Failed to fetch job categories' }, { status: 500 });
      }

      const jobIds = [...new Set(jobCategoryList?.map(jcl => jcl.job_id) || [])];

      if (jobIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: []
        });
      }

      // Fetch recommended jobs
      const { data: jobs, error: jobsError } = await supabase
        .from('job')
        .select(`
          job_id,
          job_name,
          job_description,
          job_location,
          job_salary,
          job_posted_date,
          job_closing_date,
          job_is_active,
          company:company_id (
            company_name
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
                category_field_name
              )
            )
          )
        `)
        .in('job_id', jobIds)
        .eq('job_is_active', true)
        .gte('job_closing_date', new Date().toISOString().split('T')[0])
        .order('job_posted_date', { ascending: false })
        .limit(6);

      if (jobsError) {
        console.error('Jobs fetch error:', jobsError);
        return NextResponse.json({ success: false, error: 'Failed to fetch jobs' }, { status: 500 });
      }

      // Calculate match percentage and format data
      const formattedJobs = jobs?.map(job => {
        // Calculate match percentage based on matching categories
        const jobCategories = job.job_category_list?.map(jcl => jcl.job_category?.category_field?.category_field_id) || [];
        const matchingFieldsCount = jobCategories.filter(fieldId => preferredFields.includes(fieldId)).length;
        const totalJobFields = [...new Set(jobCategories)].length || 1;
        const matchPercentage = Math.round((matchingFieldsCount / preferredFields.length) * 100);

        // Calculate days since posted
        const postedDate = new Date(job.job_posted_date);
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

        return {
          id: job.job_id,
          title: job.job_name,
          company: job.company?.company_name || 'Unknown Company',
          location: job.job_location,
          type: job.job_type?.job_type_name || 'Full-time',
          salary: job.job_salary || 'Salary not specified',
          match: Math.max(matchPercentage, 65), // Ensure minimum 65% for recommended jobs
          posted: postedAgo,
          description: job.job_description?.substring(0, 150) + '...'
        };
      }) || [];

      return NextResponse.json({
        success: true,
        data: formattedJobs.sort((a, b) => b.match - a.match) // Sort by match percentage
      });

    } else if (type === 'recent') {
      // Get recent job postings from all companies
      const { data: jobs, error: jobsError } = await supabase
        .from('job')
        .select(`
          job_id,
          job_name,
          job_description,
          job_location,
          job_salary,
          job_posted_date,
          job_closing_date,
          job_is_active,
          company:company_id (
            company_name
          ),
          job_type:job_type_id (
            job_type_name
          )
        `)
        .eq('job_is_active', true)
        .gte('job_closing_date', new Date().toISOString().split('T')[0])
        .order('job_posted_date', { ascending: false })
        .limit(6);

      if (jobsError) {
        console.error('Recent jobs fetch error:', jobsError);
        return NextResponse.json({ success: false, error: 'Failed to fetch recent jobs' }, { status: 500 });
      }

      // Format recent jobs data
      const formattedJobs = jobs?.map(job => {
        // Calculate days since posted
        const postedDate = new Date(job.job_posted_date);
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

        return {
          id: job.job_id,
          title: job.job_name,
          company: job.company?.company_name || 'Unknown Company',
          location: job.job_location,
          type: job.job_type?.job_type_name || 'Full-time',
          salary: job.job_salary || 'Salary not specified',
          posted: postedAgo,
          description: job.job_description?.substring(0, 150) + '...'
        };
      }) || [];

      return NextResponse.json({
        success: true,
        data: formattedJobs
      });

    } else {
      return NextResponse.json({ success: false, error: 'Invalid type parameter. Use "recommended" or "recent"' }, { status: 400 });
    }

  } catch (error) {
    console.error('Unexpected error fetching jobseeker jobs:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}
