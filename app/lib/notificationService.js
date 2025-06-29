import { createClient } from './supabase';

export const NotificationTypes = {
  // Jobseeker notifications
  JOB_APPLICATION: 'job_application',
  FOLLOW_COMPANY: 'follow_company',
  UNFOLLOW_COMPANY: 'unfollow_company',
  PROFILE_UPDATE: 'profile_update',
  APPLICATION_STATUS: 'application_status',

  // Employee notifications
  JOB_POSTED: 'job_posted',
  JOB_UPDATED: 'job_updated',
  JOB_DISABLED: 'job_disabled',
  NEW_APPLICANT: 'new_applicant',
  APPLICANT_UPDATED: 'applicant_updated'
};

export async function createNotification(accountId, type, message, referenceId = null) {
  const supabase = createClient();

  try {
    // First, create the base notification
    const { data: notification, error: notificationError } = await supabase
      .from('notifications')
      .insert({
        notification_text: message,
        sender_account_id: accountId
      })
      .select()
      .single();

    if (notificationError) {
      throw notificationError;
    }

    // Determine if this is for a jobseeker or employee
    const { data: jobseeker, error: jobseekerError } = await supabase
      .from('job_seeker')
      .select('job_seeker_id')
      .eq('account_id', accountId)
      .single();

    if (!jobseekerError && jobseeker) {
      // This is a jobseeker notification
      const { error: jobseekerNotifError } = await supabase
        .from('jobseeker_notifications')
        .insert({
          notification_id: notification.notification_id,
          jobseeker_id: jobseeker.job_seeker_id,
          is_read: false
        });

      if (jobseekerNotifError) {
        throw jobseekerNotifError;
      }
    } else {
      // This is an employee notification
      const { data: employee, error: employeeError } = await supabase
        .from('employee')
        .select('employee_id, company_id')
        .eq('account_id', accountId)
        .single();

      if (!employeeError && employee) {
        // Create company notification first
        const { data: companyNotif, error: companyNotifError } = await supabase
          .from('company_notifications')
          .insert({
            notification_id: notification.notification_id,
            company_id: employee.company_id
          })
          .select()
          .single();

        if (companyNotifError) {
          throw companyNotifError;
        }

        // Then create employee notification
        const { error: employeeNotifError } = await supabase
          .from('employee_notifications')
          .insert({
            company_notification_id: companyNotif.company_notification_id,
            employee_id: employee.employee_id,
            is_read: false
          });

        if (employeeNotifError) {
          throw employeeNotifError;
        }
      }
    }

    return { success: true, notification };
  } catch (error) {
    console.error('Error creating notification:', error);
    throw error;
  }
}

export async function markNotificationAsRead(notificationId) {
  try {
    const response = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        notificationId,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to mark notification as read');
    }

    return await response.json();
  } catch (error) {
    console.error('Error marking notification as read:', error);
    throw error;
  }
}

export function getNotificationMessage(type, data) {
  switch (type) {
    // Jobseeker notifications
    case NotificationTypes.JOB_APPLICATION:
      return `You have applied for ${data.jobTitle} at ${data.company}`;
    case NotificationTypes.FOLLOW_COMPANY:
      return `You are now following ${data.company}`;
    case NotificationTypes.UNFOLLOW_COMPANY:
      return `You have unfollowed ${data.company}`;
    case NotificationTypes.PROFILE_UPDATE:
      return 'Your profile has been successfully updated';
    case NotificationTypes.APPLICATION_STATUS:
      return `Your application for ${data.jobTitle} at ${data.company} has been ${data.status}`;

    // Employee notifications
    case NotificationTypes.JOB_POSTED:
      return `New job posting "${data.jobTitle}" has been created`;
    case NotificationTypes.JOB_UPDATED:
      return `Job posting "${data.jobTitle}" has been updated`;
    case NotificationTypes.JOB_DISABLED:
      return `Job posting "${data.jobTitle}" has been ${data.action}`;
    case NotificationTypes.NEW_APPLICANT:
      return `New application received for ${data.jobTitle} from ${data.applicant}`;
    case NotificationTypes.APPLICANT_UPDATED:
      return `Application status for ${data.jobTitle} has been updated to ${data.status}`;
    default:
      return 'New notification';
  }
}
