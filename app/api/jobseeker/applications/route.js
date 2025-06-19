// app/api/jobseeker/applications/route.js
import { applyForJob } from '../../../lib/jobApplicationService';
import { createClient } from '../../../lib/supabase';

/**
 * GET endpoint to fetch job applications for a jobseeker.
 * Query parameter: accountId (required)
 */
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const statusFilter = searchParams.get('status')?.toLowerCase();

    if (!accountId) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'accountId is required' 
      }), { status: 400 });
    }

    const supabase = createClient();

    // Get jobseeker ID from account ID
    const { data: jobSeekerData, error: jobSeekerError } = await supabase
      .from('job_seeker')
      .select('job_seeker_id')
      .eq('account_id', accountId)
      .single();

    if (jobSeekerError || !jobSeekerData) {
      console.error('Job seeker lookup error:', jobSeekerError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Job seeker not found' 
      }), { status: 404 });
    }

    const jobSeekerId = jobSeekerData.job_seeker_id;
    console.log(`Fetching applications for jobSeekerId: ${jobSeekerId}, status filter: ${statusFilter || 'none'}`);    // Build the query for applications with job details
    let query = supabase
      .from('job_requests')
      .select(`
        request_id,
        job_id,
        request_status_id,
        attempt_number,
        request_date,
        cover_letter,
        jobs:job_id (
          job_name,
          company_id,
          job_description,
          job_salary,
          job_type_id,
          job_location,
          job_type:job_type_id (
            job_type_name
          ),
          companies:company_id (
            company_name
          )
        )
      `)
      .eq('job_seeker_id', jobSeekerId);

    // Apply status filter if provided
    if (statusFilter === 'accepted') {
      query = query.eq('request_status_id', 1);
    } else if (statusFilter === 'rejected') {
      query = query.eq('request_status_id', 3);
    } else if (statusFilter === 'pending') {
      query = query.eq('request_status_id', 2);
    }

    // Execute the query
    const { data: applications, error: applicationsError } = await query
      .order('request_date', { ascending: false });

    if (applicationsError) {
      console.error('Applications fetch error:', applicationsError);
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Failed to fetch applications' 
      }), { status: 500 });
    }
    
    console.log(`Found ${applications?.length || 0} applications with the current filter`);    // Map each application to include a normalized status string and job details
    const applicationsWithStatus = applications.map(app => {
      // Convert numeric status IDs to string status values
      let status;
      if (app.request_status_id === 1) {
        status = 'accepted';
      } else if (app.request_status_id === 3) {
        status = 'rejected'; // Normalize "denied" to "rejected"
      } else {
        status = 'pending';
      }

      // Format the request date for display
      const appliedDate = app.request_date ? new Date(app.request_date).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      }) : 'Unknown';      // Extract job type name
      const jobType = app.jobs?.job_type?.job_type_name || 'Not specified';
      
      // Format salary for display
      const salary = app.jobs?.job_salary || 'Not specified';
      
      return {
        request_id: app.request_id,
        jobId: app.job_id,
        status: status,
        attempt_number: app.attempt_number,
        request_date: app.request_date,
        appliedDate: appliedDate,
        cover_letter: app.cover_letter,
        jobTitle: app.jobs?.job_name || 'Untitled Job',
        company: app.jobs?.companies?.company_name || 'Unknown Company',
        location: app.jobs?.job_location || 'Remote/Not specified',
        salary: salary,
        jobType: jobType,
        description: app.jobs?.job_description || 'No description provided'
      };
    });

    return new Response(JSON.stringify({
      success: true,
      data: applicationsWithStatus,
      count: applicationsWithStatus.length
    }), { status: 200 });
  } catch (error) {
    console.error('Error fetching applications:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'An unexpected error occurred'
    }), { status: 500 });
  }
}

/**
 * POST endpoint to handle job application submission.
 * Expects a JSON payload with:
 *   - jobId: number
 *   - jobSeekerId: number
 *   - coverLetter: optional string
 *
 * If a previous application exists and was rejected, this endpoint allows re-applying
 * by incrementing the attempt_number; otherwise, it creates the first application.
 */
export async function POST(request) {
  try {
    const body = await request.json();
    const { jobId, accountId, coverLetter } = body;
    
    if (!jobId || !accountId) {
      return new Response(JSON.stringify({ 
        success: false,
        error: 'jobId and accountId are required' 
      }), { status: 400 });
    }
    
    // Create a Supabase client to look up the job_seeker_id using accountId
    const supabase = createClient();
    const { data: jobSeekerData, error: jobSeekerError } = await supabase
      .from('job_seeker')
      .select('job_seeker_id')
      .eq('account_id', accountId)
      .single();
      
    if (jobSeekerError || !jobSeekerData) {
      console.error('Job seeker lookup error:', jobSeekerError);
      return new Response(JSON.stringify({ 
        success: false,
        error: 'Job seeker not found' 
      }), { status: 404 });
    }
    
    const jobSeekerId = jobSeekerData.job_seeker_id;
    console.log(`Processing application from jobSeekerId: ${jobSeekerId} for jobId: ${jobId}`);

    // Apply for the job
    const result = await applyForJob(jobId, jobSeekerId, coverLetter);
    
    if (!result.success) {
      console.error('Application submission error:', result.error);
      return new Response(JSON.stringify({ 
        success: false, 
        error: result.error || 'Failed to submit application'
      }), { status: 400 });
    }
    
    console.log('Application submitted successfully:', result.message);
    return new Response(JSON.stringify({ 
      success: true, 
      data: result.application,
      message: result.message
    }), { status: 200 });
  } catch (error) {
    console.error('Unexpected error in POST /api/jobseeker/applications:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message || 'An unexpected error occurred' 
    }), { status: 500 });
  }
}
