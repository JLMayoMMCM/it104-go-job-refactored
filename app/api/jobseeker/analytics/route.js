import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get jobseeker ID from account ID
    const { data: jobseekerData, error: jobseekerError } = await supabase
      .from('job_seeker')
      .select('job_seeker_id')
      .eq('account_id', accountId)
      .single();

    if (jobseekerError || !jobseekerData) {
      return NextResponse.json(
        { success: false, error: 'Jobseeker not found' },
        { status: 404 }
      );
    }

    const jobseekerId = jobseekerData.job_seeker_id;

    // Fetch counts for analytics
    const { count: appliedJobsCount, error: appliedError } = await supabase
      .from('job_requests')
      .select('*', { count: 'exact' })
      .eq('job_seeker_id', jobseekerId);

    const { count: acceptedCount, error: acceptedError } = await supabase
      .from('job_requests')
      .select('*', { count: 'exact' })
      .eq('job_seeker_id', jobseekerId)
      .eq('request_status', 'accepted');

    const { count: pendingCount, error: pendingError } = await supabase
      .from('job_requests')
      .select('*', { count: 'exact' })
      .eq('job_seeker_id', jobseekerId)
      .eq('request_status', 'pending');

    const { count: savedJobsCount, error: savedError } = await supabase
      .from('saved_jobs')
      .select('*', { count: 'exact' })
      .eq('job_seeker_id', jobseekerId);

    if (appliedError || acceptedError || pendingError || savedError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch analytics data' },
        { status: 500 }
      );
    }

    const analytics = {
      appliedJobs: appliedJobsCount || 0,
      acceptedApplications: acceptedCount || 0,
      pendingApplications: pendingCount || 0,
      savedJobs: savedJobsCount || 0
    };

    // Fetch recommended jobs (simple version for now)
    // TODO: Implement full recommendation algorithm based on job preferences
    const { data: recommendedJobsData, error: recommendedError } = await supabase
      .from('job')
      .select(`
        job_id,
        job_name,
        job_location,
        job_salary,
        job_posted_date,
        company:company_id (company_name)
      `)
      .eq('job_is_active', true)
      .order('job_posted_date', { ascending: false })
      .limit(3);

    // Fetch recent jobs
    const { data: recentJobsData, error: recentError } = await supabase
      .from('job')
      .select(`
        job_id,
        job_name,
        job_location,
        job_salary,
        job_posted_date,
        company:company_id (company_name)
      `)
      .eq('job_is_active', true)
      .order('job_posted_date', { ascending: false })
      .limit(3);

    if (recommendedError || recentError) {
      return NextResponse.json(
        { success: false, error: 'Failed to fetch job data' },
        { status: 500 }
      );
    }

    // Format the job data to match the frontend structure
    const recommendedJobs = recommendedJobsData?.map(job => ({
      job_id: job.job_id,
      job_name: job.job_name,
      company_name: job.company?.company_name || 'Unknown Company',
      job_location: job.job_location,
      job_salary: job.job_salary,
      job_posted_date: job.job_posted_date
    })) || [];

    const recentJobs = recentJobsData?.map(job => ({
      job_id: job.job_id,
      job_name: job.job_name,
      company_name: job.company?.company_name || 'Unknown Company',
      job_location: job.job_location,
      job_salary: job.job_salary,
      job_posted_date: job.job_posted_date
    })) || [];

    return NextResponse.json({
      success: true,
      data: {
        analytics,
        recommendedJobs,
        recentJobs
      }
    });
  } catch (error) {
    console.error('Error in jobseeker analytics API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
