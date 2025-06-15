'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function EmployeeDashboardLayout({ children }) {
  const [employee, setEmployee] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check if user is logged in and is an employee
    const accountType = localStorage.getItem('accountType');
    const accountId = localStorage.getItem('accountId');

    if (!accountId || accountType !== '1') {
      // Not logged in or not an employee, redirect to login
      router.push('/Login');
      return;
    }

    fetchEmployeeData(accountId);
  }, [router]);

  const fetchEmployeeData = async (accountId) => {
    try {
      // Fetch employee profile data
      const profileResponse = await fetch(`/api/employee/profile?accountId=${accountId}`);
      if (profileResponse.ok) {
        const profileData = await profileResponse.json();
        if (profileData.success) {
          setEmployee({
            firstName: profileData.data.person.first_name,
            lastName: profileData.data.person.last_name,
            profilePhoto: profileData.data.account.account_profile_photo,
            companyName: profileData.data.company.company_name,
            position: profileData.data.position_name
          });
        }
      }

      // Fetch notification count
      const notificationResponse = await fetch(`/api/employee/notifications?accountId=${accountId}`);
      if (notificationResponse.ok) {
        const notificationData = await notificationResponse.json();
        if (notificationData.success) {
          const unreadCount = notificationData.data.filter(n => !n.is_read).length;
          setUnreadNotifications(unreadCount);
        }
      }
    } catch (error) {
      console.error('Error fetching employee data:', error);
    } finally {
      setLoading(false);
    }
  };

  const sidebarItems = [
    { name: 'Dashboard', href: '/Dashboard/employee', icon: 'dashboard' },
    { name: 'Profile', href: '/Dashboard/employee/profile', icon: 'profile' },
    { name: 'Add Job', href: '/Dashboard/employee/add-job', icon: 'add' },
    { name: 'Job Postings', href: '/Dashboard/employee/all-postings', icon: 'postings' },
    { name: 'Job Requests', href: '/Dashboard/employee/job-requests', icon: 'requests' },
    { name: 'Posting History', href: '/Dashboard/employee/posting-history', icon: 'history' },
    { name: 'Notifications', href: '/Dashboard/employee/notifications', icon: 'notifications', badge: unreadNotifications }
  ];

  const getIcon = (iconName) => {
    const iconClass = "w-5 h-5";
    switch (iconName) {
      case 'dashboard':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2H5a2 2 0 00-2-2z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5a2 2 0 012-2h4a2 2 0 012 2v6H8V5z" />
          </svg>
        );
      case 'profile':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'add':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
        );
      case 'postings':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
          </svg>
        );
      case 'requests':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'history':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'notifications':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19.5A2.5 2.5 0 01 1.5 17V12A8.5 8.5 0 0110 3.5h4A8.5 8.5 0 0122.5 12v5a2.5 2.5 0 01-2.5 2.5H4z" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-30">
        <div className="flex items-center justify-between px-6 py-4">
          {/* Left side - Logo */}
          <div className="flex items-center">
            <Image
              src="/Assets/Title.png"
              alt="GoJob Logo"
              width={120}
              height={40}
              className="h-10 w-auto"
              priority
            />
          </div>

          {/* Right side - User info and sidebar toggle */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-3">
              <span className="text-gray-700">
                Hello, <span className="font-semibold">{employee?.firstName} {employee?.lastName}</span>
              </span>
              <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                {employee?.profilePhoto ? (
                  <img
                    src={employee.profilePhoto}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/Assets/Logo.png'; // Fallback image if loading fails
                      console.error('Error loading profile image in header:', employee.profilePhoto);
                    }}
                  />
                ) : (
                  <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
              </div>
            </div>
            
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md text-gray-600 hover:text-gray-900 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {sidebarOpen ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                )}
              </svg>
            </button>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className={`fixed inset-y-0 left-0 z-10 w-64 bg-white border-r border-gray-200 transform ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} transition-transform duration-300 ease-in-out md:translate-x-0 md:static md:inset-auto md:w-64`}>
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
              <div className="flex items-center">
                <img src="/Assets/Logo.png" alt="Logo" className="h-8 w-auto mr-2" />
                <span className="text-xl font-bold text-gray-900">GoJob</span>
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden p-2 rounded-md text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Navigation */}
            <nav className="flex-1 overflow-y-auto p-4">
              <ul className="space-y-1">
                {sidebarItems.map((item) => (
                  <li key={item.name}>
                    <button
                      onClick={() => {
                        router.push(item.href);
                        setSidebarOpen(false);
                      }}
                      className={`flex items-center w-full px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-100 hover:text-blue-700`}
                    >
                      <div className="flex-shrink-0 w-8 text-gray-500">
                        {getIcon(item.icon)}
                      </div>
                      <span className="ml-3">{item.name}</span>
                      {item.badge > 0 && (
                        <span className="ml-auto inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 animate-pulse">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
            {/* Footer */}
            <div className="p-4 border-t border-gray-200">
              <button
                onClick={() => {
                  // Clear all stored user data
                  localStorage.removeItem('accountId');
                  localStorage.removeItem('accountType');
                  localStorage.removeItem('username');
                  localStorage.removeItem('userEmail');
                  localStorage.removeItem('authToken');
                  // Redirect to login page
                  router.push('/Login');
                }}
                className="w-full flex items-center px-3 py-2 rounded-md text-sm font-medium text-gray-700 hover:bg-red-50 hover:text-red-700"
              >
                <svg className="h-5 w-5 mr-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </aside>
        {/* Backdrop for mobile */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-0 bg-black opacity-50 md:hidden"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* Main content */}
        <main className="flex-1 md:ml-64">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
