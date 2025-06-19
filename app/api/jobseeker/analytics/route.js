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

    const jobseekerId = jobseekerData.job_seeker_id;    // Fetch counts for analytics with detailed error handling
    let appliedJobsCount = 0;
    let acceptedCount = 0;
    let rejectedCount = 0;
    let savedJobsCount = 0;
    let savedJobsData = [];
    let followedCompaniesCount = 0;
    let notificationsData = [];
    let errorMessages = [];

    try {
      const appliedResult = await supabase
        .from('job_requests')
        .select('*', { count: 'exact' })
        .eq('job_seeker_id', jobseekerId);
      if (appliedResult.error) {
        errorMessages.push(`Failed to fetch job requests: ${appliedResult.error.message}`);
      } else {
        appliedJobsCount = appliedResult.count || 0;
      }
    } catch (err) {
      errorMessages.push(`Exception fetching job requests: ${err.message}`);
    }

    try {
      const acceptedResult = await supabase
        .from('job_requests')
        .select('*', { count: 'exact' })
        .eq('job_seeker_id', jobseekerId)
        .eq('request_status_id', 1);
      if (acceptedResult.error) {
        errorMessages.push(`Failed to fetch accepted requests: ${acceptedResult.error.message}`);
      } else {
        acceptedCount = acceptedResult.count || 0;
      }
    } catch (err) {
      errorMessages.push(`Exception fetching accepted requests: ${err.message}`);
    }

    try {
      const rejectedResult = await supabase
        .from('job_requests')
        .select('*', { count: 'exact' })
        .eq('job_seeker_id', jobseekerId)
        .eq('request_status_id', 3);
      if (rejectedResult.error) {
        errorMessages.push(`Failed to fetch rejected requests: ${rejectedResult.error.message}`);
      } else {
        rejectedCount = rejectedResult.count || 0;
      }
    } catch (err) {
      errorMessages.push(`Exception fetching rejected requests: ${err.message}`);
    }

    try {
      const savedJobsResult = await supabase
        .from('saved_jobs')
        .select('job_id')
        .eq('job_seeker_id', jobseekerId);
      if (savedJobsResult.error) {
        errorMessages.push(`Failed to fetch saved jobs: ${savedJobsResult.error.message}`);
      } else {
        savedJobsData = savedJobsResult.data || [];
        savedJobsCount = savedJobsData.length;
      }
    } catch (err) {
      errorMessages.push(`Exception fetching saved jobs: ${err.message}`);
    }

    try {
      const followedCompaniesResult = await supabase
        .from('followed_companies')
        .select('*', { count: 'exact' })
        .eq('job_seeker_id', jobseekerId);
      if (followedCompaniesResult.error) {
        errorMessages.push(`Failed to fetch followed companies: ${followedCompaniesResult.error.message}`);
      } else {
        followedCompaniesCount = followedCompaniesResult.count || 0;
      }
    } catch (err) {
      errorMessages.push(`Exception fetching followed companies: ${err.message}`);
    }

    if (errorMessages.length > 0) {
      console.error('Analytics API errors:', errorMessages);
      return NextResponse.json(
        { success: false, error: `Failed to fetch analytics data: ${errorMessages.join('; ')}` },
        { status: 500 }
      );
    }

    const analytics = {
      totalApplications: appliedJobsCount,
      acceptedApplications: acceptedCount,
      rejectedApplications: rejectedCount,
      savedJobs: savedJobsCount,
      followedCompanies: followedCompaniesCount,
      unreadNotifications: notificationsData.length,
      profileViews: 0 // Placeholder since we don't have this data yet
    };

    // Fetch recommended jobs (simple version for now)
    // TODO: Implement full recommendation algorithm based on job preferences
    let recommendedJobsData = [];
    let recentJobsData = [];
    try {
      const recommendedResult = await supabase
        .from('job')
        .select('*, company(company_name, company_id)')
        .eq('job_is_active', true)
        .order('job_posted_date', { ascending: false })
        .limit(5);
      
      if (recommendedResult.error) {
        errorMessages.push(`Failed to fetch recommended jobs: ${recommendedResult.error.message}`);
      } else {
        recommendedJobsData = recommendedResult.data || [];
      }
    } catch (err) {
      errorMessages.push(`Exception fetching recommended jobs: ${err.message}`);
    }

    // Fetch recent jobs
    try {
      const recentResult = await supabase
        .from('job')
        .select('*, company(company_name, company_id)')
        .eq('job_is_active', true)
        .order('job_posted_date', { ascending: false })
        .limit(5);
      
      if (recentResult.error) {
        errorMessages.push(`Failed to fetch recent jobs: ${recentResult.error.message}`);
      } else {
        recentJobsData = recentResult.data || [];
      }
    } catch (err) {
      errorMessages.push(`Exception fetching recent jobs: ${err.message}`);
    }

    if (errorMessages.length > 0) {
      console.error('Job data API errors:', errorMessages);
      return NextResponse.json(
        { success: false, error: `Failed to fetch job data: ${errorMessages.join('; ')}` },
        { status: 500 }
      );
    }

    // Fetch job types to map job_type_id to a readable string
    let jobTypesMap = {};
    try {
      const jobTypesResult = await supabase
        .from('job_type')
        .select('job_type_id, job_type_name');
      
      if (jobTypesResult.error) {
        errorMessages.push(`Failed to fetch job types: ${jobTypesResult.error.message}`);
      } else if (jobTypesResult.data) {
        jobTypesMap = jobTypesResult.data.reduce((acc, type) => {
          acc[type.job_type_id] = type.job_type_name;
          return acc;
        }, {});
      }
    } catch (err) {
      errorMessages.push(`Exception fetching job types: ${err.message}`);
    }

    if (errorMessages.length > 0) {
      console.error('Job types API errors:', errorMessages);
      return NextResponse.json(
        { success: false, error: `Failed to fetch job types: ${errorMessages.join('; ')}` },
        { status: 500 }
      );
    }

    // Format the job data to match the frontend structure
    const recommendedJobs = recommendedJobsData?.map(job => ({
      id: job.job_id,
      title: job.job_name,
      company: job.company?.company_name || 'Unknown Company',
      companyId: job.company?.company_id || 0,
      location: job.job_location,
      salary: job.job_salary,
      jobType: jobTypesMap[job.job_type_id] || 'Unknown Type',
      postedDate: job.job_posted_date,
      match: Math.floor(Math.random() * 30) + 70 // Placeholder for match percentage
    })) || [];

    const recentJobs = recentJobsData?.map(job => ({
      id: job.job_id,
      title: job.job_name,
      company: job.company?.company_name || 'Unknown Company',
      companyId: job.company?.company_id || 0,
      location: job.job_location,
      salary: job.job_salary,
      jobType: jobTypesMap[job.job_type_id] || 'Unknown Type',
      postedDate: job.job_posted_date
    })) || [];    return NextResponse.json({
      success: true,
      data: {
        analytics,
        recommendedJobs,
        recentJobs,
        savedJobs: savedJobsData?.map(item => ({ jobId: item.job_id })) || []
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
