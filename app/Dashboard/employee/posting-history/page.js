'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PostingHistoryPage() {
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [actionToConfirm, setActionToConfirm] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');

  useEffect(() => {
    fetchJobs();
  }, []);

  const fetchJobs = async () => {
    try {
      const accountId = localStorage.getItem('accountId') || '1';
      const response = await fetch(`/api/employee/jobs?accountId=${accountId}&status=all`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch job postings');
      }

      if (data.success) {
        setAllJobs(data.data);
      }
    } catch (error) {
      console.error('Error fetching job postings:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewJob = (jobId) => {
    router.push(`/Dashboard/employee/view-job/${jobId}`);
  };

  const handleActionClick = (jobId, action) => {
    setSelectedJobId(jobId);
    setActionToConfirm(action);
    setShowPasswordModal(true);
    setPassword('');
    setPasswordError('');
  };

  const handlePasswordSubmit = async () => {
    if (!password) {
      setPasswordError('Password is required');
      return;
    }

    try {
      const accountId = localStorage.getItem('accountId');
      const response = await fetch(`/api/employee/jobs/${selectedJobId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accountId,
          action: actionToConfirm,
          employee_password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to perform action');
      }

      setAllJobs(allJobs.map(job =>
        job.job_id === selectedJobId ? { ...job, job_is_active: actionToConfirm === 'reactivate' } : job
      ));

      setShowPasswordModal(false);
    } catch (error) {
      setPasswordError(error.message);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Error loading job postings</h3>
        <p className="text-gray-600">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            fetchJobs();
          }}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Try Again
        </button>
      </div>
    );
  }

  const activeJobs = allJobs.filter(job => job.job_is_active);
  const inactiveJobs = allJobs.filter(job => !job.job_is_active);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Posting History</h1>
          <p className="mt-1 text-sm text-[var(--text-light)]">View and manage all your job postings, active and inactive.</p>
        </div>
        <button
          onClick={() => router.push('/Dashboard/employee/add-job')}
          className="mt-4 sm:mt-0 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] transition-colors"
        >
          <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add New Job
        </button>
      </div>

      {/* Postings Sections */}
      <div className="space-y-6">
        {['Active', 'Inactive'].map(status => {
          const jobs = status === 'Active' ? activeJobs : inactiveJobs;
          return (
            <div key={status} className="bg-[var(--card-background)] shadow-lg rounded-xl">
              <div className="p-4 md:p-6 border-b border-[var(--border-color)]">
                <h2 className="text-xl font-bold text-[var(--foreground)]">{status} Postings ({jobs.length})</h2>
              </div>
              <div className="p-4">
                {jobs.length > 0 ? (
                  <div className="space-y-4">
                    {jobs.map(job => (
                      <div key={job.job_id} className={`p-4 rounded-lg border ${status === 'Active' ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10' : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/10'}`}>
                        <div className="flex flex-col sm:flex-row justify-between sm:items-center">
                          <div className="flex-1 mb-4 sm:mb-0">
                            <h3 className="font-bold text-[var(--foreground)]">{job.job_name}</h3>
                            <p className="text-sm text-[var(--text-light)]">{job.job_location}</p>
                            <p className="text-xs text-[var(--text-light)] mt-1">Posted: {formatDate(job.job_posted_date)}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button onClick={() => handleViewJob(job.job_id)} className="px-3 py-1 text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 dark:bg-blue-500/20 dark:text-blue-300 dark:hover:bg-blue-500/30 transition-colors">View</button>
                            {status === 'Active' ? (
                              <button onClick={() => handleActionClick(job.job_id, 'disable')} className="px-3 py-1 text-sm font-medium rounded-md text-red-700 bg-red-100 hover:bg-red-200 dark:bg-red-500/20 dark:text-red-300 dark:hover:bg-red-500/30 transition-colors">Disable</button>
                            ) : (
                              <button onClick={() => handleActionClick(job.job_id, 'reactivate')} className="px-3 py-1 text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 dark:bg-green-500/20 dark:text-green-300 dark:hover:bg-green-500/30 transition-colors">Reactivate</button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-center py-8 text-[var(--text-light)]">No {status.toLowerCase()} postings found.</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Password Confirmation Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-[var(--card-background)] rounded-lg shadow-xl p-6 w-full max-w-sm">
            <h3 className="text-lg font-bold text-[var(--foreground)] capitalize">{actionToConfirm} Job</h3>
            <p className="mt-2 text-sm text-[var(--text-light)]">For your security, please enter your password to confirm this action.</p>
            <div className="mt-4">
              <label htmlFor="password-confirm" className="sr-only">Password</label>
              <input
                type="password"
                id="password-confirm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-[var(--border-color)] rounded-md"
                placeholder="Enter your password"
              />
              {passwordError && <p className="mt-2 text-xs text-red-500">{passwordError}</p>}
            </div>
            <div className="mt-6 flex justify-end space-x-3">
              <button onClick={() => setShowPasswordModal(false)} className="px-4 py-2 text-sm rounded-md border border-[var(--border-color)]">Cancel</button>
              <button onClick={handlePasswordSubmit} className="px-4 py-2 text-sm rounded-md text-white bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)]">Confirm</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
