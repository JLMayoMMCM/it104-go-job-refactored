'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function JobseekerDashboard() {
  const [recentJobs, setRecentJobs] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalApplications: 0,
    acceptedApplications: 0,
    rejectedApplications: 0,
    savedJobs: 0,
    followedCompanies: 0,
    unreadNotifications: 0,
    profileViews: 0
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const router = useRouter();

  useEffect(() => {
    const accountId = localStorage.getItem('accountId');
    const accountType = localStorage.getItem('accountType');
    
    if (!accountId || accountType !== '2') {
      router.push('/Login');
      return;
    }
    
    fetchDashboardData(accountId);
  }, [router]);

  const fetchDashboardData = async (accountId) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch analytics and job data
      const analyticsResponse = await fetch(`/api/jobseeker/analytics?accountId=${accountId}`);
      if (!analyticsResponse.ok) {
        const errorText = await analyticsResponse.text();
        throw new Error(`Failed to fetch analytics data: ${analyticsResponse.status} ${errorText}`);
      }
      
      const analyticsData = await analyticsResponse.json();
      
      if (analyticsData.success && analyticsData.data) {
        setAnalytics(analyticsData.data.analytics);
        setRecentJobs(analyticsData.data.recentJobs);
        setRecommendedJobs(analyticsData.data.recommendedJobs);
      } else {
        throw new Error(analyticsData.error || 'Failed to fetch dashboard data: API returned unsuccessful response');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message || 'Failed to fetch dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleViewAllRecent = () => {
    router.push('/Dashboard/jobseeker/jobs/all-jobs');
  };

  const handleViewAllRecommended = () => {
    router.push('/Dashboard/jobseeker/jobs/recommended-jobs');
  };

  const handleViewJob = (jobId) => {
    router.push(`/Dashboard/jobseeker/jobs/${jobId}`);
  };

  const handleSaveJob = async (jobId) => {
    try {
      const accountId = localStorage.getItem('accountId');
      const response = await fetch(`/api/jobseeker/saved-jobs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId, accountId }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setSuccessMessage('Job saved successfully!');
        setTimeout(() => setSuccessMessage(''), 2000);
      } else {
        throw new Error(data.error || 'Failed to save job');
      }
    } catch (error) {
      console.error('Error saving job:', error);
      setError('Failed to save job. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleQuickApply = (job) => {
    setSelectedJob(job);
    setShowApplyModal(true);
  };

  const handleSubmitApplication = async () => {
    if (!selectedJob) return;
    
    try {
      console.log("Submitting application for job ID:", selectedJob.id);
      const accountId = localStorage.getItem('accountId');
      const response = await fetch(`/api/jobseeker/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          jobId: selectedJob.id, 
          accountId, 
          coverLetter: coverLetter || 'I am interested in this position and would like to apply.'
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setShowApplyModal(false);
        setCoverLetter('');
        setSelectedJob(null);
        setSuccessMessage('Your application has been submitted successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        throw new Error(data.error || 'Failed to submit application');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      setError('Failed to submit application. Please try again.');
      setTimeout(() => setError(''), 3000);
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
      <div className="space-y-4 sm:space-y-6">
        <div className="bg-[rgba(231, 76, 60, 0.1)] border border-[var(--error-color)] rounded-md p-3 sm:p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-[var(--error-color)]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-2 sm:ml-3">
              <h3 className="text-sm font-medium text-[var(--error-color)]">Error loading dashboard</h3>
              <div className="mt-1 sm:mt-2 text-sm text-[var(--error-color)]">
                <p>{error}</p>
              </div>
              <div className="mt-3 sm:mt-4">
                <button
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    const accountId = localStorage.getItem('accountId');
                    if (accountId) fetchDashboardData(accountId);
                  }}
                  className="bg-[rgba(231, 76, 60, 0.1)] px-3 sm:px-4 py-1 sm:py-2 rounded-md text-sm font-medium text-[var(--error-color)] hover:bg-[rgba(231, 76, 60, 0.2)]"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-fill space-y-4 sm:space-y-6">
      {/* Welcome Header */}
      <div className="profile-header p-4 sm:p-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">Welcome to Your Job Search Dashboard</h1>
        <p className="text-white text-opacity-90 text-sm sm:text-base lg:text-lg">Discover new opportunities and manage your applications.</p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="success-message p-3 sm:p-4 m-2 sm:m-0">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-[var(--success-color)]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-2 sm:ml-3">
              <div className="text-sm text-[var(--success-color)]">
                <p>{successMessage}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {error && (
        <div className="error-message p-3 sm:p-4 m-2 sm:m-0">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-[var(--error-color)]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-2 sm:ml-3">
              <div className="text-sm text-[var(--error-color)]">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2 sm:gap-4">
        <div className="card analytics overflow-hidden border-l-4 border-[var(--primary-color)] p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-[var(--text-light)]">Total Applications</p>
              <h3 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">{analytics.totalApplications}</h3>
            </div>
            <div className="bg-[var(--primary-color)] bg-opacity-20 p-1 sm:p-2 rounded-full">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--primary-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <button 
              onClick={() => router.push('/Dashboard/jobseeker/applications')}
              className="text-xs text-[var(--primary-color)] hover:underline w-full text-left"
            >
              View Applications →
            </button>
          </div>
        </div>
        <div className="card analytics overflow-hidden border-l-4 border-[var(--success-color)] p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-[var(--text-light)]">Accepted</p>
              <h3 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">{analytics.acceptedApplications}</h3>
            </div>
            <div className="bg-[var(--success-color)] bg-opacity-20 p-1 sm:p-2 rounded-full">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--success-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="card analytics overflow-hidden border-l-4 border-[var(--error-color)] p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-[var(--text-light)]">Rejected</p>
              <h3 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">{analytics.rejectedApplications}</h3>
            </div>
            <div className="bg-[var(--error-color)] bg-opacity-20 p-1 sm:p-2 rounded-full">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--error-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" />
              </svg>
            </div>
          </div>
        </div>
        <div className="card analytics overflow-hidden border-l-4 border-[var(--secondary-color)] p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-[var(--text-light)]">Saved Jobs</p>
              <h3 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">{analytics.savedJobs}</h3>
            </div>
            <div className="bg-[var(--secondary-color)] bg-opacity-20 p-1 sm:p-2 rounded-full">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--secondary-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <button 
              onClick={() => router.push('/Dashboard/jobseeker/saved-jobs')}
              className="text-xs text-[var(--primary-color)] hover:underline w-full text-left"
            >
              View Saved Jobs →
            </button>
          </div>
        </div>
        <div className="card analytics overflow-hidden border-l-4 border-[var(--accent-color)] p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-[var(--text-light)]">Followed Companies</p>
              <h3 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">{analytics.followedCompanies}</h3>
            </div>
            <div className="bg-[var(--accent-color)] bg-opacity-20 p-1 sm:p-2 rounded-full">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--accent-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <button 
              onClick={() => router.push('/Dashboard/jobseeker/company/followed')}
              className="text-xs text-[var(--primary-color)] hover:underline w-full text-left"
            >
              View Companies →
            </button>
          </div>
        </div>
        <div className="card analytics overflow-hidden border-l-4 border-[var(--primary-color)] p-3 sm:p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs sm:text-sm text-[var(--text-light)]">Unread Notifications</p>
              <h3 className="text-xl sm:text-2xl font-bold text-[var(--foreground)]">{analytics.unreadNotifications}</h3>
            </div>
            <div className="bg-[var(--primary-color)] bg-opacity-20 p-1 sm:p-2 rounded-full">
              <svg className="w-4 h-4 sm:w-5 sm:h-5 text-[var(--primary-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-5 5v-5z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 19.5A2.5 2.5 0 01 1.5 17V12A8.5 8.5 0 0110 3.5h4A8.5 8.5 0 0122.5 12v5a2.5 2.5 0 01-2.5 2.5H4z" />
              </svg>
            </div>
          </div>
          <div className="mt-2 sm:mt-3">
            <button 
              onClick={() => router.push('/Dashboard/jobseeker/notifications')}
              className="text-xs text-[var(--primary-color)] hover:underline w-full text-left"
            >
              View Notifications →
            </button>
          </div>
        </div>
      </div>

      {/* Jobs Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
        {/* Recommended Jobs */}
        <div className="card overflow-hidden p-0">
          <div className="panel-header flex justify-between items-center p-2 sm:p-3">
            <h2 className="text-lg sm:text-xl font-semibold text-white">Recommended for You</h2>
            <button 
              onClick={handleViewAllRecommended}
              className="text-xs sm:text-sm text-white hover:text-[var(--light-color)] transition-colors"
            >
              View All Recommended →
            </button>
          </div>
          <div className="p-2 sm:p-4">
            {recommendedJobs.length === 0 ? (
              <div className="text-center py-6 sm:py-8 border border-dashed border-[var(--border-color)] rounded-lg">
                <svg className="mx-auto h-8 w-8 sm:h-10 sm:w-10 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-[var(--text-light)]">
                  <p>No recommended jobs available at the moment. Update your profile for better matches.</p>
                </div>
                <div className="mt-2 sm:mt-4">
                  <button
                    onClick={handleViewAllRecommended}
                    className="btn btn-primary text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-2"
                  >
                    Search Jobs
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto scrollbar-hide">
                {recommendedJobs.map((job, index) => (
                  <div
                    key={job.id}
                    className={`flex flex-col min-h-[150px] sm:min-h-[180px] p-2 border border-[var(--border-color)] rounded-lg ${
                      index % 2 === 0 ? 'bg-[var(--background)]' : 'bg-[rgba(128, 128, 128, 0.05)]'
                    } hover:shadow-md transition-shadow`}
                  >
                    <div className="mb-2 sm:mb-3">
                      <h4 className="text-base sm:text-lg font-semibold text-[var(--foreground)]">{job.title}</h4>
                      <p className="text-xs sm:text-sm text-[var(--text-light)]">{job.company} • {job.location}</p>
                      <p className="text-xs sm:text-sm text-[var(--text-light)] mt-0.5 sm:mt-1">Posted date: {job.postedDate}</p>
                    </div>
                    <div className="flex flex-wrap gap-1 sm:gap-2 mb-2 sm:mb-3">
                      <div className="flex items-center text-[var(--text-light)] text-xs sm:text-sm">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        {job.jobType}
                      </div>
                      <div className="flex items-center text-[var(--text-light)] text-xs sm:text-sm">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {job.salary}
                      </div>
                    </div>
                    <div className="mt-1 sm:mt-2 flex flex-wrap gap-1 sm:gap-2 justify-end">
                      <button
                        onClick={() => handleSaveJob(job.id)}
                        className="px-2 sm:px-3 py-1 sm:py-2 border border-[var(--primary-color)] text-[var(--primary-color)] rounded-md text-xs sm:text-sm font-medium hover:bg-[var(--primary-color)] hover:text-white transition-all w-20 sm:w-24"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => handleQuickApply(job)}
                        className="px-2 sm:px-3 py-1 sm:py-2 bg-green-600 text-white rounded-md text-xs sm:text-sm font-medium hover:bg-green-700 transition-all w-20 sm:w-24"
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => handleViewJob(job.id)}
                        className="btn btn-primary text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 w-20 sm:w-24"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Recent Jobs */}
        <div className="card overflow-hidden p-0">
          <div className="panel-header flex justify-between items-center p-2 sm:p-3">
            <h2 className="text-lg sm:text-xl font-semibold text-white">Recent Job Postings</h2>
            <button 
              onClick={handleViewAllRecent}
              className="text-xs sm:text-sm text-white hover:text-[var(--light-color)] transition-colors"
            >
              View All Jobs →
            </button>
          </div>
          <div className="p-2 sm:p-4">
            {recentJobs.length === 0 ? (
              <div className="text-center py-6 sm:py-8 border border-dashed border-[var(--border-color)] rounded-lg">
                <svg className="mx-auto h-8 w-8 sm:h-10 sm:w-10 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <div className="mt-1 sm:mt-2 text-xs sm:text-sm text-[var(--text-light)]">
                  <p>No recent job postings available at the moment.</p>
                </div>
                <div className="mt-2 sm:mt-4">
                  <button
                    onClick={handleViewAllRecent}
                    className="btn btn-primary text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-2"
                  >
                    Search Jobs
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-2 sm:space-y-3 max-h-96 overflow-y-auto scrollbar-hide">
                {recentJobs.map((job, index) => (
                  <div
                    key={job.id}
                    className={`flex flex-col min-h-[150px] sm:min-h-[180px] p-2 border border-[var(--border-color)] rounded-lg ${
                      index % 2 === 0 ? 'bg-[var(--background)]' : 'bg-[rgba(128, 128, 128, 0.05)]'
                    } hover:shadow-md transition-shadow`}
                  >
                    <div className="mb-2 sm:mb-3">
                      <h4 className="text-base sm:text-lg font-semibold text-[var(--foreground)]">{job.title}</h4>
                      <p className="text-xs sm:text-sm text-[var(--text-light)]">{job.company} • {job.location}</p>
                      <p className="text-xs sm:text-sm text-[var(--text-light)] mt-0.5 sm:mt-1">Posted date: {job.postedDate}</p>
                    </div>
                    <div className="flex flex-wrap gap-1 sm:gap-2 mb-2 sm:mb-3">
                      <div className="flex items-center text-[var(--text-light)] text-xs sm:text-sm">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        {job.jobType}
                      </div>
                      <div className="flex items-center text-[var(--text-light)] text-xs sm:text-sm">
                        <svg className="w-3 h-3 sm:w-4 sm:h-4 mr-0.5 sm:mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {job.salary}
                      </div>
                    </div>
                    <div className="mt-1 sm:mt-2 flex flex-wrap gap-1 sm:gap-2 justify-end">
                      <button
                        onClick={() => handleSaveJob(job.id)}
                        className="px-2 sm:px-3 py-1 sm:py-2 border border-[var(--primary-color)] text-[var(--primary-color)] rounded-md text-xs sm:text-sm font-medium hover:bg-[var(--primary-color)] hover:text-white transition-all w-20 sm:w-24"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => handleQuickApply(job)}
                        className="px-2 sm:px-3 py-1 sm:py-2 bg-green-600 text-white rounded-md text-xs sm:text-sm font-medium hover:bg-green-700 transition-all w-20 sm:w-24"
                      >
                        Apply
                      </button>
                      <button
                        onClick={() => handleViewJob(job.id)}
                        className="btn btn-primary text-xs sm:text-sm px-2 sm:px-3 py-1 sm:py-2 w-20 sm:w-24"
                      >
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Apply Modal */}
      {showApplyModal && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--card-background)] p-4 sm:p-6 rounded-lg shadow-lg max-w-lg w-full mx-2 sm:mx-4">
            <h2 className="text-lg sm:text-xl font-bold mb-2 sm:mb-4 text-[var(--foreground)]">Apply for {selectedJob.title}</h2>
            <p className="text-xs sm:text-sm text-[var(--text-light)] mb-2 sm:mb-4">at {selectedJob.company}</p>
            <textarea 
              value={coverLetter} 
              onChange={(e) => setCoverLetter(e.target.value)} 
              placeholder="Enter your cover letter or a brief message (optional). A default message will be sent if left empty." 
              className="form-input mb-2 sm:mb-4 h-24 sm:h-32 resize-none"
            ></textarea>
            <div className="flex justify-end space-x-2 sm:space-x-3">
              <button 
                onClick={() => {
                  setShowApplyModal(false);
                  setSelectedJob(null);
                  setCoverLetter('');
                }} 
                className="btn btn-secondary text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-2"
              >
                Cancel
              </button>
              <button 
                onClick={handleSubmitApplication} 
                className="btn btn-primary text-xs sm:text-sm px-3 sm:px-4 py-1 sm:py-2"
              >
                Submit Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
