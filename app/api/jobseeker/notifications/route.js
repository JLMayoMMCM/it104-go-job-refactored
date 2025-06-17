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
        notification_date,
        sender_account: sender_account_id (
          account_username
        )
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
    const notifications = notificationsData.map(notification => {
      let type = 'general';
      const text = notification.notification_text.toLowerCase();
      const senderName = notification.sender_account?.account_username || 'System';
      
      if (text.includes('application') || text.includes('applied') || text.includes('accept') || text.includes('reject')) {
        type = 'application';
      } else if (text.includes('new job') || text.includes('posted') || text.includes('position')) {
        type = 'jobPosting';
      }
      
      return {
        id: notification.notification_id,
        title: notification.notification_text.split('\n')[0] || notification.notification_text,
        message: notification.notification_text,
        type: type,
        is_read: notification.is_read,
        created_at: notification.notification_date,
        sender_name: senderName,
        job_request: null // Not available in current schema structure
      };
    });

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

export async function PUT(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const notificationId = searchParams.get('notificationId');
    const body = await request.json();
    const { action } = body;

    if (!accountId) {
      return NextResponse.json(
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      );
    }

    if (!action || !['markAsRead', 'markAllAsRead'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action specified' },
        { status: 400 }
      );
    }

    const supabase = createClient();

    if (action === 'markAsRead') {
      if (!notificationId) {
        return NextResponse.json(
          { success: false, error: 'Notification ID is required for markAsRead action' },
          { status: 400 }
        );
      }

      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('account_id', accountId)
        .eq('notification_id', notificationId)
        .eq('is_read', false);

      if (updateError) {
        console.error('Error marking notification as read:', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to mark notification as read' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'Notification marked as read'
      });
    } else if (action === 'markAllAsRead') {
      const { error: updateError } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('account_id', accountId)
        .eq('is_read', false);

      if (updateError) {
        console.error('Error marking all notifications as read:', updateError);
        return NextResponse.json(
          { success: false, error: 'Failed to mark all notifications as read' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read'
      });
    }
  } catch (error) {
    console.error('Error in jobseeker notifications update API:', error);
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    );
  }
}
