import { NextResponse } from 'next/server';
import { supabase } from '../../../../lib/supabase';
import bcrypt from 'bcryptjs';

export async function GET(request, { params }) {
  try {
    const jobId = (await params).jobId;
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

    // Fetch job details with company_id verification
    const { data: job, error: jobError } = await supabase
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
        job_closing_date,
        job_is_active,
        company_id,
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
      .eq('job_id', jobId)
      .eq('company_id', employee.company_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found or access denied' }, { status: 404 });
    }

    // Get applicant counts
    const { data: requests, error: requestError } = await supabase
      .from('job_requests')
      .select('request_status')
      .eq('job_id', jobId);

    let applicantData = {
      applicant_count: 0,
      accepted_count: 0,
      rejected_count: 0,
      pending_count: 0
    };

    if (!requestError && requests) {
      applicantData = {
        applicant_count: requests.length,
        accepted_count: requests.filter(req => req.request_status === 'accepted').length,
        rejected_count: requests.filter(req => req.request_status === 'rejected').length,
        pending_count: requests.filter(req => req.request_status === 'pending').length
      };
    }

    return NextResponse.json({
      success: true,
      data: {
        ...job,
        ...applicantData
      }
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const jobId = (await params).jobId;
    const body = await request.json();
    const {
      accountId,
      employee_password,
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

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    if (!employee_password) {
      return NextResponse.json({ error: 'Password is required to update job posting' }, { status: 400 });
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

    // Verify job belongs to employee's company
    const { data: job, error: jobError } = await supabase
      .from('job')
      .select('company_id')
      .eq('job_id', jobId)
      .eq('company_id', employee.company_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found or access denied' }, { status: 404 });
    }

    // Update job details
    const { error: updateError } = await supabase
      .from('job')
      .update({
        job_name: job_name || job.job_name,
        job_description: job_description || job.job_description,
        job_location: job_location || job.job_location,
        job_quantity: job_quantity || job.job_quantity,
        job_requirements: job_requirements || job.job_requirements,
        job_benefits: job_benefits || job.job_benefits,
        job_type_id: job_type_id || job.job_type_id,
        job_experience_level_id: job_experience_level_id || job.job_experience_level_id,
        job_salary: job_salary || job.job_salary,
        job_time: job_time || job.job_time,
        job_closing_date: job_closing_date || job.job_closing_date
      })
      .eq('job_id', jobId);

    if (updateError) {
      console.error('Job update error:', updateError);
      return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
    }

    // Update categories if provided
    if (selected_categories && selected_categories.length > 0) {
      // First delete existing category links
      const { error: deleteError } = await supabase
        .from('job_category_list')
        .delete()
        .eq('job_id', jobId);

      if (deleteError) {
        console.error('Category deletion error:', deleteError);
        // Continue anyway, we'll try to insert new ones
      }

      // Then insert new category links
      const categoryLinks = selected_categories.map(categoryId => ({
        job_id: jobId,
        job_category_id: categoryId
      }));

      const { error: categoryError } = await supabase
        .from('job_category_list')
        .insert(categoryLinks);

      if (categoryError) {
        console.error('Category linking error:', categoryError);
        return NextResponse.json({ error: 'Failed to update job categories' }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Job updated successfully',
      job_id: jobId
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const jobId = (await params).jobId;
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
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

    // Verify job belongs to employee's company
    const { data: job, error: jobError } = await supabase
      .from('job')
      .select('company_id')
      .eq('job_id', jobId)
      .eq('company_id', employee.company_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found or access denied' }, { status: 404 });
    }

    // Delete job
    const { error: deleteError } = await supabase
      .from('job')
      .delete()
      .eq('job_id', jobId);

    if (deleteError) {
      console.error('Job deletion error:', deleteError);
      return NextResponse.json({ error: 'Failed to delete job' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Job deleted successfully',
      job_id: jobId
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const jobId = params.jobId;
    const { accountId, employee_password, action } = await request.json();

    if (!accountId || !employee_password || !action) {
      return NextResponse.json({ error: 'Account ID, password, and action are required' }, { status: 400 });
    }

    if (!['enable', 'disable', 'reactivate'].includes(action)) {
      return NextResponse.json({ error: 'Invalid action specified' }, { status: 400 });
    }

    // Step 1: Verify employee password
    const { data: accountData, error: accountError } = await supabase
      .from('account')
      .select('account_password')
      .eq('account_id', accountId)
      .single();

    if (accountError || !accountData) {
      return NextResponse.json({ error: 'Employee account not found' }, { status: 404 });
    }

    const isPasswordValid = await bcrypt.compare(employee_password, accountData.account_password);
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Step 2: Get employee's company_id
    const { data: employee, error: empError } = await supabase
      .from('employee')
      .select('company_id')
      .eq('account_id', accountId)
      .single();

    if (empError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Step 3: Verify the job belongs to the employee's company
    const { data: job, error: jobError } = await supabase
      .from('job')
      .select('company_id')
      .eq('job_id', jobId)
      .eq('company_id', employee.company_id)
      .single();

    if (jobError || !job) {
      return NextResponse.json({ error: 'Job not found or access denied' }, { status: 404 });
    }

    // Step 4: Update the job status
    const newStatus = (action === 'enable' || action === 'reactivate');
    const { error: updateError } = await supabase
      .from('job')
      .update({ job_is_active: newStatus })
      .eq('job_id', jobId);

    if (updateError) {
      console.error('Job status update error:', updateError);
      return NextResponse.json({ error: 'Failed to update job status' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: `Job ${action === 'disable' ? 'disabled' : 'enabled'} successfully.`,
      job_is_active: newStatus,
    });

  } catch (error) {
    console.error('PATCH API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
