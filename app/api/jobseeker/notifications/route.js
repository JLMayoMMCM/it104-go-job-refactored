import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase';

export async function GET(request) {
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

    // Get jobseeker ID from account ID
    const { data: jobseekerData, error: jobseekerError } = await supabase
      .from('job_seeker')
      .select('job_seeker_id')
      .eq('account_id', accountId)
      .single();

    if (jobseekerError || !jobseekerData) {
      console.log('Jobseeker not found for account ID:', accountId);
      // Return empty notifications as a fallback instead of erroring out
      return NextResponse.json({
        success: true,
        data: {
          unread_count: 0,
          notifications: []
        }
      });
    }

    const jobseekerId = jobseekerData.job_seeker_id;

    // Fetch unread notifications count - using notifications table as per schema
    const { count: unreadCount, error: unreadError } = await supabase
      .from('notifications')
      .select('*', { count: 'exact' })
      .eq('account_id', accountId)
      .eq('is_read', false);

    if (unreadError) {
      console.error('Error fetching unread notifications count:', unreadError);
      // Return empty notifications as a fallback instead of erroring out
      return NextResponse.json({
        success: true,
        data: {
          unread_count: 0,
          notifications: []
        }
      });
    }

    // Fetch notifications (limited to 50 for performance) - using notifications table
    const { data: notificationsData, error: notificationsError } = await supabase
      .from('notifications')
      .select(`
        notification_id,
        notification_text,
        is_read,
        notification_date
      `)
      .eq('account_id', accountId)
      .order('notification_date', { ascending: false })
      .limit(50);

    if (notificationsError) {
      console.error('Error fetching notifications:', notificationsError);
      // Return empty notifications as a fallback instead of erroring out
      return NextResponse.json({
        success: true,
        data: {
          unread_count: unreadCount || 0,
          notifications: []
        }
      });
    }

    // Format notifications - mapping notification_text to title and message
    const notifications = notificationsData.map(notification => ({
      id: notification.notification_id,
      title: notification.notification_text.split('\n')[0] || notification.notification_text,
      message: notification.notification_text,
      type: 'general', // Default type since schema doesn't specify
      is_read: notification.is_read,
      created_at: notification.notification_date,
      job_request: null // Not available in current schema structure
    }));

    return NextResponse.json({
      success: true,
      data: {
        unread_count: unreadCount || 0,
        notifications: notifications
      }
    });
  } catch (error) {
    console.error('Error in jobseeker notifications API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
