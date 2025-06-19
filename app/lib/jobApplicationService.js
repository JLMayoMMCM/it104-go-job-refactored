// app/lib/jobApplicationService.js

import { createClient } from './supabase'; // Import the createClient function instead of direct instance

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
    // Create supabase client
    const supabase = createClient();
    
    const parsedJobId = parseInt(jobId, 10);
    const parsedJobSeekerId = parseInt(jobSeekerId, 10);
    
    if (isNaN(parsedJobId) || isNaN(parsedJobSeekerId)) {
      return { success: false, error: "Invalid jobId or jobSeekerId" };
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
