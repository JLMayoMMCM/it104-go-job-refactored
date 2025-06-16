'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AllPostingsPage() {
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const router = useRouter();

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

  const handleEditJob = (jobId) => {
    router.push(`/Dashboard/employee/edit-job/${jobId}`);
  };

  const handleDisableClick = (jobId) => {
    setSelectedJobId(jobId);
    setShowPasswordModal(true);
    setPassword('');
    setPasswordError('');
  };

  const handlePasswordSubmit = async () => {
    if (!password.trim()) {
      setPasswordError('Password is required');
      return;
    }

    try {
      const accountId = localStorage.getItem('accountId') || '1';
      const response = await fetch(`/api/employee/jobs/${selectedJobId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          action: 'disable',
          employee_password: password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setPasswordError('Invalid password');
          return;
        }
        throw new Error(data.error || 'Failed to disable job posting');
      }

      if (data.success) {
        setAllJobs(allJobs.map(job => 
          job.job_id === selectedJobId ? { ...job, job_is_active: false } : job
        ));
        setShowPasswordModal(false);
        setPassword('');
        setPasswordError('');
        setSelectedJobId(null);
      }
    } catch (error) {
      console.error('Error disabling job posting:', error);
      setError(error.message);
    }
  };

  const handleJobAction = async (jobId, action) => {
    try {
      const accountId = localStorage.getItem('accountId') || '1';
      let response;
      
      if (action === 'reactivate') {
        response = await fetch(`/api/employee/jobs/${jobId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            accountId,
            action: 'enable'
          })
        });
      } else if (action === 'delete') {
        if (!confirm(`Are you sure you want to permanently delete this job posting? This action cannot be undone.`)) {
          return;
        }
        response = await fetch(`/api/employee/jobs/${jobId}?accountId=${accountId}`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          }
        });
      } else {
        return;
      }

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Failed to ${action} job posting`);
      }

      if (data.success) {
        if (action === 'reactivate') {
          setAllJobs(allJobs.map(job => 
            job.job_id === jobId ? { ...job, job_is_active: true } : job
          ));
        } else if (action === 'delete') {
          setAllJobs(allJobs.filter(job => job.job_id !== jobId));
        }
      }
    } catch (error) {
      console.error(`Error ${action} job posting:`, error);
      setError(error.message);
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-[var(--foreground)]">Error loading job postings</h3>
        <p className="text-[var(--text-light)]">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            fetchJobs();
          }}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[var(--primary-color)] hover:bg-[var(--secondary-color)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-color)]"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">All Job Postings</h1>
          <p className="text-[var(--text-light)]">Manage all your job postings</p>
        </div>
        <button
          onClick={() => router.push('/Dashboard/employee/add-job')}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[var(--primary-color)] hover:bg-[var(--secondary-color)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-color)]"
        >
          <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add New Job
        </button>
      </div>

      {/* Job Postings */}
      <div className="bg-[var(--card-background)] shadow rounded-lg">
        <div className="px-6 py-4 border-b border-[var(--border-color)]">
          <h3 className="text-lg font-medium text-[var(--foreground)]">All Postings ({allJobs.length})</h3>
        </div>
        <div className="p-6">
          {allJobs.length > 0 ? (
            <div className="space-y-4">
              {allJobs.map(job => (
                <div key={job.job_id} className={`border ${job.job_is_active ? 'border-[var(--success-color)]-200 bg-[var(--success-color)]-50' : 'border-[var(--border-color)] bg-[rgba(128, 128, 128, 0.05)]'} rounded-xl p-6 hover:shadow-lg transition-all duration-200`}>
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-[var(--foreground)]">{job.job_name}</h4>
                        <span className={`px-2 py-1 ${job.job_is_active ? 'bg-[var(--success-color)]-100 text-[var(--success-color)]' : 'bg-[rgba(128, 128, 128, 0.1)] text-[var(--text-dark)]'} text-xs font-medium rounded-full`}>{job.job_is_active ? 'Active' : 'Inactive'}</span>
                      </div>
                      <div className="flex items-center space-x-6 text-sm text-[var(--text-light)] mb-3">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Posted {formatDate(job.job_posted_date)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                          </svg>
                          <span>{job.job_category_list.map(cat => cat.job_category.job_category_name).join(', ')}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          <span>{job.job_type.job_type_name}</span>
                        </div>
                      </div>
                      {job.applicant_count !== undefined && (
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="text-[var(--text-light)]">Applications:</span>
                          <span className="font-semibold text-[var(--primary-color)]">{job.applicant_count}</span>
                          {job.pending_count > 0 && (
                            <span className="text-[var(--warning-color)]">({job.pending_count} pending)</span>
                          )}
                          {job.accepted_count > 0 && (
                            <span className="text-[var(--success-color)]">({job.accepted_count} accepted)</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleViewJob(job.job_id)}
                        className="btn btn-primary text-sm"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleEditJob(job.job_id)}
                        className="btn btn-primary text-sm"
                      >
                        Edit
                      </button>
                      {job.job_is_active ? (
                        <button
                          onClick={() => handleDisableClick(job.job_id)}
                          className="btn text-sm"
                          style={{ backgroundColor: 'var(--error-color)', color: 'white' }}
                        >
                          Disable
                        </button>
                      ) : (
                        <>
                          <button
                            onClick={() => handleJobAction(job.job_id, 'reactivate')}
                            className="btn text-sm"
                            style={{ backgroundColor: 'var(--success-color)', color: 'white' }}
                          >
                            Reactivate
                          </button>
                          <button
                            onClick={() => handleJobAction(job.job_id, 'delete')}
                            className="btn text-sm"
                            style={{ backgroundColor: 'var(--error-color)', color: 'white' }}
                          >
                            Delete
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-[var(--foreground)]">No job postings</h3>
              <p className="mt-1 text-[var(--text-light)]">You don't have any job postings at the moment.</p>
              <button
                onClick={() => router.push('/Dashboard/employee/add-job')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[var(--primary-color)] hover:bg-[var(--secondary-color)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-color)]"
              >
                Create New Job Posting
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Password Confirmation Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--card-background)] rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-[var(--foreground)]">Confirm Password</h3>
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                  setPasswordError('');
                  setSelectedJobId(null);
                }}
                className="text-[var(--text-light)] hover:text-[var(--foreground)]"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <p className="text-[var(--text-light)] mb-4">
              Please enter your password to confirm disabling this job posting.
            </p>
            
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-[var(--foreground)] mb-2">
                Password
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setPasswordError('');
                }}
                className="w-full px-3 py-2 border border-[var(--border-color)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] bg-[var(--background)]"
                placeholder="Enter your password"
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handlePasswordSubmit();
                  }
                }}
              />
              {passwordError && (
                <p className="mt-1 text-sm text-[var(--error-color)]">{passwordError}</p>
              )}
            </div>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowPasswordModal(false);
                  setPassword('');
                  setPasswordError('');
                  setSelectedJobId(null);
                }}
                className="px-4 py-2 text-sm font-medium text-[var(--text-light)] bg-[var(--background)] border border-[var(--border-color)] rounded-md hover:bg-[var(--card-background)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)]"
              >
                Cancel
              </button>
              <button
                onClick={handlePasswordSubmit}
                className="px-4 py-2 text-sm font-medium text-white bg-[var(--error-color)] rounded-md hover:bg-[var(--error-color)] focus:outline-none focus:ring-2 focus:ring-[var(--error-color)]"
              >
                Disable Job
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
