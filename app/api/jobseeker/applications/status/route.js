import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const jobId = searchParams.get('jobId');

    if (!accountId) {
      return NextResponse.json({ success: false, error: 'Account ID is required' }, { status: 400 });
    }

    const supabase = createClient();

    // Get jobseeker ID from account ID
    const { data: jobSeekerData, error: jobSeekerError } = await supabase
      .from('job_seeker')
      .select('job_seeker_id')
      .eq('account_id', accountId)
      .single();

    if (jobSeekerError || !jobSeekerData) {
      return NextResponse.json({ success: false, error: 'Job seeker not found' }, { status: 404 });
    }

    const jobSeekerId = jobSeekerData.job_seeker_id;

    if (jobId) {
      // Check application status for this specific job
      const { data: application, error: applicationError } = await supabase
        .from('job_requests')
        .select(`
          request_id,
          job_id,
          request_status_id,
          attempt_number
        `)
        .eq('job_id', jobId)
        .eq('job_seeker_id', jobSeekerId)
        .single();

      if (applicationError && applicationError.code !== 'PGRST116') {
        console.error('Application status fetch error:', applicationError);
        return NextResponse.json({ success: false, error: 'Failed to fetch application status' }, { status: 500 });
      }

      if (!application) {
        return NextResponse.json({
          success: true,
          status: null,
          message: 'No application found for this job'
        });
      }

      // Map request_status_id to status string
      const status = application.request_status_id === 1 ? 'accepted' : 
                     application.request_status_id === 3 ? 'rejected' : 'pending';

      return NextResponse.json({
        success: true,
        status: status,
        applicationId: application.request_id
      });
    } else {
      // No jobId provided, fetch all applications for the job seeker
      const { data: applications, error: applicationsError } = await supabase
        .from('job_requests')
        .select(`
          request_id,
          job_id,
          request_status_id,
          attempt_number
        `)
        .eq('job_seeker_id', jobSeekerId);

      if (applicationsError) {
        console.error('Applications fetch error:', applicationsError);
        return NextResponse.json({ success: false, error: 'Failed to fetch applications' }, { status: 500 });
      }

      // Map each application to include a status string
      const applicationsWithStatus = applications.map(app => ({
        request_id: app.request_id,
        jobId: app.job_id,
        status: app.request_status_id === 1 ? 'accepted' : 
                app.request_status_id === 3 ? 'rejected' : 'pending',
        attempt_number: app.attempt_number
      }));

      return NextResponse.json({
        success: true,
        data: applicationsWithStatus
      });
    }
  } catch (error) {
    console.error('Unexpected error fetching application status:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}
