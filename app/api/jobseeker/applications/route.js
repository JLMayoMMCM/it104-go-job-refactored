import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const status = searchParams.get('status'); // optional: 'pending', 'accepted', 'rejected'

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

    // Build the query for job requests
    let query = supabase
      .from('job_requests')
      .select(`
        request_id,
        job_id,
        request_date,
        request_status_id,
        cover_letter,
        employee_response,
        response_date,
        job:job_id (
          job_name,
          job_description,
          job_location,
          job_salary,
          job_posted_date,
          company:company_id (
            company_name,
            company_logo
          ),
          job_type:job_type_id (
            job_type_name
          )
        )
      `)
      .eq('job_seeker_id', jobSeekerId)
      .order('request_date', { ascending: false });    // Apply status filter if provided
    if (status && ['pending', 'accepted', 'rejected'].includes(status.toLowerCase())) {
      console.log(`Filtering applications by status: ${status.toLowerCase()}`);
      
      if (status.toLowerCase() === 'rejected') {
        query = query.eq('request_status_id', 3); // Rejected = 3
      } else if (status.toLowerCase() === 'accepted') {
        query = query.eq('request_status_id', 1); // Accepted = 1
      } else if (status.toLowerCase() === 'pending') {
        query = query.eq('request_status_id', 2); // Pending/In-progress = 2
      }
    }

    // Execute the query
    const { data: applications, error: applicationsError } = await query;

    console.log(`Found ${applications?.length || 0} applications for status: ${status || 'all'}`);
    
    if (applicationsError) {
      console.error('Applications fetch error:', applicationsError);
      return NextResponse.json({ success: false, error: 'Failed to fetch applications' }, { status: 500 });
    }

    // Format the application data for the frontend
    const formattedApplications = applications?.map(app => {
      // Calculate days since application
      const requestDate = new Date(app.request_date);
      const now = new Date();
      const daysDiff = Math.floor((now - requestDate) / (1000 * 60 * 60 * 24));
      let appliedAgo;
      if (daysDiff === 0) {
        appliedAgo = 'Today';
      } else if (daysDiff === 1) {
        appliedAgo = '1 day ago';
      } else if (daysDiff < 7) {
        appliedAgo = `${daysDiff} days ago`;
      } else {
        const weeksDiff = Math.floor(daysDiff / 7);
        appliedAgo = weeksDiff === 1 ? '1 week ago' : `${weeksDiff} weeks ago`;
      }

      // Format response date if available
      let responseAgo = '';
      if (app.response_date) {
        const responseDate = new Date(app.response_date);
        const respDaysDiff = Math.floor((now - responseDate) / (1000 * 60 * 60 * 24));
        if (respDaysDiff === 0) {
          responseAgo = 'Today';
        } else if (respDaysDiff === 1) {
          responseAgo = '1 day ago';
        } else if (respDaysDiff < 7) {
          responseAgo = `${respDaysDiff} days ago`;
        } else {
          const weeksDiff = Math.floor(respDaysDiff / 7);
          responseAgo = weeksDiff === 1 ? '1 week ago' : `${weeksDiff} weeks ago`;
        }
      }      return {
        id: app.request_id,
        jobId: app.job_id,
        jobTitle: app.job?.job_name || 'Unknown Job',
        company: app.job?.company?.company_name || 'Unknown Company',
        companyLogo: app.job?.company?.company_logo || null,
        location: app.job?.job_location || 'Not specified',
        jobType: app.job?.job_type?.job_type_name || 'Not specified',
        salary: app.job?.job_salary || 'Not specified',
        appliedDate: appliedAgo,
        status: app.request_status_id === 1 ? 'accepted' : app.request_status_id === 3 ? 'rejected' : 'pending',
        coverLetter: app.cover_letter || '',
        response: app.employee_response || '',
        responseDate: responseAgo,
        description: app.job?.job_description?.substring(0, 150) + '...' || 'No description available.'
      };
    }) || [];

    return NextResponse.json({
      success: true,
      data: formattedApplications
    });

  } catch (error) {
    console.error('Unexpected error fetching jobseeker applications:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { jobId, accountId, coverLetter } = body;

    if (!jobId || !accountId) {
      return NextResponse.json({ success: false, error: 'Job ID and Account ID are required' }, { status: 400 });
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

    // Check if application already exists and get its status
    const { data: existingApplication, error: existingError } = await supabase
      .from('job_requests')
      .select('request_id, request_status_id')
      .eq('job_id', jobId)
      .eq('job_seeker_id', jobSeekerId)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Check existing application error:', existingError);
      return NextResponse.json({ success: false, error: 'Failed to check existing application' }, { status: 500 });
    }

    // Block application only if there's an existing application that is pending (2) or accepted (1)
    if (existingApplication && (existingApplication.request_status_id === 2 || existingApplication.request_status_id === 1)) {
      return NextResponse.json({ 
        success: false, 
        error: `You have already applied for this job and your application is ${existingApplication.request_status_id === 1 ? 'accepted' : 'in-progress'}`
      }, { status: 409 });
    }

    // Always insert new application - don't update existing ones
    const { data: newApplication, error: insertError } = await supabase
      .from('job_requests')
      .insert([
        {
          job_id: jobId,
          job_seeker_id: jobSeekerId,
          cover_letter: coverLetter || 'I am interested in this position and would like to apply.',
          request_status_id: 2 // Set to in-progress/pending
        }
      ])
      .select('request_id')
      .single();
    
    if (insertError) {
      console.error('Application insert error:', insertError);
      return NextResponse.json({ success: false, error: 'Failed to submit application' }, { status: 500 });
    }

    // Create a notification for the jobseeker
    const { error: notificationError } = await supabase
      .from('notifications')
      .insert([
        {
          account_id: accountId,
          notification_text: 'Your application has been submitted successfully. We will notify you of any updates.',
          sender_account_id: null // System notification
        }
      ]);

    if (notificationError) {
      console.error('Notification insert error:', notificationError);
      // Don't fail the request just because notification failed
    }

    // Get job details to create company notification
    const { data: jobData, error: jobError } = await supabase
      .from('job')
      .select('job_name, company_id')
      .eq('job_id', jobId)
      .single();

    if (jobError) {
      console.error('Job fetch error for notification:', jobError);
    } else {
      // Create a notification for the company
      const { error: companyNotificationError } = await supabase
        .from('company_notifications')
        .insert([
          {
            company_id: jobData.company_id,
            notification_text: `A new application has been received for the position: ${jobData.job_name}`,
            sender_account_id: accountId
          }
        ]);

      if (companyNotificationError) {
        console.error('Company notification insert error:', companyNotificationError);
      }
    }

    return NextResponse.json({
      success: true,
      data: { id: newApplication.request_id },
      message: 'Application submitted successfully'
    });

  } catch (error) {
    console.error('Unexpected error submitting application:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}
