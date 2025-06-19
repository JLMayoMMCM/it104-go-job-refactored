import { createClient } from './supabase';
import { createNotification, NotificationTypes } from './notificationService';

export async function createJob(jobData, accountId) {
  try {
    const supabase = createClient();

    // First get the employee details
    const { data: employeeData, error: empError } = await supabase
      .from('employee')
      .select(`
        company:company_id (
          company_name
        )
      `)
      .eq('account_id', accountId)
      .single();

    if (empError) {
      console.error('Error fetching employee details:', empError);
      return { success: false, error: 'Error fetching employee details' };
    }

    // Create the job
    const { data: newJob, error: jobError } = await supabase
      .from('job')
      .insert(jobData)
      .select()
      .single();

    if (jobError) {
      console.error('Error creating job:', jobError);
      return { success: false, error: 'Error creating job posting' };
    }

    // Create notification
    try {
      await createNotification(
        accountId,
        NotificationTypes.JOB_POSTED,
        `New job posting "${newJob.job_name}" has been created`,
        newJob.job_id
      );
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // Don't fail job creation if notification fails
    }

    return { success: true, job: newJob };
  } catch (error) {
    console.error('Error in createJob:', error);
    return { success: false, error: 'Failed to create job posting' };
  }
}

export async function updateJob(jobId, jobData, accountId) {
  try {
    const supabase = createClient();

    // First get the job details to ensure it exists
    const { data: existingJob, error: fetchError } = await supabase
      .from('job')
      .select('job_name')
      .eq('job_id', jobId)
      .single();

    if (fetchError) {
      console.error('Error fetching job:', fetchError);
      return { success: false, error: 'Error fetching job details' };
    }

    // Update the job
    const { data: updatedJob, error: updateError } = await supabase
      .from('job')
      .update(jobData)
      .eq('job_id', jobId)
      .select()
      .single();

    if (updateError) {
      console.error('Error updating job:', updateError);
      return { success: false, error: 'Error updating job posting' };
    }

    // Create notification
    try {
      await createNotification(
        accountId,
        NotificationTypes.JOB_UPDATED,
        `Job posting "${updatedJob.job_name}" has been updated`,
        jobId
      );
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // Don't fail job update if notification fails
    }

    return { success: true, job: updatedJob };
  } catch (error) {
    console.error('Error in updateJob:', error);
    return { success: false, error: 'Failed to update job posting' };
  }
}

export async function toggleJobStatus(jobId, isActive, accountId) {
  try {
    const supabase = createClient();

    // First get the job details
    const { data: job, error: fetchError } = await supabase
      .from('job')
      .select('job_name')
      .eq('job_id', jobId)
      .single();

    if (fetchError) {
      console.error('Error fetching job:', fetchError);
      return { success: false, error: 'Error fetching job details' };
    }

    // Update the job status
    const { error: updateError } = await supabase
      .from('job')
      .update({ job_is_active: isActive })
      .eq('job_id', jobId);

    if (updateError) {
      console.error('Error updating job status:', updateError);
      return { success: false, error: 'Error updating job status' };
    }

    // Create notification
    const action = isActive ? 'activated' : 'deactivated';
    try {
      await createNotification(
        accountId,
        NotificationTypes.JOB_DISABLED,
        `Job posting "${job.job_name}" has been ${action}`,
        jobId
      );
    } catch (notifError) {
      console.error('Error creating notification:', notifError);
      // Don't fail status update if notification fails
    }

    return { success: true, message: `Job has been ${action}` };
  } catch (error) {
    console.error('Error in toggleJobStatus:', error);
    return { success: false, error: 'Failed to update job status' };
  }
}
