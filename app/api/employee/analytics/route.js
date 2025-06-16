import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Get employee's company_id first
    const { data: employee, error: empError } = await supabase
      .from('employee')
      .select('company_id')
      .eq('account_id', accountId)
      .single();

    if (empError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Get total job postings
    const { count: totalJobPostings, error: totalJobsError } = await supabase
      .from('job')
      .select('*', { count: 'exact' })
      .eq('company_id', employee.company_id);

    if (totalJobsError) {
      throw new Error('Failed to fetch total job postings');
    }

    // Get active job postings
    const { count: activePostings, error: activeJobsError } = await supabase
      .from('job')
      .select('*', { count: 'exact' })
      .eq('company_id', employee.company_id)
      .eq('job_is_active', true);

    if (activeJobsError) {
      throw new Error('Failed to fetch active job postings');
    }

    // Get all job IDs for this company to count applicants
    const { data: companyJobs, error: jobsError } = await supabase
      .from('job')
      .select('job_id')
      .eq('company_id', employee.company_id);

    if (jobsError) {
      throw new Error('Failed to fetch company jobs');
    }

    let totalApplicants = 0;
    let acceptedApplicants = 0;

    if (companyJobs && companyJobs.length > 0) {
      const jobIds = companyJobs.map(job => job.job_id);

      // Get total applicants
      const { count: totalApps, error: totalAppsError } = await supabase
        .from('job_requests')
        .select('*', { count: 'exact' })
        .in('job_id', jobIds);

      if (totalAppsError) {
        throw new Error('Failed to fetch total applicants');
      }

      totalApplicants = totalApps;

      // Get accepted applicants
      const { count: acceptedApps, error: acceptedAppsError } = await supabase
        .from('job_requests')
        .select('*', { count: 'exact' })
        .in('job_id', jobIds)
        .eq('request_status', 'accepted');

      if (acceptedAppsError) {
        throw new Error('Failed to fetch accepted applicants');
      }

      acceptedApplicants = acceptedApps;
    }

    // Get recent active jobs with applicant counts
    const { data: activeJobs, error: activeJobsDataError } = await supabase
      .from('job')
      .select(`
        job_id,
        job_name,
        job_posted_date,
        job_is_active,
        job_category_list (
          job_category:job_category_id (
            job_category_name,
            category_field:category_field_id (
              category_field_name
            )
          )
        )
      `)
      .eq('company_id', employee.company_id)
      .eq('job_is_active', true)
      .order('job_posted_date', { ascending: false })
      .limit(4);

    if (activeJobsDataError) {
      throw new Error('Failed to fetch active jobs data');
    }

    // Process active jobs and get applicant counts
    const processedActiveJobs = await Promise.all(activeJobs.map(async job => {
      // Get applicant count for this job
      const { count: applicantCount, error: applicantCountError } = await supabase
        .from('job_requests')
        .select('*', { count: 'exact' })
        .eq('job_id', job.job_id);

      if (applicantCountError) {
        console.error(`Error fetching applicant count for job ${job.job_id}:`, applicantCountError);
        return { ...job, applicant_count: 0 };
      }

      // Extract category field name and job category name (take first category if multiple)
      let categoryFieldName = 'Uncategorized';
      let jobCategoryName = 'Uncategorized';

      if (job.job_category_list && job.job_category_list.length > 0) {
        const firstCategory = job.job_category_list[0].job_category;
        if (firstCategory) {
          jobCategoryName = firstCategory.job_category_name || 'Uncategorized';
          if (firstCategory.category_field) {
            categoryFieldName = firstCategory.category_field.category_field_name || 'Uncategorized';
          }
        }
      }

      return {
        job_id: job.job_id,
        job_name: job.job_name,
        job_posted_date: job.job_posted_date,
        job_is_active: job.job_is_active,
        category_field_name: categoryFieldName,
        job_category_name: jobCategoryName,
        applicant_count: applicantCount
      };
    }));

    const analytics = {
      totalApplicants,
      acceptedApplicants,
      totalJobPostings,
      activePostings
    };

    return NextResponse.json({
      success: true,
      data: {
        analytics,
        activeJobs: processedActiveJobs
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
