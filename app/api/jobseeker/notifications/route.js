import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Get job seeker ID
    const { data: jobSeeker, error: jsError } = await supabase
      .from('job_seeker')
      .select('job_seeker_id')
      .eq('account_id', accountId)
      .single();

    if (jsError || !jobSeeker) {
      return NextResponse.json({ error: 'Job seeker not found' }, { status: 404 });
    }

    // Get notifications for the job seeker
    const { data: notifications, error: notifError } = await supabase
      .from('jobseeker_notifications')
      .select(`
        is_read,
        notification:notifications (
          notification_id,
          notification_text,
          notification_date,
          sender:sender_account_id (
            account_username
          )
        )
      `)
      .eq('jobseeker_id', jobSeeker.job_seeker_id)
      .order('notification_date', { foreignTable: 'notifications', ascending: false });

    if (notifError) {
      console.error('Notifications fetch error:', notifError);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Process notifications
    const processedNotifications = notifications.map(n => {
      if (!n.notification) return null;
      
      const senderName = n.notification.sender?.account_username || 'System';
      let notificationType = 'general';
      const textLower = n.notification.notification_text?.toLowerCase() || '';

      if (textLower.includes('application status has been updated')) {
        notificationType = 'application_status';
      } else if (textLower.includes('new recommended job')) {
        notificationType = 'recommendation';
      }

      return {
        notification_id: n.notification.notification_id,
        notification_text: n.notification.notification_text,
        notification_date: n.notification.notification_date,
        sender_name: senderName,
        is_read: n.is_read,
        notification_type: notificationType
      };
    }).filter(Boolean);

    return NextResponse.json({
      success: true,
      data: processedNotifications
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const body = await request.json();
    const { accountId, notificationId, markAllAsRead } = body;

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Get job seeker ID
    const { data: jobSeeker, error: jsError } = await supabase
      .from('job_seeker')
      .select('job_seeker_id')
      .eq('account_id', accountId)
      .single();

    if (jsError || !jobSeeker) {
      return NextResponse.json({ error: 'Job seeker not found' }, { status: 404 });
    }

    if (markAllAsRead) {
      const { error: updateError } = await supabase
        .from('jobseeker_notifications')
        .update({ is_read: true })
        .eq('jobseeker_id', jobSeeker.job_seeker_id);

      if (updateError) {
        console.error('Mark all as read error:', updateError);
        return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'All notifications marked as read' });

    } else if (notificationId) {
      const { error: updateError } = await supabase
        .from('jobseeker_notifications')
        .update({ is_read: true })
        .eq('jobseeker_id', jobSeeker.job_seeker_id)
        .eq('notification_id', notificationId);

      if (updateError) {
        console.error('Mark as read error:', updateError);
        return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
      }

      return NextResponse.json({ success: true, message: 'Notification marked as read' });

    } else {
      return NextResponse.json({ error: 'Either notificationId or markAllAsRead is required' }, { status: 400 });
    }

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
