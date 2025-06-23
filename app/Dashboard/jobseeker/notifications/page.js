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
      const response = await fetch(`/api/jobseeker/notifications?accountId=${accountId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch notifications');
      }

      if (data.success) {
        setNotifications(data.data.notifications);
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
      const response = await fetch(`/api/jobseeker/notifications?accountId=${accountId}&notificationId=${notificationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'markAsRead' }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to mark notification as read');
      }

      if (data.success) {
        setNotifications(notifications.map(notif => 
          notif.id === notificationId ? { ...notif, is_read: true } : notif
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
      const response = await fetch(`/api/jobseeker/notifications?accountId=${accountId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'markAllAsRead' }),
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
    
    switch (type) {
      case 'application':
        return (
          <div className={`w-8 h-8 ${bgClass} rounded-full flex items-center justify-center ${textClass}`}>
            <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
      case 'jobPosting':
        return (
          <div className={`w-8 h-8 ${bgClass} rounded-full flex items-center justify-center ${textClass}`}>
            <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
            </svg>
          </div>
        );
      default:
        return (
          <div className={`w-8 h-8 ${bgClass} rounded-full flex items-center justify-center ${textClass}`}>
            <svg className={baseClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19.5A2.5 2.5 0 01 1.5 17V12A8.5 8.5 0 0110 3.5h4A8.5 8.5 0 0122.5 12v5a2.5 2.5 0 01-2.5 2.5H4z" />
            </svg>
          </div>
        );
    }
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
            setLoading(true);
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
    <div className="w-full px-0 py-8">
      {/* Header & Filter Section */}
      <div className="bg-white dark:bg-[var(--background)] border-b border-[var(--border-color)] px-6 py-6 mb-8 flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold text-[var(--foreground)] mb-4 sm:mb-0">Notifications</h1>
        <div className="flex gap-3">
          <button
            className={`btn btn-secondary px-4 py-2 ${filter === 'unread' ? 'ring-2 ring-[var(--primary-color)]' : ''}`}
            onClick={() => setFilter('unread')}
          >
            Unread
          </button>
          <button
            className={`btn btn-secondary px-4 py-2 ${filter === 'read' ? 'ring-2 ring-[var(--primary-color)]' : ''}`}
            onClick={() => setFilter('read')}
          >
            Read
          </button>
        </div>
      </div>

      {/* Table Section */}
      <div className="card w-full overflow-hidden px-0 py-0">
        {/* Table Title */}
        <div className="flex items-center justify-between px-6 pt-6 mb-2">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">
            {filter === 'unread'
              ? `Unread Notifications (${unreadNotifications.length})`
              : `Read Notifications (${readNotifications.length})`}
          </h2>
        </div>
        {/* Notifications Table with fixed height and overflow */}
        <div className="overflow-x-auto w-full h-[420px] overflow-y-auto px-6">
          {filteredNotifications.length > 0 ? (
            <table className="w-full min-w-[900px] divide-y divide-[var(--border-color)]">
              <thead>
                <tr>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-[var(--foreground)]">Type</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-[var(--foreground)]">Title</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-[var(--foreground)]">Message</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-[var(--foreground)]">Date</th>
                  <th className="px-4 py-2 text-left text-sm font-semibold text-[var(--foreground)]">Sender</th>
                  {filter === 'unread' && <th className="px-4 py-2"></th>}
                </tr>
              </thead>
              <tbody>
                {filteredNotifications.map(notification => (
                  <tr key={notification.id} className="border-b border-[var(--border-color)] hover:bg-[var(--light-color)] transition">
                    <td className="px-4 py-3">{getNotificationIcon(notification.type, notification.is_read)}</td>
                    <td className="px-4 py-3 font-semibold">{notification.title}</td>
                    <td className="px-4 py-3">{notification.message}</td>
                    <td className="px-4 py-3">{formatDate(notification.created_at)}</td>
                    <td className="px-4 py-3">{notification.sender_name || '-'}</td>
                    {filter === 'unread' ? (
                      <td className="px-4 py-3">
                        <button
                          onClick={() => handleMarkAsRead(notification.id)}
                          className="btn btn-secondary"
                        >
                          Mark as Read
                        </button>
                      </td>
                    ) : (
                      <td className="px-4 py-3"></td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-[var(--foreground)]">
                {filter === 'unread' ? 'No unread notifications' : 'No read notifications'}
              </h3>
              <p className="mt-1 text-[var(--text-light)]">
                {filter === 'unread'
                  ? "You're all caught up! Check back later for updates."
                  : "You haven't read any notifications yet."}
              </p>
            </div>
          )}
        </div>
        {/* Mark All as Read Button - bottom right */}
        <div className="flex justify-end mt-4 pr-8 pb-6">
          <button
            onClick={unreadNotifications.length > 0 ? handleMarkAllAsRead : undefined}
            className={`btn ${unreadNotifications.length > 0 ? 'btn-primary' : 'btn-secondary opacity-60 cursor-not-allowed'}`}
            disabled={unreadNotifications.length === 0}
          >
            Mark All as Read
          </button>
        </div>
      </div>
    </div>
  );
}
