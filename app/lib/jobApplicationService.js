// app/lib/jobApplicationService.js

import { createClient } from './supabase';
import { createNotification, NotificationTypes } from './notificationService';

const REJECTED_STATUS_ID = 3; // ID 3 is for "Rejected" status in application_progress table

/**
 * Applies for a job.
 * If a previous application exists for the same job and it was rejected,
 * the function allows a re-application by incrementing the attempt_number.
 * Existing applications are preserved.
 *
 * @param {number} jobId - The ID of the job.
 * @param {number} jobSeekerId - The ID of the job seeker.
 * @param {string} [coverLetter=null] - Optional cover letter for the application.
 * @returns {Promise<object>} - Returns the newly created application record or an error object.
 */
export async function applyForJob(jobId, jobSeekerId, coverLetter = null) {
  try {
    const supabase = createClient();
    
    const parsedJobId = parseInt(jobId, 10);
    const parsedJobSeekerId = parseInt(jobSeekerId, 10);
    
    if (isNaN(parsedJobId) || isNaN(parsedJobSeekerId)) {
      return { success: false, error: "Invalid jobId or jobSeekerId" };
    }
    
    // First, get the job and company details for notifications
    const { data: jobData, error: jobError } = await supabase
      .from('job')
      .select(`
        job_id,
        job_name,
        company:company_id (
          company_id,
          company_name,
          employee:employee (
            account_id
          )
        )
      `)
      .eq('job_id', parsedJobId)
      .single();

    if (jobError || !jobData) {
      console.error('Error fetching job details:', jobError);
      return { success: false, error: 'Error fetching job details' };
    }

    // Get jobseeker's account_id and name for notifications
    const { data: seekerData, error: seekerError } = await supabase
      .from('job_seeker')
      .select(`
        account_id,
        person:person_id (
          first_name,
          last_name
        )
      `)
      .eq('job_seeker_id', parsedJobSeekerId)
      .single();

    if (seekerError || !seekerData) {
      console.error('Error fetching job seeker details:', seekerError);
      return { success: false, error: 'Error fetching job seeker details' };
    }

    // Fetch previous applications for the specified job and job seeker, ordered by attempt_number descending
    const { data: previousApps, error: queryError } = await supabase
      .from('job_requests')
      .select('attempt_number, request_status_id')
      .eq('job_id', parsedJobId)
      .eq('job_seeker_id', parsedJobSeekerId)
      .order('attempt_number', { ascending: false });

    if (queryError) {
      console.error('Error querying previous applications:', queryError);
      return { 
        success: false, 
        error: `Error querying previous applications: ${queryError.message}` 
      };
    }

    let nextAttempt = 1;
    if (previousApps && previousApps.length > 0) {
      const lastApp = previousApps[0];
      
      // Allow re-application only if the most recent application was rejected
      if (lastApp.request_status_id !== REJECTED_STATUS_ID) {
        return { 
          success: false, 
          error: 'Re-application allowed only after a rejection.' 
        };
      }
      
      nextAttempt = lastApp.attempt_number + 1;
    }

    // Insert a new application record with the computed attempt_number and default status
    const { data: newApplication, error: insertError } = await supabase
      .from('job_requests')
      .insert({
        job_id: parsedJobId,
        job_seeker_id: parsedJobSeekerId,
        cover_letter: coverLetter,
        attempt_number: nextAttempt,
        request_status_id: 2 // Default to "In-progress" status (2 = pending)
      })
      .select()
      .single();

    if (insertError) {
      console.error('Database insertion error:', insertError);
      return { 
        success: false, 
        error: `Error inserting new application: ${insertError.message}` 
      };
    }

    if (!newApplication) {
      return { 
        success: false, 
        error: 'Failed to create application - no data returned' 
      };
    }

    // Create notifications for both jobseeker and employee
    try {
      // Notification for job seeker (confirmation)
      await createNotification(
        seekerData.account_id,
        NotificationTypes.JOB_APPLICATION,
        `You have applied for ${jobData.job_name} at ${jobData.company.company_name}`,
        newApplication.request_id
      );

      // Notification for employee (new applicant)
      const employeeAccountIds = jobData.company?.employee?.map(emp => emp.account_id) || [];
      for (const employeeAccountId of employeeAccountIds) {
        if (employeeAccountId) {
          await createNotification(
            employeeAccountId,
            NotificationTypes.NEW_APPLICANT,
            `New application received for ${jobData.job_name} from ${seekerData.person.first_name} ${seekerData.person.last_name}`,
            newApplication.request_id
          );
        }
      }
    } catch (notifError) {
      console.error('Error creating notifications:', notifError);
      // Don't fail the application if notifications fail
    }

    return { 
      success: true, 
      application: newApplication,
      message: 'Application submitted successfully'
    };
  } catch (error) {
    console.error('Unexpected error in applyForJob:', error);
    return {
      success: false,
      error: `Unexpected error: ${error.message}`
    };
  }
}

/**
 * Updates the status of a job application and sends appropriate notifications
 */
export async function updateApplicationStatus(applicationId, newStatusId, message = '') {
  try {
    const supabase = createClient();

    // First get the application details with related information
    const { data: application, error: appError } = await supabase
      .from('job_requests')
      .select(`
        request_id,
        job_seeker:job_seeker_id (
          account_id,
          person:person_id (
            first_name,
            last_name
          )
        ),
        job:job_id (
          job_name,
          company:company_id (
            company_name,
            employee:employee (
              account_id
            )
          )
        )
      `)
      .eq('request_id', applicationId)
      .single();

    if (appError) {
      console.error('Error fetching application details:', appError);
      return { success: false, error: 'Error fetching application details' };
    }

    // Update the application status
    const { error: updateError } = await supabase
      .from('job_requests')
      .update({ 
        request_status_id: newStatusId,
        response_message: message,
        response_date: new Date().toISOString()
      })
      .eq('request_id', applicationId);

    if (updateError) {
      console.error('Error updating application status:', updateError);
      return { success: false, error: 'Error updating application status' };
    }

    // Determine status text for notifications
    let statusText = '';
    switch (newStatusId) {
      case 1:
        statusText = 'accepted';
        break;
      case 3:
        statusText = 'rejected';
        break;
      default:
        statusText = 'updated';
    }

    // Create notifications
    try {
      // Notification for job seeker
      await createNotification(
        application.job_seeker.account_id,
        NotificationTypes.APPLICATION_STATUS,
        `Your application for ${application.job.job_name} at ${application.job.company.company_name} has been ${statusText}`,
        applicationId
      );

      // Notification for employee/company
      const employeeAccountId = application.job.company?.employee?.account_id;
      if (employeeAccountId) {
        await createNotification(
          employeeAccountId,
          NotificationTypes.APPLICANT_UPDATED,
          `Application status for ${application.job.job_name} has been updated to ${statusText}`,
          applicationId
        );
      }
    } catch (notifError) {
      console.error('Error creating notifications:', notifError);
      // Don't fail the status update if notifications fail
    }

    return {
      success: true,
      message: `Application status successfully updated to ${statusText}`
    };
  } catch (error) {
    console.error('Error in updateApplicationStatus:', error);
    return { success: false, error: 'Failed to update application status' };
  }
}
