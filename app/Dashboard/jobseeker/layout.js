'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';

export default function JobseekerLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userInfo, setUserInfo] = useState(null);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    // Check if user is logged in and is a jobseeker
    const accountType = localStorage.getItem('accountType');
    const accountId = localStorage.getItem('accountId');
    const username = localStorage.getItem('username');
    const userEmail = localStorage.getItem('userEmail');

    if (!accountId || accountType !== '2') {
      // Not logged in or not a jobseeker, redirect to login
      router.push('/Login');
      return;
    }

    setUserInfo({
      accountId,
      username,
      userEmail
    });
  }, [router]);

  const handleLogout = () => {
    // Clear all stored user data
    localStorage.removeItem('accountId');
    localStorage.removeItem('accountType');
    localStorage.removeItem('username');
    localStorage.removeItem('userEmail');
    localStorage.removeItem('authToken');
    
    // Redirect to login page
    router.push('/Login');
  };

  const navigation = [
    { name: 'Dashboard', href: '/Dashboard/jobseeker', icon: '🏠' },
    { name: 'Find Jobs', href: '/Dashboard/jobseeker/jobs/all-jobs', icon: '🔍' },
    { name: 'Recommended', href: '/Dashboard/jobseeker/jobs/recommended-jobs', icon: '💡' },
    { name: 'My Applications', href: '/Dashboard/jobseeker/applications', icon: '📋' },
    { name: 'Saved Jobs', href: '/Dashboard/jobseeker/saved-jobs', icon: '❤️' },
    { name: 'Companies', href: '/Dashboard/jobseeker/company/all', icon: '🏢' },
    { name: 'Followed Companies', href: '/Dashboard/jobseeker/company/followed', icon: '⭐' },
    { name: 'My Profile', href: '/Dashboard/jobseeker/profile', icon: '👤' },
    { name: 'Notifications', href: '/Dashboard/notifications', icon: '🔔' },
  ];

  const isCurrentPath = (href) => {
    if (href === '/Dashboard/jobseeker') {
      return pathname === href;
    }
    return pathname.startsWith(href);
  };

  if (!userInfo) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 overflow-hidden">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="flex flex-col h-full">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 px-4 bg-blue-600">
            <Image
              src="/Assets/Title.png"
              alt="GoJob"
              width={120}
              height={48}
              className="h-8 w-auto"
            />
          </div>

          {/* User info */}
          <div className="p-4 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-blue-600 font-medium text-sm">
                  {userInfo.username?.charAt(0).toUpperCase()}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {userInfo.username}
                </p>
                <p className="text-xs text-gray-500 truncate">Job Seeker</p>
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto">
            {navigation.map((item) => (
              <button
                key={item.name}
                onClick={() => {
                  router.push(item.href);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isCurrentPath(item.href)
                    ? 'bg-blue-100 text-blue-900 border-r-2 border-blue-600'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <span className="mr-3 text-lg">{item.icon}</span>
                {item.name}
              </button>
            ))}
          </nav>

          {/* Logout button */}
          <div className="p-4 border-t border-gray-200">
            <button
              onClick={handleLogout}
              className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-600 rounded-md hover:bg-red-50 transition-colors"
            >
              <span className="mr-3 text-lg">🚪</span>
              Logout
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-col flex-1 lg:ml-64">
        {/* Top navigation */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="flex items-center justify-between px-4 py-3">
            <div className="flex items-center">
              <button
                onClick={() => setSidebarOpen(true)}
                className="lg:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
              <h1 className="ml-2 text-xl font-semibold text-gray-900 lg:ml-0">
                Job Seeker Portal
              </h1>
            </div>

            <div className="flex items-center space-x-4">
              {/* Quick search */}
              <div className="hidden md:block">
                <div className="relative">
                  <input
                    type="text"
                    placeholder="Search jobs..."
                    className="w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  <svg className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>

              {/* Notifications */}
              <button 
                onClick={() => router.push('/Dashboard/notifications')}
                className="p-2 text-gray-600 hover:bg-gray-100 rounded-md relative"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19.5A2.5 2.5 0 01 1.5 17V12A8.5 8.5 0 0110 3.5h4A8.5 8.5 0 0122.5 12v5a2.5 2.5 0 01-2.5 2.5H4z" />
                </svg>
                {/* Notification badge - you can make this dynamic */}
                <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
              </button>

              {/* Profile dropdown */}
              <div className="relative">
                <button
                  onClick={() => router.push('/Dashboard/jobseeker/profile')}
                  className="flex items-center space-x-2 p-2 text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 font-medium text-xs">
                      {userInfo.username?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="hidden md:block text-sm font-medium">
                    {userInfo.username}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
