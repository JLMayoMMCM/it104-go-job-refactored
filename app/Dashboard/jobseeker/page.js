'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function JobseekerDashboard() {
  const [recentJobs, setRecentJobs] = useState([]);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
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
      
      // Fetch recent jobs
      const recentResponse = await fetch(`/api/jobseeker/jobs?limit=5&type=recent&accountId=${accountId}`);
      const recentData = await recentResponse.json();
      
      if (!recentResponse.ok) {
        throw new Error(recentData.error || 'Failed to fetch recent jobs');
      }
      
      if (recentData.success && recentData.data) {
        console.log("Recent jobs data:", recentData.data);
        setRecentJobs(recentData.data);
      }
      
      // Fetch recommended jobs
      const recommendedResponse = await fetch(`/api/jobseeker/jobs?limit=5&type=recommended&accountId=${accountId}`);
      const recommendedData = await recommendedResponse.json();
      
      if (!recommendedResponse.ok) {
        throw new Error(recommendedData.error || 'Failed to fetch recommended jobs');
      }
      
      if (recommendedData.success && recommendedData.data) {
        console.log("Recommended jobs data:", recommendedData.data);
        setRecommendedJobs(recommendedData.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message);
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
      <div className="space-y-6">
        <div className="bg-[rgba(231, 76, 60, 0.1)] border border-[var(--error-color)] rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-[var(--error-color)]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-[var(--error-color)]">Error loading dashboard</h3>
              <div className="mt-2 text-sm text-[var(--error-color)]">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    const accountId = localStorage.getItem('accountId');
                    if (accountId) fetchDashboardData(accountId);
                  }}
                  className="bg-[rgba(231, 76, 60, 0.1)] px-4 py-2 rounded-md text-sm font-medium text-[var(--error-color)] hover:bg-[rgba(231, 76, 60, 0.2)]"
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
    <div className="space-y-8">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] rounded-lg shadow-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Welcome to Your Job Search Dashboard</h1>
        <p className="text-[var(--light-color)] text-lg">Discover new opportunities and manage your applications.</p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <div className="text-sm text-green-700">
                <p>{successMessage}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <div className="text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-[var(--card-background)] shadow-lg rounded-xl p-6 border border-[var(--border-color)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-light)]">Applications</p>
              <h3 className="text-3xl font-bold text-[var(--foreground)]">0</h3>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <button 
              onClick={() => router.push('/Dashboard/jobseeker/applications')}
              className="text-sm text-[var(--primary-color)] hover:underline"
            >
              View Applications →
            </button>
          </div>
        </div>
        <div className="bg-[var(--card-background)] shadow-lg rounded-xl p-6 border border-[var(--border-color)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-light)]">Saved Jobs</p>
              <h3 className="text-3xl font-bold text-[var(--foreground)]">0</h3>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <button 
              onClick={() => router.push('/Dashboard/jobseeker/saved-jobs')}
              className="text-sm text-[var(--primary-color)] hover:underline"
            >
              View Saved Jobs →
            </button>
          </div>
        </div>
        <div className="bg-[var(--card-background)] shadow-lg rounded-xl p-6 border border-[var(--border-color)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-[var(--text-light)]">Profile Views</p>
              <h3 className="text-3xl font-bold text-[var(--foreground)]">0</h3>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
          </div>
          <div className="mt-4">
            <button 
              onClick={() => router.push('/Dashboard/jobseeker/profile')}
              className="text-sm text-[var(--primary-color)] hover:underline"
            >
              Update Profile →
            </button>
          </div>
        </div>
      </div>

      {/* Recent Jobs */}
      <div className="bg-[var(--card-background)] shadow-lg rounded-xl overflow-hidden">
        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Recent Job Postings</h2>
          <button 
            onClick={handleViewAllRecent}
            className="text-sm text-[var(--primary-color)] hover:underline"
          >
            View All Jobs →
          </button>
        </div>
        <div className="p-6">
          {recentJobs.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-[var(--border-color)] rounded-lg">
              <svg className="mx-auto h-10 w-10 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <div className="mt-2 text-sm text-[var(--text-light)]">
                <p>No recent job postings available at the moment.</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleViewAllRecent}
                  className="btn btn-primary text-sm"
                >
                  Search Jobs
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {recentJobs.map((job, index) => (
                <div
                  key={job.id}
                  className={`flex flex-col md:flex-row md:items-center justify-between p-4 border border-[var(--border-color)] rounded-lg ${
                    index % 2 === 0 ? 'bg-[var(--background)]' : 'bg-[rgba(128, 128, 128, 0.05)]'
                  } hover:shadow-md transition-shadow`}
                >
                  <div className="mb-3 md:mb-0 md:w-1/3">
                    <h4 className="text-lg font-semibold text-[var(--foreground)]">{job.title}</h4>
                    <p className="text-sm text-[var(--text-light)]">{job.company} • {job.location}</p>
                    <p className="text-sm text-[var(--text-light)] mt-1">{job.postedDate}</p>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center md:w-1/3 space-y-2 md:space-y-0 md:space-x-4">
                    <div className="flex items-center text-[var(--text-light)] text-sm">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {job.jobType}
                    </div>
                    <div className="flex items-center text-[var(--text-light)] text-sm">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {job.salary}
                    </div>
                  </div>
                  <div className="mt-3 md:mt-0 md:w-1/3 flex justify-end space-x-2">
                    <button
                      onClick={() => handleSaveJob(job.id)}
                      className="px-4 py-2 border border-[var(--primary-color)] text-[var(--primary-color)] rounded-md text-sm font-medium hover:bg-[var(--primary-color)] hover:text-white transition-all"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => handleQuickApply(job)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-all"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => handleViewJob(job.id)}
                      className="btn btn-primary text-sm"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recommended Jobs */}
      <div className="bg-[var(--card-background)] shadow-lg rounded-xl overflow-hidden">
        <div className="p-6 border-b border-[var(--border-color)] flex justify-between items-center">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Recommended for You</h2>
          <button 
            onClick={handleViewAllRecommended}
            className="text-sm text-[var(--primary-color)] hover:underline"
          >
            View All Recommended →
          </button>
        </div>
        <div className="p-6">
          {recommendedJobs.length === 0 ? (
            <div className="text-center py-8 border border-dashed border-[var(--border-color)] rounded-lg">
              <svg className="mx-auto h-10 w-10 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div className="mt-2 text-sm text-[var(--text-light)]">
                <p>No recommended jobs available at the moment. Update your profile for better matches.</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleViewAllRecommended}
                  className="btn btn-primary text-sm"
                >
                  Search Jobs
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {recommendedJobs.map((job, index) => (
                <div
                  key={job.id}
                  className={`flex flex-col md:flex-row md:items-center justify-between p-4 border border-[var(--border-color)] rounded-lg ${
                    index % 2 === 0 ? 'bg-[var(--background)]' : 'bg-[rgba(128, 128, 128, 0.05)]'
                  } hover:shadow-md transition-shadow`}
                >
                  <div className="mb-3 md:mb-0 md:w-1/3">
                    <h4 className="text-lg font-semibold text-[var(--foreground)]">{job.title}</h4>
                    <p className="text-sm text-[var(--text-light)]">{job.company} • {job.location}</p>
                    <p className="text-sm text-[var(--text-light)] mt-1">{job.postedDate}</p>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center md:w-1/3 space-y-2 md:space-y-0 md:space-x-4">
                    <div className="flex items-center text-[var(--text-light)] text-sm">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {job.jobType}
                    </div>
                    <div className="flex items-center text-[var(--text-light)] text-sm">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {job.salary}
                    </div>
                    <div className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {job.match || 0}% Match
                    </div>
                  </div>
                  <div className="mt-3 md:mt-0 md:w-1/3 flex justify-end space-x-2">
                    <button
                      onClick={() => handleSaveJob(job.id)}
                      className="px-4 py-2 border border-[var(--primary-color)] text-[var(--primary-color)] rounded-md text-sm font-medium hover:bg-[var(--primary-color)] hover:text-white transition-all"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => handleQuickApply(job)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-all"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => handleViewJob(job.id)}
                      className="btn btn-primary text-sm"
                    >
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Quick Apply Modal */}
      {showApplyModal && selectedJob && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg max-w-lg w-full">
            <h2 className="text-xl font-bold mb-4">Apply for {selectedJob.title}</h2>
            <p className="text-gray-600 mb-4">at {selectedJob.company}</p>
            <textarea 
              value={coverLetter} 
              onChange={(e) => setCoverLetter(e.target.value)} 
              placeholder="Enter your cover letter or a brief message (optional). A default message will be sent if left empty." 
              className="w-full p-2 border rounded mb-4 h-32"
            ></textarea>
            <div className="flex justify-end space-x-3">
              <button onClick={() => {
                setShowApplyModal(false);
                setSelectedJob(null);
                setCoverLetter('');
              }} className="px-4 py-2 bg-gray-300 rounded-md">Cancel</button>
              <button onClick={handleSubmitApplication} className="px-4 py-2 bg-green-600 text-white rounded-md">Submit Application</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
