'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SavedJobs() {
  const [savedJobs, setSavedJobs] = useState([]);
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
    
    fetchSavedJobs(accountId);
  }, [router]);

  const fetchSavedJobs = async (accountId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/jobseeker/saved-jobs?accountId=${accountId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch saved jobs');
      }
      
      if (data.success && data.data) {
        setSavedJobs(data.data);
      } else {
        throw new Error('Saved jobs data not found');
      }
    } catch (error) {
      console.error('Error fetching saved jobs:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveSavedJob = async (jobId) => {
    try {
      const accountId = localStorage.getItem('accountId');
      const response = await fetch(`/api/jobseeker/saved-jobs`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId, accountId }),
      });
      
      if (response.ok) {
        setSavedJobs(savedJobs.filter(job => job.jobId !== jobId));
        setSuccessMessage('Job removed from saved list.');
        setTimeout(() => setSuccessMessage(''), 2000);
      } else {
        throw new Error('Failed to remove saved job');
      }
    } catch (error) {
      console.error('Error removing saved job:', error);
      setError('Failed to remove job. Please try again.');
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
      const accountId = localStorage.getItem('accountId');
      const response = await fetch(`/api/jobseeker/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          jobId: selectedJob.jobId, 
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

  const handleViewJob = (jobId) => {
    router.push(`/Dashboard/jobseeker/jobs/${jobId}`);
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
              <h3 className="text-sm font-medium text-[var(--error-color)]">Error loading saved jobs</h3>
              <div className="mt-2 text-sm text-[var(--error-color)]">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    const accountId = localStorage.getItem('accountId');
                    if (accountId) fetchSavedJobs(accountId);
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
      {/* Header */}
      <div className="bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] rounded-lg shadow-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Saved Jobs</h1>
        <p className="text-[var(--light-color)] text-lg">Manage your bookmarked jobs and apply when you're ready.</p>
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

      {/* Saved Jobs List */}
      <div className="bg-[var(--card-background)] shadow-lg rounded-xl overflow-hidden">
        <div className="p-6">
          {savedJobs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[var(--border-color)] rounded-lg">
              <svg className="mx-auto h-12 w-12 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
              </svg>
              <div className="mt-2 text-sm text-[var(--text-light)]">
                <p>You haven't saved any jobs yet. Save jobs that interest you to review them later.</p>
              </div>
              <div className="mt-6">
                <button
                  onClick={() => router.push('/Dashboard/jobseeker/jobs/all-jobs')}
                  className="btn btn-primary text-sm"
                >
                  Search Jobs
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {savedJobs.map((job, index) => (
                <div
                  key={job.id}
                  className={`flex flex-col md:flex-row md:items-center justify-between p-4 border border-[var(--border-color)] rounded-lg ${
                    index % 2 === 0 ? 'bg-[var(--background)]' : 'bg-[rgba(128, 128, 128, 0.05)]'
                  } hover:shadow-md transition-shadow`}
                >
                  <div className="mb-3 md:mb-0 md:w-1/3">
                    <h4 className="text-lg font-semibold text-[var(--foreground)]">{job.title}</h4>
                    <p className="text-sm text-[var(--text-light)]">{job.company} • {job.location}</p>
                    <p className="text-sm text-[var(--text-light)] mt-1">{job.savedDate}</p>
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
                    <div className="flex items-center text-[var(--text-light)] text-sm">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {job.postedDate}
                    </div>
                  </div>
                  <div className="mt-3 md:mt-0 md:w-1/3 flex justify-end space-x-2">
                    <button
                      onClick={() => handleRemoveSavedJob(job.jobId)}
                      className="px-4 py-2 border border-[var(--error-color)] text-[var(--error-color)] rounded-md text-sm font-medium hover:bg-[var(--error-color)] hover:text-white transition-all"
                    >
                      Remove
                    </button>
                    <button
                      onClick={() => handleQuickApply(job)}
                      className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 transition-all"
                    >
                      Quick Apply
                    </button>
                    <button
                      onClick={() => handleViewJob(job.jobId)}
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
