'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Pagination from '../../../components/Pagination';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('unread'); // 'unread' or 'read'
  const [accountId, setAccountId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const router = useRouter();
  const notificationsPerPage = 10;

  useEffect(() => {
    const storedAccountId = typeof window !== 'undefined' ? localStorage.getItem('accountId') : null;
    if (!storedAccountId) {
      router.push('/Login');
      return;
    }
    setAccountId(storedAccountId);
    fetchNotifications(storedAccountId);
  }, [router]);

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

  const fetchNotifications = async (accountId) => {
    try {
      const response = await fetch(`/api/jobseeker/notifications?accountId=${accountId}`);
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
      if (!accountId) {
        router.push('/Login');
        return;
      }
      const response = await fetch(`/api/jobseeker/notifications`, {
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
        setNotifications(prev => prev.map(notif => 
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
      if (!accountId) {
        router.push('/Login');
        return;
      }
      const response = await fetch(`/api/jobseeker/notifications`, {
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
        setNotifications(prev => prev.map(notif => ({ ...notif, is_read: true })));
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      setError(error.message);
    }
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo(0, 0); // Scroll to top on page change
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'No date';
    const dateObj = new Date(dateString);
    if (isNaN(dateObj.getTime())) return 'No date';
    return dateObj.toLocaleDateString('en-US', {
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

  // Calculate pagination
  const totalItems = filteredNotifications.length;
  const totalPagesCount = Math.ceil(totalItems / notificationsPerPage);
  const startIndex = (currentPage - 1) * notificationsPerPage;
  const endIndex = startIndex + notificationsPerPage;
  const currentNotifications = filteredNotifications.slice(startIndex, endIndex);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="profile-header">
        <h1 className="text-2xl sm:text-3xl font-bold text-white">Notifications</h1>
        <p className="text-white/80 mt-1">Stay updated with your job applications and new opportunities.</p>
      </div>

      {/* Filter Section */}
      <div className="card p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex gap-3">
            <button
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md border border-[var(--border-color)] bg-[var(--card-background)] text-[var(--text-dark)] hover:bg-[var(--background)] transition-colors duration-200 ${
                filter === 'unread' ? 'ring-2 ring-[var(--primary-color)] text-[var(--primary-color)]' : ''
              }`}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadNotifications.length})
            </button>
            <button
              className={`flex-1 sm:flex-none px-4 py-2 rounded-md border border-[var(--border-color)] bg-[var(--card-background)] text-[var(--text-dark)] hover:bg-[var(--background)] transition-colors duration-200 ${
                filter === 'read' ? 'ring-2 ring-[var(--primary-color)] text-[var(--primary-color)]' : ''
              }`}
              onClick={() => setFilter('read')}
            >
              Read ({readNotifications.length})
            </button>
          </div>
          {filter === 'unread' && unreadNotifications.length > 0 && (
            <button
              onClick={handleMarkAllAsRead}
              className="btn btn-secondary"
            >
              Mark All as Read
            </button>
          )}
        </div>
      </div>

      {/* Notifications List */}
      <div className="card">
        <div className="p-4 sm:p-6 w-full">
          <div className="flex justify-between items-center mb-4">
            <div className="text-sm text-[var(--text-light)]">
              Showing {currentNotifications.length} of {totalItems} notifications
            </div>
            {filteredNotifications.length > 0 && (
              <div className="text-sm text-[var(--text-light)]">
                Page {currentPage} of {totalPagesCount}
              </div>
            )}
          </div>

          {filteredNotifications.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-[var(--text-light)]">
                {filter === 'unread' ? 'No unread notifications' : 'No read notifications'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 h-[65vh] w-full overflow-y-auto pr-2 scrollbar-hide">
              {currentNotifications.map((notification) => (
                <div 
                  key={notification.notification_id} 
                  className="flex items-start gap-4 p-4 bg-[var(--background)] border border-[var(--border-color)] rounded-lg hover:shadow-md transition-all"
                >
                  {getNotificationIcon(notification.notification_type, notification.is_read)}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)]">{notification.notification_text}</p>
                    <p className="mt-1 text-xs text-[var(--text-light)]">From: {notification.sender_name}</p>
                    <p className="mt-1 text-xs text-[var(--text-light)]">{formatDate(notification.notification_date)}</p>
                  </div>
                  {!notification.is_read && (
                    <button
                      onClick={() => handleMarkAsRead(notification.notification_id)}
                      className="btn btn-secondary text-sm"
                    >
                      Mark as Read
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* Pagination */}
          {filteredNotifications.length > 0 && (
            <div className="mt-6">
              <Pagination
                currentPage={currentPage}
                totalPages={totalPagesCount}
                onPageChange={handlePageChange}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
