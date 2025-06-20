'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="profile-header flex flex-col sm:flex-row justify-between items-center mb-4">
        <div>
          <h1 className="text-heading">Notifications</h1>
          <p className="text-description">View updates and alerts</p>
        </div>
        {unreadNotifications.length > 0 && (
          <button
            onClick={handleMarkAllAsRead}
            className="btn btn-primary"
          >
            Mark All as Read
          </button>
        )}
      </div>

      {/* Unread Notifications */}
      <div className="card overflow-hidden">
        <div className="panel-header text-white">
          <h3 className="text-heading">Unread Notifications ({unreadNotifications.length})</h3>
        </div>
        <div className="p-6">
          {unreadNotifications.length > 0 ? (
            <div className="space-y-4">
              {unreadNotifications.map(notification => (
                <div key={notification.id} className="border border-[var(--primary-color)] rounded-xl p-6 bg-[var(--card-background)] text-[var(--foreground)] hover:shadow-lg transition-all duration-200 dark:bg-[var(--background)] dark:text-[var(--text-light)]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getNotificationIcon(notification.type, false)}
                        <h4 className="text-lg font-semibold text-[var(--foreground)]">{notification.title}</h4>
                      </div>
                      <div className="flex items-center space-x-6 text-sm text-[var(--text-light)] mb-3">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{formatDate(notification.created_at)}</span>
                        </div>
                        {notification.sender_name && (
                          <div className="flex items-center space-x-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>From: {notification.sender_name}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[var(--foreground)]">{notification.message}</p>
                    </div>
                    <div className="ml-4">
                      <button
                        onClick={() => handleMarkAsRead(notification.id)}
                        className="btn btn-secondary"
                      >
                        Mark as Read
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-[var(--foreground)]">No unread notifications</h3>
              <p className="mt-1 text-[var(--text-light)]">You're all caught up! Check back later for updates.</p>
            </div>
          )}
        </div>
      </div>

      {/* Read Notifications */}
      <div className="card overflow-hidden">
        <div className="panel-header text-white">
          <h3 className="text-heading">Read Notifications ({readNotifications.length})</h3>
        </div>
        <div className="p-6">
          {readNotifications.length > 0 ? (
            <div className="space-y-4">
              {readNotifications.map(notification => (
                <div key={notification.id} className="border border-[var(--primary-color)] rounded-xl p-6 bg-[var(--card-background)] text-[var(--foreground)] hover:shadow-lg transition-all duration-200 dark:bg-[var(--background)] dark:text-[var(--text-light)]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        {getNotificationIcon(notification.type, true)}
                        <h4 className="text-lg font-medium text-[var(--foreground)]">{notification.title}</h4>
                      </div>
                      <div className="flex items-center space-x-6 text-sm text-[var(--text-light)] mb-3">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{formatDate(notification.created_at)}</span>
                        </div>
                        {notification.sender_name && (
                          <div className="flex items-center space-x-1">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>From: {notification.sender_name}</span>
                          </div>
                        )}
                      </div>
                      <p className="text-[var(--foreground)]">{notification.message}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-[var(--foreground)]">No read notifications</h3>
              <p className="mt-1 text-[var(--text-light)]">You haven't read any notifications yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
