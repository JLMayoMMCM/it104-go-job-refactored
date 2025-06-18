'use client';

import { useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Image from 'next/image';

export default function JobseekerLayout({ children }) {
  const [jobseeker, setJobseeker] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchType, setSearchType] = useState('jobs'); // 'jobs' or 'companies'
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const accountId = localStorage.getItem('accountId');
    const accountType = localStorage.getItem('accountType');
    
    if (!accountId || accountType !== '2') {
      router.push('/Login');
      return;
    }
    
    // Set theme based on account type
    document.documentElement.setAttribute('data-theme', 'jobseeker');
    
    // Set dark/light mode based on user preference or system setting
    const savedMode = localStorage.getItem('colorMode');
    if (savedMode) {
      document.documentElement.setAttribute('data-mode', savedMode);
    } else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      document.documentElement.setAttribute('data-mode', prefersDark ? 'dark' : 'light');
    }
    
    // Load data from localStorage for immediate display
    const firstName = localStorage.getItem('firstName') || '';
    const lastName = localStorage.getItem('lastName') || '';
    const profilePhoto = localStorage.getItem('profilePhoto') || '';
    
    if (firstName || lastName) {
      setJobseeker({
        firstName,
        lastName,
        profilePhoto: profilePhoto || null
      });
    }
    
    fetchJobseekerData(accountId);
  }, [router]);

  const fetchJobseekerData = async (accountId) => {
    try {
      // Fetch jobseeker profile data if session data is incomplete or for updates
      if (!localStorage.getItem('firstName') || !localStorage.getItem('lastName')) {
        const profileResponse = await fetch(`/api/jobseeker/profile?accountId=${accountId}`);
        if (profileResponse.ok) {
          const profileData = await profileResponse.json();
          if (profileData.success) {
            const newFirstName = profileData.data.person.first_name;
            const newLastName = profileData.data.person.last_name;
            const newProfilePhoto = profileData.data.account.account_profile_photo || '';
            
            setJobseeker({
              firstName: newFirstName,
              lastName: newLastName,
              profilePhoto: newProfilePhoto || null
            });
            
            // Update localStorage with fetched data
            localStorage.setItem('firstName', newFirstName);
            localStorage.setItem('lastName', newLastName);
            if (newProfilePhoto) {
              localStorage.setItem('profilePhoto', newProfilePhoto);
            }
          }
        }
      }

      // Fetch notification count
      const notificationsResponse = await fetch(`/api/jobseeker/notifications?accountId=${accountId}`);
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        if (notificationsData.success) {
          setUnreadNotifications(notificationsData.data.unread_count);
        }
      }
    } catch (error) {
      console.error('Error fetching jobseeker data:', error);
      // Keep using session data if API call fails
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    
    // TODO: Implement actual search functionality when API is available
    // For now, simulate search navigation
    if (searchType === 'jobs') {
      alert(`Searching for jobs matching: "${searchQuery}"\nFull search functionality will be implemented soon.`);
    } else {
      alert(`Searching for companies matching: "${searchQuery}"\nFull search functionality will be implemented soon.`);
    }
    setSearchQuery('');
  };

  const handleProfilePhotoUpdate = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const accountId = localStorage.getItem('accountId');
    if (!accountId) return;

    const formData = new FormData();
    formData.append('profilePhoto', file);
    formData.append('accountId', accountId);

    try {
      const response = await fetch('/api/jobseeker/profile/photo', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.success) {
        // Update the jobseeker state with the new profile photo
        setJobseeker(prev => ({
          ...prev,
          profilePhoto: data.profilePhotoUrl
        }));
        // Update localStorage as well
        localStorage.setItem('profilePhoto', data.profilePhotoUrl);
      } else {
        console.error('Failed to update profile photo:', data.error);
        alert('Failed to update profile photo. Please try again.');
      }
    } catch (error) {
      console.error('Error updating profile photo:', error);
      alert('Error updating profile photo. Please try again.');
    }
  };

  const sidebarItems = [
    { name: 'Dashboard', href: '/Dashboard/jobseeker', icon: 'dashboard' },
    { name: 'Profile', href: '/Dashboard/jobseeker/profile', icon: 'profile' },
    { name: 'Job Search', href: '/Dashboard/jobseeker/jobs/all-jobs', icon: 'search' },
    { name: 'Recommended Jobs', href: '/Dashboard/jobseeker/jobs/recommended-jobs', icon: 'recommended' },
    { name: 'Applications', href: '/Dashboard/jobseeker/applications', icon: 'applications' },
    { name: 'Saved Jobs', href: '/Dashboard/jobseeker/saved-jobs', icon: 'saved' },
    { name: 'Notifications', href: '/Dashboard/jobseeker/notifications', icon: 'notifications', badge: unreadNotifications }
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
      case 'search':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        );
      case 'applications':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
case 'saved':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        );
      case 'preferences':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 00.955.806c1.759.467 2.527 2.951 1.191 4.291a1.724 1.724 0 00-.302.983c.084 1.8-1.459 3.336-3.259 3.252a1.724 1.724 0 00-1.569.873c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-.955-.806c-1.759-.467-2.527-2.951-1.191-4.291a1.724 1.724 0 00.302-.983c-.084-1.8 1.459-3.336 3.259-3.252a1.724 1.724 0 001.569-.873z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        );
      case 'recommended':
        return (
          <svg className={iconClass} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
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
    <div className="min-h-screen bg-[var(--background)] transition-all duration-300">
      {/* Header */}
      <header className="bg-[var(--card-background)] shadow-sm border-b border-[var(--border-color)] sticky top-0 z-30">
        <div className="flex items-center justify-between px-6 h-18">
          {/* Left side - Logo */}
          <div className="flex items-center">
            <div
              onClick={() => router.push('/Dashboard/jobseeker')}
              className="cursor-pointer"
            >
              <Image
                src="/Assets/Title.png"
                alt="GoJob Logo"
                width={120}
                height={40}
                className="h-10 w-auto"
                priority
              />
            </div>
          </div>

          {/* Right side - User info, search and sidebar toggle */}
          <div className="flex items-center space-x-4">
            <div className="hidden md:flex items-center space-x-3">
              <span className="text-[var(--foreground)]">
                Hello, <span className="font-semibold">{jobseeker?.firstName} {jobseeker?.lastName}</span>
              </span>
              <div className="relative w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
                {jobseeker?.profilePhoto ? (
                  <img
                    src={jobseeker.profilePhoto}
                    alt="Profile"
                    className="w-full h-full rounded-full object-cover group-hover:opacity-75 transition-opacity"
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = '/Assets/Logo.png'; // Fallback image if loading fails
                      console.error('Error loading profile image in header:', jobseeker.profilePhoto);
                    }}
                  />
                ) : (
                  <svg className="w-5 h-5 text-gray-600 group-hover:text-blue-600 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                )}
                <div className="absolute inset-0 bg-black bg-opacity-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                const currentMode = document.documentElement.getAttribute('data-mode') || 'light';
                const newMode = currentMode === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-mode', newMode);
                localStorage.setItem('colorMode', newMode);
              }}
              className="p-2 rounded-md text-[var(--foreground)] hover:text-[var(--primary-color)] hover:bg-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all duration-200"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
            </button>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 rounded-md text-[var(--foreground)] hover:text-[var(--primary-color)] hover:bg-[var(--border-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] transition-all duration-200"
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
        <aside className={`fixed inset-y-0 right-0 z-30 w-64 bg-[var(--card-background)] border-l border-[var(--border-color)] transform ${sidebarOpen ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 ease-in-out`}>
          <div className="flex h-full flex-col">
            {/* Logo */}
            <div className="flex items-center justify-between h-18 px-6 border-b border-[var(--border-color)]">
              <div className="flex items-center justify-center w-full">
                <img src="/Assets/Title.png" alt="GoJob Logo" className="h-10 w-auto" />
              </div>
              <button
                onClick={() => setSidebarOpen(false)}
                className="md:hidden p-2 rounded-md text-[var(--text-light)] hover:bg-[var(--hover-color)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
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
                      className={`flex items-center w-full px-3 py-2 rounded-md text-sm font-medium text-[var(--foreground)] hover:bg-[var(--hover-color)] hover:text-[var(--primary-color)]`}
                    >
                      <div className="flex-shrink-0 w-8 text-[var(--text-light)]">
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
            <div className="p-4 border-t border-[var(--border-color)]">
              <button
                onClick={() => {
                  // Clear all stored user data
                  localStorage.removeItem('accountId');
                  localStorage.removeItem('accountType');
                  localStorage.removeItem('username');
                  localStorage.removeItem('userEmail');
                  localStorage.removeItem('authToken');
                  localStorage.removeItem('hasJobPreferences');
                  // Redirect to login page
                  router.push('/Login');
                }}
                className="w-full flex items-center px-3 py-2 rounded-md text-sm font-medium text-[var(--foreground)] hover:bg-[var(--error-color)] hover:bg-opacity-10 hover:text-[var(--error-color)]"
              >
                <svg className="h-5 w-5 mr-3 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          </div>
        </aside>
        {/* Backdrop for all screens */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 z-20 bg-black opacity-50"
            onClick={() => setSidebarOpen(false)}
          ></div>
        )}

        {/* Main content */}
        <main className="flex-1 overflow-y-auto">
          <div className="py-6 w-full">
            <div className="px-4 sm:px-6 lg:px-8 w-full">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
