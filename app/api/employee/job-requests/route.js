import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const jobId = searchParams.get('jobId');
    const status = searchParams.get('status');

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

    // Build query for job requests
    let query = supabase
      .from('job_requests')
      .select(`
        request_id,
        job_id,
        request_date,
        request_status,
        cover_letter,
        employee_response,
        response_date,
        job:job_id (
          job_name,
          job_is_active,
          company_id
        ),
        job_seeker:job_seeker_id (
          job_seeker_id,
          person:person_id (
            first_name,
            last_name,
            middle_name
          ),
          account:account_id (
            account_email,
            account_username
          )
        )
      `)
      .order('request_date', { ascending: false });

    // Filter by job if specified
    if (jobId) {
      query = query.eq('job_id', jobId);
    }

    // Filter by status if specified
    if (status && status !== 'all') {
      query = query.eq('request_status', status);
    }

    const { data: allRequests, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch job requests' }, { status: 500 });
    }

    // Filter requests to only include jobs from employee's company
    const companyRequests = allRequests.filter(request => 
      request.job && request.job.company_id === employee.company_id
    );

    // Format the response data to match frontend expectations
    const formattedRequests = companyRequests.map(request => ({
      request_id: request.request_id,
      job_id: request.job_id,
      job: {
        job_name: request.job?.job_name || 'Unknown Job',
        job_is_active: request.job?.job_is_active || false
      },
      job_seeker: {
        job_seeker_id: request.job_seeker?.job_seeker_id,
        person: {
          first_name: request.job_seeker?.person?.first_name || '',
          last_name: request.job_seeker?.person?.last_name || '',
          middle_name: request.job_seeker?.person?.middle_name || ''
        },
        account: {
          account_email: request.job_seeker?.account?.account_email || '',
          account_username: request.job_seeker?.account?.account_username || ''
        }
      },
      request_date: request.request_date,
      request_status: request.request_status,
      cover_letter: request.cover_letter,
      employee_response: request.employee_response,
      response_date: request.response_date
    }));

    return NextResponse.json({
      success: true,
      data: formattedRequests
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const {
      accountId,
      requestId,
      action, // 'accept' or 'deny'
      message
    } = body;

    if (!accountId || !requestId || !action) {
      return NextResponse.json({ error: 'Account ID, request ID, and action are required' }, { status: 400 });
    }

    if (!['accept', 'deny'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action. Must be "accept" or "deny"' }, { status: 400 });
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

    // Get the job request with job details
    const { data: jobRequest, error: requestError } = await supabase
      .from('job_requests')
      .select(`
        request_id,
        job_id,
        request_status,
        job:job_id (
          company_id,
          job_is_active
        )
      `)
      .eq('request_id', requestId)
      .single();

    if (requestError || !jobRequest) {
      return NextResponse.json({ error: 'Job request not found' }, { status: 404 });
    }

    // Verify the job belongs to employee's company
    if (jobRequest.job.company_id !== employee.company_id) {
      return NextResponse.json({ error: 'Unauthorized access to job request' }, { status: 403 });
    }

    // Check if request is still pending
    if (jobRequest.request_status !== 'pending') {
      return NextResponse.json({ error: 'Job request has already been processed' }, { status: 400 });
    }

    // Auto-deny if job is inactive and action is accept
    let finalAction = action;
    let finalMessage = message;
    
    if (action === 'accept' && !jobRequest.job.job_is_active) {
      finalAction = 'deny';
      finalMessage = 'This position is no longer available.';
    }

    // Determine the new status
    const newStatus = finalAction === 'accept' ? 'accepted' : 'denied';

    // Default message if none provided
    if (!finalMessage) {
      if (finalAction === 'accept') {
        finalMessage = 'Thank you for your application. We are pleased to inform you that your application has been accepted. We will contact you soon with next steps.';
      } else {
        finalMessage = 'Thank you for your interest in this position. After careful consideration, we have decided to move forward with other candidates.';
      }
    }

    // Update the job request
    const { error: updateError } = await supabase
      .from('job_requests')
      .update({
        request_status: newStatus,
        employee_response: finalMessage,
        response_date: new Date().toISOString()
      })
      .eq('request_id', requestId);

    if (updateError) {
      console.error('Job request update error:', updateError);
      return NextResponse.json({ error: 'Failed to update job request' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Job request ${newStatus} successfully`,
      status: newStatus
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
