import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import bcrypt from 'bcryptjs';

export async function PUT(request, { params }) {
  try {
    const { requestId } = params;
    const body = await request.json();
    const { accountId, request_status_id, employee_password } = body;
    const requestStatusId = parseInt(request_status_id, 10);
    
    if (!accountId || !requestId || isNaN(requestStatusId)) {
      return NextResponse.json({ error: 'Account ID, request ID, and status are required' }, { status: 400 });
    }    if (![1, 3].includes(requestStatusId)) {
      return NextResponse.json({ error: 'Invalid status. Must be "1" or "3"' }, { status: 400 });
    }

    if (!employee_password) {
      return NextResponse.json({ error: 'Employee password is required for this action' }, { status: 400 });
    }

    // Verify employee password
    const { data: accountData, error: accountError } = await supabase
      .from('account')
      .select('account_password')
      .eq('account_id', accountId)
      .single();

    if (accountError || !accountData) {
      return NextResponse.json({ error: 'Employee account not found' }, { status: 404 });
    }

    // Verify password using bcryptjs
    const isPasswordValid = await bcrypt.compare(employee_password, accountData.account_password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Get employee's company_id
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
        request_status_id,
        job:job_id (
          company_id,
          job_is_active,
          job_name
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

    // Check if request is still pending (status ID 2 = pending)
    if (jobRequest.request_status_id !== 2) {
      return NextResponse.json({ error: 'Job request has already been processed' }, { status: 400 });
    }
    // Auto-deny if job is inactive and action is accept
    let finalStatusId = requestStatusId;
    let finalMessage = '';
    
    if (requestStatusId === 1 && !jobRequest.job.job_is_active) {
      finalStatusId = 3;
      finalMessage = 'This position is no longer available.';
    } else {
      if (requestStatusId === 1) {
        finalMessage = 'Congratulations! Your application has been accepted. We will contact you soon with next steps.';
      } else {
        finalMessage = 'Thank you for your interest in this position. After careful consideration, we have decided to move forward with other candidates.';
      }
    }

    // Update the job request
    const { error: updateError } = await supabase
      .from('job_requests')
      .update({
        request_status_id: finalStatusId,
        employee_response: finalMessage,
        response_date: new Date().toISOString()
      })
      .eq('request_id', requestId);

    if (updateError) {
      console.error('Job request update error:', updateError);
      return NextResponse.json({ error: 'Failed to update job request' }, { status: 500 });
    }

    // Get jobseeker account ID to send notification
    const { data: jobSeekerData, error: jobSeekerError } = await supabase
      .from('job_requests')
      .select(`
        job_seeker_id,
        job_seeker:job_seeker_id (
          account_id
        ),
        job:job_id (
          job_name,
          company:company_id (
            company_name
          )
        )
      `)
      .eq('request_id', requestId)
      .single();

    if (jobSeekerError) {
      console.error('Error fetching jobseeker data for notification:', jobSeekerError);
    } else {
      const jobSeekerAccountId = jobSeekerData.job_seeker.account_id;
      const jobName = jobSeekerData.job.job_name;
      const companyName = jobSeekerData.job.company.company_name;
      let notificationText = '';
      
      notificationText = requestStatusId === 1 
        ? `Application Accepted for ${jobName} at ${companyName}\n${finalMessage}`
        : `Application Update for ${jobName} at ${companyName}\n${finalMessage}`;
      
      // Create a notification for the jobseeker
      const { error: notificationError } = await supabase
        .from('notifications')
        .insert([
          {
            account_id: jobSeekerAccountId,
            notification_text: notificationText,
            sender_account_id: accountId // Employee account ID
          }
        ]);

      if (notificationError) {
        console.error('Notification insert error:', notificationError);
        // Don't fail the request just because notification failed
      }
    }

    return NextResponse.json({
      success: true,
      message: `Job request ${finalStatusId === 1 ? 'accepted' : 'rejected'} successfully`,
      status: finalStatusId === 1 ? 'accepted' : 'rejected'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
