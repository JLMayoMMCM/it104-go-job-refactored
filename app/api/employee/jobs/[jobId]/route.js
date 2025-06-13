import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request, { params }) {
  try {
    const jobId = params.jobId;
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!jobId || !accountId) {
      return NextResponse.json({ error: 'Job ID and Account ID are required' }, { status: 400 });
    }

    // Verify employee has access to this job
    const { data: employee, error: empError } = await supabase
      .from('employee')
      .select('company_id')
      .eq('account_id', accountId)
      .single();

    if (empError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Get job details
    const { data: job, error } = await supabase
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
      .single();

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch job' }, { status: 500 });
    }

    if (!job) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    // Verify job belongs to employee's company
    if (job.company_id !== employee.company_id) {
      return NextResponse.json({ error: 'Unauthorized access to job' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      data: job
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request, { params }) {
  try {
    const jobId = params.jobId;
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

    if (!jobId || !accountId) {
      return NextResponse.json({ error: 'Job ID and Account ID are required' }, { status: 400 });
    }

    // Verify employee has access to this job
    const { data: employee, error: empError } = await supabase
      .from('employee')
      .select('company_id')
      .eq('account_id', accountId)
      .single();

    if (empError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Verify job exists and belongs to company
    const { data: existingJob, error: jobCheckError } = await supabase
      .from('job')
      .select('company_id')
      .eq('job_id', jobId)
      .single();

    if (jobCheckError || !existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (existingJob.company_id !== employee.company_id) {
      return NextResponse.json({ error: 'Unauthorized access to job' }, { status: 403 });
    }

    // Update job
    const { error: updateError } = await supabase
      .from('job')
      .update({
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
        job_closing_date: job_closing_date || null
      })
      .eq('job_id', jobId);

    if (updateError) {
      console.error('Job update error:', updateError);
      return NextResponse.json({ error: 'Failed to update job' }, { status: 500 });
    }

    // Update job categories if provided
    if (selected_categories && Array.isArray(selected_categories)) {
      // Remove existing category links
      const { error: deleteError } = await supabase
        .from('job_category_list')
        .delete()
        .eq('job_id', jobId);

      if (deleteError) {
        console.error('Category deletion error:', deleteError);
        return NextResponse.json({ error: 'Failed to update job categories' }, { status: 500 });
      }

      // Add new category links
      if (selected_categories.length > 0) {
        const categoryLinks = selected_categories.map(categoryId => ({
          job_id: parseInt(jobId),
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
    }

    return NextResponse.json({
      success: true,
      message: 'Job updated successfully'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PATCH(request, { params }) {
  try {
    const jobId = params.jobId;
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const action = searchParams.get('action'); // 'toggle' or 'delete'

    if (!jobId || !accountId || !action) {
      return NextResponse.json({ error: 'Job ID, Account ID, and action are required' }, { status: 400 });
    }

    // Verify employee has access to this job
    const { data: employee, error: empError } = await supabase
      .from('employee')
      .select('company_id')
      .eq('account_id', accountId)
      .single();

    if (empError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Verify job exists and belongs to company
    const { data: existingJob, error: jobCheckError } = await supabase
      .from('job')
      .select('company_id, job_is_active')
      .eq('job_id', jobId)
      .single();

    if (jobCheckError || !existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (existingJob.company_id !== employee.company_id) {
      return NextResponse.json({ error: 'Unauthorized access to job' }, { status: 403 });
    }

    if (action === 'toggle') {
      // Toggle job status
      const { error: toggleError } = await supabase
        .from('job')
        .update({
          job_is_active: !existingJob.job_is_active
        })
        .eq('job_id', jobId);

      if (toggleError) {
        console.error('Job toggle error:', toggleError);
        return NextResponse.json({ error: 'Failed to toggle job status' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: `Job ${existingJob.job_is_active ? 'disabled' : 'enabled'} successfully`,
        new_status: !existingJob.job_is_active
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    const jobId = params.jobId;
    const body = await request.json();
    const { accountId, password } = body;

    if (!jobId || !accountId || !password) {
      return NextResponse.json({ error: 'Job ID, Account ID, and password are required' }, { status: 400 });
    }

    // Verify password
    const { data: account, error: authError } = await supabase
      .from('account')
      .select('account_password')
      .eq('account_id', accountId)
      .single();

    if (authError || !account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    if (account.account_password !== password) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    // Verify employee has access to this job
    const { data: employee, error: empError } = await supabase
      .from('employee')
      .select('company_id')
      .eq('account_id', accountId)
      .single();

    if (empError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Verify job exists and belongs to company
    const { data: existingJob, error: jobCheckError } = await supabase
      .from('job')
      .select('company_id')
      .eq('job_id', jobId)
      .single();

    if (jobCheckError || !existingJob) {
      return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    }

    if (existingJob.company_id !== employee.company_id) {
      return NextResponse.json({ error: 'Unauthorized access to job' }, { status: 403 });
    }

    // Delete job (this will cascade delete related records due to foreign key constraints)
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
      message: 'Job deleted successfully'
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
