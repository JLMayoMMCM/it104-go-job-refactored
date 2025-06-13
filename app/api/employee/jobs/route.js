import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const status = searchParams.get('status'); // 'active', 'inactive', 'all'

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

    // Build query for jobs
    let query = supabase
      .from('job')
      .select(`
        job_id,
        job_name,
        job_description,
        job_location,
        job_quantity,
        job_requirements,
        job_benefits,
        job_salary,
        job_time,
        job_posted_date,
        job_hiring_date,
        job_closing_date,
        job_is_active,
        job_type:job_type_id (
          job_type_id,
          job_type_name
        ),
        experience_level:job_experience_level_id (
          job_seeker_experience_level_id,
          experience_level_name
        ),
        job_category_list (
          job_category:job_category_id (
            job_category_id,
            job_category_name,
            category_field:category_field_id (
              category_field_id,
              category_field_name
            )
          )
        )
      `)
      .eq('company_id', employee.company_id)
      .order('job_posted_date', { ascending: false });

    // Apply status filter
    if (status === 'active') {
      query = query.eq('job_is_active', true);
    } else if (status === 'inactive') {
      query = query.eq('job_is_active', false);
    }

    const { data: jobs, error } = await query;

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch jobs' }, { status: 500 });
    }

    // Get applicant counts for each job
    const jobIds = jobs.map(job => job.job_id);
    
    let applicantCounts = [];
    if (jobIds.length > 0) {
      const { data: requests, error: requestError } = await supabase
        .from('job_requests')
        .select('job_id, request_status')
        .in('job_id', jobIds);

      if (!requestError && requests) {
        applicantCounts = jobIds.map(jobId => {
          const jobRequests = requests.filter(req => req.job_id === jobId);
          return {
            job_id: jobId,
            total_applicants: jobRequests.length,
            accepted_count: jobRequests.filter(req => req.request_status === 'accepted').length,
            denied_count: jobRequests.filter(req => req.request_status === 'denied').length,
            pending_count: jobRequests.filter(req => req.request_status === 'pending').length
          };
        });
      }
    }

    // Merge job data with applicant counts
    const enrichedJobs = jobs.map(job => {
      const counts = applicantCounts.find(count => count.job_id === job.job_id);
      return {
        ...job,
        applicant_count: counts?.total_applicants || 0,
        accepted_count: counts?.accepted_count || 0,
        denied_count: counts?.denied_count || 0,
        pending_count: counts?.pending_count || 0
      };
    });

    return NextResponse.json({
      success: true,
      data: enrichedJobs
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const {
      accountId,
      job_name,
      job_description,
      job_location,
      job_quantity,
      job_requirements,
      job_benefits,
      job_type_id,
      job_experience_level_id,
      job_salary,
      job_time,
      job_hiring_date,
      job_closing_date,
      selected_categories
    } = body;

    if (!accountId || !job_name || !job_description || !job_location || !job_type_id || !selected_categories?.length) {
      return NextResponse.json({ error: 'Required fields are missing' }, { status: 400 });
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

    // Create job
    const { data: newJob, error: jobError } = await supabase
      .from('job')
      .insert({
        company_id: employee.company_id,
        job_name,
        job_description,
        job_location,
        job_quantity: job_quantity || 1,
        job_requirements,
        job_benefits,
        job_type_id,
        job_experience_level_id: job_experience_level_id || null,
        job_salary: job_salary || null,
        job_time,
        job_hiring_date: job_hiring_date || null,
        job_closing_date: job_closing_date || null,
        job_is_active: true
      })
      .select('job_id')
      .single();

    if (jobError) {
      console.error('Job creation error:', jobError);
      return NextResponse.json({ error: 'Failed to create job' }, { status: 500 });
    }

    // Link job with categories
    const categoryLinks = selected_categories.map(categoryId => ({
      job_id: newJob.job_id,
      job_category_id: categoryId
    }));

    const { error: categoryError } = await supabase
      .from('job_category_list')
      .insert(categoryLinks);

    if (categoryError) {
      console.error('Category linking error:', categoryError);
      // Rollback job creation
      await supabase.from('job').delete().eq('job_id', newJob.job_id);
      return NextResponse.json({ error: 'Failed to link job categories' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Job created successfully',
      job_id: newJob.job_id
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
