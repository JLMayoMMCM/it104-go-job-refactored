import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const jobId = searchParams.get('jobId');

    if (!accountId || !jobId) {
      return NextResponse.json({ success: false, error: 'Account ID and Job ID are required' }, { status: 400 });
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

    // Check application status for this job
    const { data: application, error: applicationError } = await supabase
      .from('job_requests')
      .select(`
        request_id,
        request_status_id
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

  } catch (error) {
    console.error('Unexpected error fetching application status:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}
