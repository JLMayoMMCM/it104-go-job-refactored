import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

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

    // Fetch saved jobs for the jobseeker
    const { data: savedJobs, error: savedJobsError } = await supabase
      .from('saved_jobs')
      .select(`
        saved_job_id,
        job_id,
        saved_date,
        job:job_id (
          job_name,
          job_description,
          job_location,
          job_salary,
          job_posted_date,
          job_closing_date,
          job_is_active,
          company:company_id (
            company_name,
            company_logo
          ),
          job_type:job_type_id (
            job_type_name
          ),
          experience_level:job_experience_level_id (
            experience_level_name
          )
        )
      `)
      .eq('job_seeker_id', jobSeekerId)
      .order('saved_date', { ascending: false });

    if (savedJobsError) {
      console.error('Saved jobs fetch error:', savedJobsError);
      return NextResponse.json({ success: false, error: 'Failed to fetch saved jobs' }, { status: 500 });
    }

    // Format the saved jobs data for the frontend
    const formattedSavedJobs = savedJobs?.map(saved => {
      // Calculate days since saved
      const savedDate = new Date(saved.saved_date);
      const now = new Date();
      const daysDiffSaved = Math.floor((now - savedDate) / (1000 * 60 * 60 * 24));
      let savedAgo;
      if (daysDiffSaved === 0) {
        savedAgo = 'Saved today';
      } else if (daysDiffSaved === 1) {
        savedAgo = 'Saved 1 day ago';
      } else if (daysDiffSaved < 7) {
        savedAgo = `Saved ${daysDiffSaved} days ago`;
      } else {
        const weeksDiff = Math.floor(daysDiffSaved / 7);
        savedAgo = weeksDiff === 1 ? 'Saved 1 week ago' : `Saved ${weeksDiff} weeks ago`;
      }

      // Calculate days since posted
      const postedDate = new Date(saved.job?.job_posted_date);
      const daysDiffPosted = Math.floor((now - postedDate) / (1000 * 60 * 60 * 24));
      let postedAgo;
      if (daysDiffPosted === 0) {
        postedAgo = 'Posted today';
      } else if (daysDiffPosted === 1) {
        postedAgo = 'Posted 1 day ago';
      } else if (daysDiffPosted < 7) {
        postedAgo = `Posted ${daysDiffPosted} days ago`;
      } else {
        const weeksDiff = Math.floor(daysDiffPosted / 7);
        postedAgo = weeksDiff === 1 ? 'Posted 1 week ago' : `Posted ${weeksDiff} weeks ago`;
      }

      return {
        id: saved.saved_job_id,
        jobId: saved.job_id,
        title: saved.job?.job_name || 'Unknown Job',
        company: saved.job?.company?.company_name || 'Unknown Company',
        companyLogo: saved.job?.company?.company_logo || null,
        location: saved.job?.job_location || 'Not specified',
        jobType: saved.job?.job_type?.job_type_name || 'Not specified',
        salary: saved.job?.job_salary || 'Not specified',
        experienceLevel: saved.job?.experience_level?.experience_level_name || 'Not specified',
        savedDate: savedAgo,
        postedDate: postedAgo,
        isActive: saved.job?.job_is_active || false,
        closingDate: saved.job?.job_closing_date || null,
        description: saved.job?.job_description?.substring(0, 150) + '...' || 'No description available.'
      };
    }) || [];

    return NextResponse.json({
      success: true,
      data: formattedSavedJobs
    });

  } catch (error) {
    console.error('Unexpected error fetching saved jobs:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const body = await request.json();
    const { jobId, accountId } = body;

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

    // Check if job is already saved
    const { data: existingSavedJob, error: existingError } = await supabase
      .from('saved_jobs')
      .select('saved_job_id')
      .eq('job_id', jobId)
      .eq('job_seeker_id', jobSeekerId)
      .single();

    if (existingError && existingError.code !== 'PGRST116') {
      console.error('Check existing saved job error:', existingError);
      return NextResponse.json({ success: false, error: 'Failed to check existing saved job' }, { status: 500 });
    }

    if (existingSavedJob) {
      return NextResponse.json({ success: false, error: 'Job is already saved' }, { status: 409 });
    }

    // Insert new saved job
    const { data: newSavedJob, error: insertError } = await supabase
      .from('saved_jobs')
      .insert([
        {
          job_id: jobId,
          job_seeker_id: jobSeekerId
        }
      ])
      .select('saved_job_id')
      .single();

    if (insertError) {
      console.error('Saved job insert error:', insertError);
      return NextResponse.json({ success: false, error: 'Failed to save job' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { id: newSavedJob.saved_job_id },
      message: 'Job saved successfully'
    });

  } catch (error) {
    console.error('Unexpected error saving job:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const body = await request.json();
    const { jobId, accountId } = body;

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

    // Delete saved job
    const { error: deleteError } = await supabase
      .from('saved_jobs')
      .delete()
      .eq('job_id', jobId)
      .eq('job_seeker_id', jobSeekerId);

    if (deleteError) {
      console.error('Saved job delete error:', deleteError);
      return NextResponse.json({ success: false, error: 'Failed to remove saved job' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'Job removed from saved list'
    });

  } catch (error) {
    console.error('Unexpected error removing saved job:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}
