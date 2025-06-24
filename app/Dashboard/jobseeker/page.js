'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import JobCard from '../../components/JobCard'; // Using the main JobCard component

export default function JobseekerDashboard() {
  const [recentJobs, setRecentJobs] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [savedJobIds, setSavedJobIds] = useState(new Set());
  const [applicationStatus, setApplicationStatus] = useState({});
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
    fetchApplicationStatus(accountId);
  }, [router]);

  const fetchDashboardData = async (accountId) => {
    setLoading(true);
    setError(null);
    try {
      // Fetch analytics, recent jobs, and recommended jobs in parallel
      const [
        analyticsRes, 
        recentJobsRes, 
        recommendedJobsRes,
        savedJobsRes
      ] = await Promise.all([
        fetch(`/api/jobseeker/analytics?accountId=${accountId}`),
        fetch(`/api/jobseeker/jobs?${new URLSearchParams({ accountId, type: 'search', sort: 'newest', limit: '5' })}`),
        fetch(`/api/jobseeker/jobs?${new URLSearchParams({ accountId, type: 'recommended', limit: '5' })}`),
        fetch(`/api/jobseeker/saved-jobs?accountId=${accountId}`)
      ]);

      // Process Analytics
      if (analyticsRes.ok) {
        const analyticsData = await analyticsRes.json();
        if (analyticsData.success) {
          setAnalytics(analyticsData.data.analytics);
        } else {
          console.error("Analytics API error:", analyticsData.error);
        }
      } else {
        console.error("Failed to fetch analytics");
      }
      
      // Process Recent Jobs (from 'search' endpoint)
      if (recentJobsRes.ok) {
        const recentData = await recentJobsRes.json();
        if (recentData.success) {
          setRecentJobs(recentData.data);
        } else {
          console.error("Recent Jobs API error:", recentData.error);
        }
      } else {
        console.error("Failed to fetch recent jobs");
      }

      // Process Recommended Jobs
      if (recommendedJobsRes.ok) {
        const recommendedData = await recommendedJobsRes.json();
        if (recommendedData.success) {
          // Filter to only show jobs with a match of 20% or higher
          const filteredRecommended = recommendedData.data.filter(job => (job.match || 0) >= 20);
          setRecommendedJobs(filteredRecommended);
        } else {
          console.error("Recommended Jobs API error:", recommendedData.error);
        }
      } else {
        console.error("Failed to fetch recommended jobs");
      }

      // Process Saved Jobs
      if (savedJobsRes.ok) {
        const savedData = await savedJobsRes.json();
        if (savedData.success) {
          const savedIds = new Set(savedData.data.map(j => j.job_id));
          setSavedJobIds(savedIds);
        }
      }

    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to fetch dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  const fetchApplicationStatus = async (accountId) => {
    try {
      const r = await fetch(`/api/jobseeker/applications?accountId=${accountId}`);
      const j = await r.json();
      if (r.ok && j.success) {
        const map = {};
        j.data.forEach(a => {
          if (!map[a.jobId]) map[a.jobId] = [];
          map[a.jobId].push(a);
        });
        setApplicationStatus(map);
      }
    } catch (e) { console.error("Failed to fetch application status", e); }
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
    const accountId = localStorage.getItem('accountId');
    if (!accountId) return;

    const isCurrentlySaved = savedJobIds.has(jobId);
    
    // Optimistic UI update
    const newSavedJobIds = new Set(savedJobIds);
    if (isCurrentlySaved) {
      newSavedJobIds.delete(jobId);
    } else {
      newSavedJobIds.add(jobId);
    }
    setSavedJobIds(newSavedJobIds);
    setSuccessMessage(isCurrentlySaved ? 'Job unsaved!' : 'Job saved!');
    setTimeout(() => setSuccessMessage(''), 2000);

    try {
      const response = await fetch('/api/jobseeker/saved-jobs', {
        method: isCurrentlySaved ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId, accountId }),
      });

      if (!response.ok) {
        // Revert on failure
        setSavedJobIds(savedJobIds);
        setError("Failed to update saved status.");
        setTimeout(() => setError(null), 3000);
      }
    } catch (e) {
      console.error(e);
      setSavedJobIds(savedJobIds);
    }
  };

  const handleApplySuccess = (jobId) => {
    const accountId = localStorage.getItem('accountId');
    fetchApplicationStatus(accountId); // Re-fetch statuses
  };

  const renderJobList = (jobs, title, viewAllHandler, isRecommended = false) => (
    <div className="card overflow-hidden p-0">
      <div className="panel-header flex justify-between items-center p-2 sm:p-3">
        <h2 className="text-lg sm:text-xl font-semibold text-white">{title}</h2>
        <button 
          onClick={viewAllHandler}
          className="text-xs sm:text-sm text-white hover:text-[var(--light-color)] transition-colors"
        >
          View All →
        </button>
      </div>
      <div className="p-2 sm:p-4">
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => <JobCard key={i} loading={true} />)}
          </div>
        ) : jobs.length === 0 ? (
          <div className="text-center py-6 sm:py-8 border border-dashed border-[var(--border-color)] rounded-lg">
            <p className="text-lg font-semibold text-[var(--foreground)]">No Jobs Found</p>
            <p className="text-sm text-[var(--text-light)] mt-2">
              {isRecommended ? "Update your profile preferences for better recommendations." : "Check back later for new job postings."}
            </p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto scrollbar-hide">
            {jobs.filter(Boolean).map((job) => {
              const id = job.id ?? job.jobId ?? job.job_id;
              return (
                <JobCard
                  key={id}
                  job={{ ...job, id }}
                  applicationStatus={applicationStatus[id]}
                  saved={savedJobIds.has(id)}
                  loadingSaved={false}
                  onView={() => handleViewJob(id)}
                  onSave={() => handleSaveJob(id)}
                  onApplySuccess={() => handleApplySuccess(id)}
                  showSave={true}
                  showApply={true}
                  showView={true}
                />
              );
            })}
          </div>
        )}
      </div>
    </div>
  );

  const handleQuickApply = (job) => {
    setSelectedJob(job);
    setShowApplyModal(true);
  };

  const handleViewJobDetails = (jobId) => {
    router.push(`/Dashboard/jobseeker/jobs/${jobId}`);
  };
  const handleSubmitApplication = async () => {
    if (!selectedJob) return;
    
    try {
      console.log("Submitting application for job ID:", selectedJob.id);
      const accountId = localStorage.getItem('accountId');
      
      // Prepare application data
      const applicationData = { 
        jobId: selectedJob.id, 
        accountId, 
        coverLetter: coverLetter || 'I am interested in this position and would like to apply.'
      };
      
      console.log("Application data:", applicationData);
      
      const response = await fetch(`/api/jobseeker/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(applicationData),
      });
      
      // Handle network errors
      if (!response) {
        throw new Error('Network error - no response received');
      }
      
      // Try to parse the response as JSON
      let data = null;
      const responseText = await response.text();
      try {
        data = JSON.parse(responseText);
      } catch (jsonError) {
        console.error('Failed to parse response JSON:', jsonError);
        console.error('Response text:', responseText);
        throw new Error('Server returned invalid JSON response');
      }
      
      // Check for API success
      if (response.ok && data && data.success) {
        // Update application status immediately before closing modal
        setApplicationStatus(prev => ({ ...prev, [selectedJob.id]: 'pending' }));
        
        // Update the UI
        setShowApplyModal(false);
        setCoverLetter('');
        setSelectedJob(null);
        setSuccessMessage('Your application has been submitted successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
        
        // Update analytics count if available
        setAnalytics(prev => ({
          ...prev,
          totalApplications: prev.totalApplications + 1
        }));
      } else {
        // Handle API errors with a specific error message
        const errorMessage = (data && data.error) 
          ? data.error 
          : (!response.ok ? `Server error: ${response.status}` : 'Failed to submit application');
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      setError(`Failed to submit application: ${error.message}. Please try again.`);
      setTimeout(() => setError(''), 5000);
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
        {renderJobList(recommendedJobs, "Recommended for You", handleViewAllRecommended, true)}
        {renderJobList(recentJobs, "Recent Job Postings", handleViewAllRecent)}
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
