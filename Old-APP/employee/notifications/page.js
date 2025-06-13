'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';

export default function NotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  useEffect(() => {
    filterNotifications();
  }, [notifications, filter]);

  const checkAuthAndLoadData = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/Login');
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const userData = await response.json();
        if (!userData.isEmployee) {
          router.push('/jobseeker/dashboard');
          return;
        }
        setUser(userData);
        await loadNotifications(token);
      } else {
        router.push('/Login');
      }
    } catch (error) {
      router.push('/Login');
    } finally {
      setIsLoading(false);
    }
  };

  const loadNotifications = async (token) => {
    try {
      const response = await fetch('/api/employee/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
        setError(''); // Clear any previous errors
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to load notifications');
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      setError('Network error. Unable to load notifications.');
    }
  };

  const filterNotifications = () => {
    let filtered = notifications;

    if (filter === 'unread') {
      filtered = notifications.filter(notification => !notification.is_read);
    } else if (filter === 'read') {
      filtered = notifications.filter(notification => notification.is_read);
    } else if (filter === 'job-requests') {
      filtered = notifications.filter(notification => 
        notification.notification_text.toLowerCase().includes('application') ||
        notification.notification_text.toLowerCase().includes('job request')
      );
    } else if (filter === 'messages') {
      filtered = notifications.filter(notification => 
        notification.notification_text.toLowerCase().includes('message')
      );
    }

    setFilteredNotifications(filtered);
  };
  const markAsRead = async (notificationId, notificationType = 'individual') => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/employee/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notificationId, notificationType })
      });

      if (response.ok) {
        // Update local state immediately for better UX
        setNotifications(prev => 
          prev.map(notification => 
            notification.notification_id === notificationId 
              ? { ...notification, is_read: true }
              : notification
          )
        );
        // Also reload from server to ensure consistency
        await loadNotifications(token);
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to mark notification as read');
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      setError('Network error. Unable to update notification.');
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/employee/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        // Update local state immediately
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, is_read: true }))
        );
        // Also reload from server
        await loadNotifications(token);
        setError(''); // Clear any errors
      } else {
        const errorData = await response.json();
        setError(errorData.error || 'Failed to mark all notifications as read');
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      setError('Network error. Unable to update notifications.');
    }
  };

  const getNotificationIcon = (notificationText) => {
    if (notificationText.toLowerCase().includes('application') || 
        notificationText.toLowerCase().includes('job request')) {
      return '👤';
    } else if (notificationText.toLowerCase().includes('message')) {
      return '💬';
    } else if (notificationText.toLowerCase().includes('job')) {
      return '💼';
    }
    return '🔔';
  };

  const getNotificationType = (notificationText) => {
    if (notificationText.toLowerCase().includes('application') || 
        notificationText.toLowerCase().includes('job request')) {
      return 'Job Application';
    } else if (notificationText.toLowerCase().includes('message')) {
      return 'Message';
    } else if (notificationText.toLowerCase().includes('job')) {
      return 'Job Update';
    }
    return 'General';
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen text-lg">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={user} />
      
      <main className="p-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Notifications</h2>
            {notifications.filter(n => !n.is_read).length > 0 && (
              <button
                onClick={markAllAsRead}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                Mark All as Read
              </button>
            )}
          </div>
          
          {error && (
            <div className="bg-red-100 text-red-800 p-3 rounded-md mb-4 border border-red-200">
              {error}
            </div>
          )}

          {/* Filter Buttons */}
          <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            <div className="flex flex-wrap gap-2">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All ({notifications.length})
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'unread' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Unread ({notifications.filter(n => !n.is_read).length})
              </button>
              <button
                onClick={() => setFilter('read')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'read' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Read ({notifications.filter(n => n.is_read).length})
              </button>
              <button
                onClick={() => setFilter('job-requests')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'job-requests' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Job Applications
              </button>
              <button
                onClick={() => setFilter('messages')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'messages' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Messages
              </button>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-6xl mb-4">⏳</div>
            <p className="text-gray-600 text-lg">Loading notifications...</p>
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-6xl mb-4">❌</div>
            <p className="text-red-600 text-lg mb-4">{error}</p>
            <button
              onClick={() => {
                setError('');
                const token = localStorage.getItem('authToken');
                if (token) loadNotifications(token);
              }}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* Notifications List */}
        {!isLoading && !error && (
          <>
            {filteredNotifications.length === 0 ? (
              <div className="bg-white rounded-lg shadow-md p-8 text-center">
                <div className="text-6xl mb-4">🔔</div>
                <p className="text-gray-600 text-lg">No notifications found.</p>
                <p className="text-gray-500 mt-2">
                  {filter === 'all' ? 'You\'re all caught up!' : `No ${filter} notifications.`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredNotifications.map(notification => (
                  <div 
                    key={notification.notification_id} 
                    className={`bg-white rounded-lg shadow-md p-6 border-l-4 cursor-pointer transition-all hover:shadow-lg ${
                      notification.is_read 
                        ? 'border-gray-300 opacity-75' 
                        : 'border-blue-500'
                    }`}
                    onClick={() => markAsRead(notification.notification_id, notification.notification_type)}
                  >
                    <div className="flex items-start gap-4">
                      <div className="text-3xl">
                        {getNotificationIcon(notification.notification_text)}
                      </div>
                      
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <div>
                            <span className="inline-block px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800 mb-2">
                              {getNotificationType(notification.notification_text)}
                            </span>
                            {!notification.is_read && (
                              <span className="ml-2 inline-block w-2 h-2 bg-red-500 rounded-full"></span>
                            )}
                          </div>
                          <span className="text-sm text-gray-500">
                            {new Date(notification.notification_date).toLocaleDateString()} at{' '}
                            {new Date(notification.notification_date).toLocaleTimeString([], {
                              hour: '2-digit',
                              minute: '2-digit'
                            })}
                          </span>
                        </div>
                        
                        <p className={`text-gray-800 ${notification.is_read ? 'opacity-75' : 'font-medium'}`}>
                          {notification.notification_text}
                        </p>
                        
                        {notification.sender_name && (
                          <p className="text-sm text-gray-600 mt-2">
                            From: {notification.sender_name}
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {!notification.is_read && (
                      <div className="mt-4 pt-4 border-t border-gray-200">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            markAsRead(notification.notification_id, notification.notification_type);
                          }}
                          className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                        >
                          Mark as Read
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
