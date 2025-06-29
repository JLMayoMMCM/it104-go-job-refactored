'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('unread'); // 'unread' or 'read'
  const router = useRouter();

  useEffect(() => {
    const accountId = localStorage.getItem('accountId');
    if (!accountId) {
      router.push('/Login');
      return;
    }
    
    fetchNotifications(accountId);
  }, [router]);

  const fetchNotifications = async (accountId) => {
    try {
      setLoading(true);
      const response = await fetch(`/api/employee/notifications?accountId=${accountId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch notifications');
      }

      if (data.success) {
        setNotifications(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (notificationId) => {
    try {
      const accountId = localStorage.getItem('accountId');
      const response = await fetch(`/api/employee/notifications`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId, notificationId }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark notification as read');
      }

      if (data.success) {
        setNotifications(notifications.map(notif => 
          notif.notification_id === notificationId ? { ...notif, is_read: true } : notif
        ));
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      setError(error.message);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const accountId = localStorage.getItem('accountId');
      const response = await fetch(`/api/employee/notifications`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ accountId, markAllAsRead: true }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark all notifications as read');
      }

      if (data.success) {
        setNotifications(notifications.map(notif => ({ ...notif, is_read: true })));
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      setError(error.message);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNotificationIcon = (type, isRead) => {
    const baseClass = "w-5 h-5";
    const bgClass = isRead ? "bg-[var(--text-light)]" : "bg-[var(--primary-color)]";
    const textClass = "text-white";
    
    let icon;
    switch (type) {
      case 'job_added':
        icon = (
          <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        );
        break;
      case 'job_request':
        icon = (
          <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
        break;
      default:
        icon = (
          <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19.5A2.5 2.5 0 01 1.5 17V12A8.5 8.5 0 0110 3.5h4A8.5 8.5 0 0122.5 12v5a2.5 2.5 0 01-2.5 2.5H4z" />
          </svg>
        );
    }
    
    return (
      <div className={`w-8 h-8 ${bgClass} rounded-full flex items-center justify-center ${textClass}`}>
        {icon}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-[var(--foreground)]">Error loading notifications</h3>
        <p className="text-[var(--text-light)]">{error}</p>
        <button
          onClick={() => {
            fetchNotifications(localStorage.getItem('accountId'));
          }}
          className="btn btn-primary mt-4"
        >
          Try Again
        </button>
      </div>
    );
  }

  const unreadNotifications = notifications.filter(notif => !notif.is_read);
  const readNotifications = notifications.filter(notif => notif.is_read);
  const filteredNotifications = filter === 'unread' ? unreadNotifications : readNotifications;

  return (
    <div className="w-full min-h-screen bg-[var(--background)]">
      {/* Header & Filter Section */}
      <div className="w-full bg-[var(--card-background)] border-b border-[var(--border-color)] shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--foreground)]">Company Notifications</h1>
            <div className="flex gap-3">
              <button
                className={`flex-1 sm:flex-none px-4 py-2 rounded-md border border-[var(--border-color)] bg-[var(--card-background)] text-[var(--text-dark)] hover:bg-[var(--background)] transition-colors duration-200 ${
                  filter === 'unread' ? 'ring-2 ring-[var(--primary-color)] text-[var(--primary-color)]' : ''
                }`}
                onClick={() => setFilter('unread')}
              >
                Unread
              </button>
              <button
                className={`flex-1 sm:flex-none px-4 py-2 rounded-md border border-[var(--border-color)] bg-[var(--card-background)] text-[var(--text-dark)] hover:bg-[var(--background)] transition-colors duration-200 ${
                  filter === 'read' ? 'ring-2 ring-[var(--primary-color)] text-[var(--primary-color)]' : ''
                }`}
                onClick={() => setFilter('read')}
              >
                Read
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Content Section */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-[var(--card-background)] rounded-lg shadow overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-color)]">
            <h2 className="text-lg sm:text-xl font-semibold text-[var(--foreground)]">
              {filter === 'unread'
                ? `Unread Notifications (${unreadNotifications.length})`
                : `Read Notifications (${readNotifications.length})`}
            </h2>
            {filter === 'unread' && unreadNotifications.length > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-sm text-[var(--primary-color)] hover:text-[var(--primary-color-hover)] transition-colors duration-200"
              >
                Mark All as Read
              </button>
            )}
          </div>

          <div className="divide-y divide-[var(--border-color)]">
            {filteredNotifications.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-[var(--text-light)]">
                  {filter === 'unread' ? 'No unread notifications' : 'No read notifications'}
                </p>
              </div>
            ) : (
              filteredNotifications.map((notification) => (
                <div key={notification.notification_id} className="flex items-start gap-4 px-6 py-4 hover:bg-[var(--background)] transition-colors duration-200">
                  {getNotificationIcon(notification.notification_type, notification.is_read)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)]">{notification.notification_text}</p>
                    <p className="mt-1 text-xs text-[var(--text-light)]">
                      From: {notification.sender_name}
                    </p>
                    <p className="mt-1 text-xs text-[var(--text-light)]">{formatDate(notification.notification_date)}</p>
                  </div>
                  {!notification.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(notification.notification_id)}
                      className="flex-shrink-0 text-sm text-[var(--primary-color)] hover:text-[var(--primary-color-hover)] transition-colors duration-200"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
