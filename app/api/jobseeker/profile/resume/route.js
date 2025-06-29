import { NextResponse } from 'next/server';
import { createClient } from '../../../../lib/supabase';

export async function POST(request) {
  try {
    const formData = await request.formData();
    const accountId = formData.get('accountId');
    const resumeFile = formData.get('resume');

    if (!accountId || !resumeFile) {
      return NextResponse.json(
        { success: false, error: 'Account ID and resume file are required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get job seeker ID
    const { data: jobSeekerData, error: jobSeekerError } = await supabase
      .from('job_seeker')
      .select('job_seeker_id')
      .eq('account_id', accountId)
      .single();

    if (jobSeekerError || !jobSeekerData) {
      console.error('Error fetching job seeker:', jobSeekerError);
      return NextResponse.json(
        { success: false, error: 'Job seeker not found' },
        { status: 404 }
      );
    }

    // Upload resume to storage
    const fileName = `${accountId}_${Date.now()}_${resumeFile.name}`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('resumes')
      .upload(fileName, resumeFile, {
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Resume upload error:', uploadError);
      return NextResponse.json(
        { success: false, error: 'Failed to upload resume' },
        { status: 500 }
      );
    }

    // Get public URL for the uploaded file
    const { data: { publicUrl } } = supabase.storage
      .from('resumes')
      .getPublicUrl(fileName);

    // Update job_seeker table with resume URL
    const { error: updateError } = await supabase
      .from('job_seeker')
      .update({
        job_seeker_resume: publicUrl
      })
      .eq('job_seeker_id', jobSeekerData.job_seeker_id);

    if (updateError) {
      console.error('Error updating job seeker resume:', updateError);
      // Try to delete the uploaded file if update fails
      await supabase.storage.from('resumes').remove([fileName]);
      return NextResponse.json(
        { success: false, error: 'Failed to update resume information' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: {
        file_name: resumeFile.name,
        file_size: resumeFile.size,
        resume_url: publicUrl
      }
    });
  } catch (error) {
    console.error('Unexpected error in resume upload:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    // Get job seeker data to get current resume URL
    const { data: jobSeekerData, error: jobSeekerError } = await supabase
      .from('job_seeker')
      .select('job_seeker_id, job_seeker_resume')
      .eq('account_id', accountId)
      .single();

    if (jobSeekerError || !jobSeekerData) {
      console.error('Error fetching job seeker:', jobSeekerError);
      return NextResponse.json(
        { success: false, error: 'Job seeker not found' },
        { status: 404 }
      );
    }

    // If there's a resume, delete it from storage
    if (jobSeekerData.job_seeker_resume) {
      try {
        const resumeFileName = jobSeekerData.job_seeker_resume.split('/').pop().split('?')[0];
        await supabase.storage.from('resumes').remove([resumeFileName]);
      } catch (storageError) {
        console.error('Error deleting resume from storage:', storageError);
        // Continue with database update even if storage delete fails
      }
    }

    // Update job_seeker table to remove resume URL
    const { error: updateError } = await supabase
      .from('job_seeker')
      .update({
        job_seeker_resume: null
      })
      .eq('job_seeker_id', jobSeekerData.job_seeker_id);

    if (updateError) {
      console.error('Error updating job seeker resume:', updateError);
      return NextResponse.json(
        { success: false, error: 'Failed to remove resume information' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Resume removed successfully'
    });
  } catch (error) {
    console.error('Unexpected error in resume deletion:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
