import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Get employee and company data
    const { data: employee, error: empError } = await supabase
      .from('employee')
      .select('employee_id, company_id')
      .eq('account_id', accountId)
      .single();

    if (empError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    // Get company notifications
    const { data: notifications, error: notifError } = await supabase
      .from('company_notifications')
      .select(`
        company_notification_id,
        notification_text,
        notification_date,
        sender_account: sender_account_id (
          account_username
        )
      `)
      .eq('company_id', employee.company_id)
      .order('notification_date', { ascending: false });

    if (notifError) {
      console.error('Notifications fetch error:', notifError);
      return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
    }

    // Get read status for this employee
    let { data: readStatus, error: readError } = await supabase
      .from('employee_company_notification_read')
      .select('company_notification_id, is_read')
      .eq('employee_id', employee.employee_id);

    if (readError) {
      console.error('Read status fetch error:', readError);
      // Continue with all notifications marked as unread instead of failing
      readStatus = [];
    }

    // Process notifications with read status and sender name
    const processedNotifications = notifications.map(notification => {
      const readEntry = readStatus.find(r => r.company_notification_id === notification.company_notification_id);
      const senderName = notification.sender_account?.account_username || 'System';
      
      // Extract notification type from text if needed (this is a simple heuristic)
      let notificationType = 'general';
      const textLower = notification.notification_text?.toLowerCase() || '';
      if (textLower.includes('job posting') && textLower.includes('added')) {
        notificationType = 'job_added';
      } else if (textLower.includes('applied') || textLower.includes('application')) {
        notificationType = 'job_request';
      } else if (textLower.includes('job posting') && textLower.includes('updated')) {
        notificationType = 'job_edited';
      } else if (textLower.includes('accepted') || textLower.includes('rejected')) {
        notificationType = 'job_request_response';
      }
      
      return {
        company_notification_id: notification.company_notification_id,
        notification_text: notification.notification_text,
        notification_date: notification.notification_date,
        sender_name: senderName,
        is_read: readEntry ? readEntry.is_read : false,
        notification_type: notificationType
      };
    });

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

    // Get employee data
    const { data: employee, error: empError } = await supabase
      .from('employee')
      .select('company_id, employee_id')
      .eq('account_id', accountId)
      .single();

    if (empError || !employee) {
      return NextResponse.json({ error: 'Employee not found' }, { status: 404 });
    }

    if (markAllAsRead) {
      // Mark all company notifications as read for this employee
      const { data: companyNotifications, error: notifError } = await supabase
        .from('company_notifications')
        .select('company_notification_id')
        .eq('company_id', employee.company_id);

      if (notifError) {
        console.error('Notifications fetch error:', notifError);
        return NextResponse.json({ error: 'Failed to fetch notifications' }, { status: 500 });
      }

      // Upsert read status for all notifications
      const readRecords = companyNotifications.map(notif => ({
        employee_id: employee.employee_id,
        company_notification_id: notif.company_notification_id,
        is_read: true
      }));

      if (readRecords.length > 0) {
        const { error: upsertError } = await supabase
          .from('employee_company_notification_read')
          .upsert(readRecords, {
            onConflict: 'employee_id,company_notification_id'
          });

        if (upsertError) {
          console.error('Read status update error:', upsertError);
          return NextResponse.json({ error: 'Failed to mark notifications as read' }, { status: 500 });
        }
      }

      return NextResponse.json({
        success: true,
        message: 'All notifications marked as read'
      });

    } else if (notificationId) {
      // Mark specific notification as read
      const { error: upsertError } = await supabase
        .from('employee_company_notification_read')
        .upsert({
          employee_id: employee.employee_id,
          company_notification_id: notificationId,
          is_read: true
        }, {
          onConflict: 'employee_id,company_notification_id'
        });

      if (upsertError) {
        console.error('Read status update error:', upsertError);
        return NextResponse.json({ error: 'Failed to mark notification as read' }, { status: 500 });
      }

      return NextResponse.json({
        success: true,
        message: 'Notification marked as read'
      });

    } else {
      return NextResponse.json({ error: 'Either notificationId or markAllAsRead is required' }, { status: 400 });
    }

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
