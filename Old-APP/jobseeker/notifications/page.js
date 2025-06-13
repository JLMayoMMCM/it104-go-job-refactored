'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';

export default function JobSeekerNotificationsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [filteredNotifications, setFilteredNotifications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [error, setError] = useState('');
  const [selectedNotification, setSelectedNotification] = useState(null);
  const [showModal, setShowModal] = useState(false);

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
        if (!userData.isJobSeeker) {
          router.push('/employee/dashboard');
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
      const response = await fetch('/api/jobseeker/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setNotifications(data);
      } else {
        setError('Failed to load notifications');
      }
    } catch (error) {
      console.error('Error loading notifications:', error);
      setError('Error loading notifications');
    }
  };

  const filterNotifications = () => {
    let filtered = notifications;

    if (filter === 'unread') {
      filtered = notifications.filter(notification => !notification.is_read);
    } else if (filter === 'read') {
      filtered = notifications.filter(notification => notification.is_read);
    } else if (filter === 'applications') {
      filtered = notifications.filter(notification => 
        notification.notification_text.toLowerCase().includes('application') ||
        notification.notification_text.toLowerCase().includes('accepted') ||
        notification.notification_text.toLowerCase().includes('rejected')
      );
    } else if (filter === 'jobs') {
      filtered = notifications.filter(notification => 
        notification.notification_text.toLowerCase().includes('job') &&
        !notification.notification_text.toLowerCase().includes('application')
      );
    }

    setFilteredNotifications(filtered);
  };

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/jobseeker/notifications/mark-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notificationId })
      });

      if (response.ok) {
        await loadNotifications(token);
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/jobseeker/notifications/mark-all-read', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        await loadNotifications(token);
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const handleNotificationClick = (notification) => {
    setSelectedNotification(notification);
    setShowModal(true);
    if (!notification.is_read) {
      markAsRead(notification.notification_id);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedNotification(null);
  };

  const getNotificationIcon = (notificationText) => {
    if (notificationText.toLowerCase().includes('accepted')) {
      return '✅';
    } else if (notificationText.toLowerCase().includes('rejected')) {
      return '❌';
    } else if (notificationText.toLowerCase().includes('application')) {
      return '📨';
    } else if (notificationText.toLowerCase().includes('job')) {
      return '💼';
    }
    return '🔔';
  };

  const getNotificationType = (notificationText) => {
    if (notificationText.toLowerCase().includes('accepted')) {
      return 'Application Accepted';
    } else if (notificationText.toLowerCase().includes('rejected')) {
      return 'Application Rejected';
    } else if (notificationText.toLowerCase().includes('application')) {
      return 'Application Update';
    } else if (notificationText.toLowerCase().includes('job')) {
      return 'Job Alert';
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
                onClick={() => setFilter('applications')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'applications' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Applications
              </button>
              <button
                onClick={() => setFilter('jobs')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'jobs' ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Job Alerts
              </button>
            </div>
          </div>
        </div>

        {/* Notifications List */}
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
                onClick={() => handleNotificationClick(notification)}
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
                      {notification.notification_text.length > 100 
                        ? notification.notification_text.substring(0, 100) + '...'
                        : notification.notification_text
                      }
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Notification Modal */}
        {showModal && selectedNotification && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">
                      {getNotificationIcon(selectedNotification.notification_text)}
                    </span>
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900">
                        {getNotificationType(selectedNotification.notification_text)}
                      </h3>
                      <p className="text-sm text-gray-500">
                        {new Date(selectedNotification.notification_date).toLocaleDateString()} at{' '}
                        {new Date(selectedNotification.notification_date).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={closeModal}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Close</span>
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="mb-6">
                  <p className="text-gray-700 leading-relaxed">
                    {selectedNotification.notification_text}
                  </p>
                </div>

                <div className="flex justify-end gap-3">
                  {!selectedNotification.is_read && (
                    <button
                      onClick={() => {
                        markAsRead(selectedNotification.notification_id);
                        closeModal();
                      }}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
                    >
                      Mark as Read
                    </button>
                  )}
                  <button
                    onClick={closeModal}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
