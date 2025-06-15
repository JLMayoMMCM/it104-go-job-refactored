'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function PostingHistoryPage() {
  const [allJobs, setAllJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
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

  const handleJobAction = async (jobId, action) => {
    try {
      const accountId = localStorage.getItem('accountId') || '1';
      let response;
      
      if (action === 'reactivate') {
        response = await fetch(`/api/employee/jobs/${jobId}?accountId=${accountId}&action=enable`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          }
        });
      } else if (action === 'disable') {
        response = await fetch(`/api/employee/jobs/${jobId}?accountId=${accountId}&action=disable`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          }
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
        } else if (action === 'disable') {
          setAllJobs(allJobs.map(job => 
            job.job_id === jobId ? { ...job, job_is_active: false } : job
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
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Posting History</h1>
          <p className="text-gray-600">View all your job postings</p>
        </div>
        <button
          onClick={() => router.push('/Dashboard/employee/add-job')}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          Add New Job
        </button>
      </div>

      {/* Active Postings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Active Postings ({activeJobs.length})</h3>
        </div>
        <div className="p-6">
          {activeJobs.length > 0 ? (
            <div className="space-y-4">
              {activeJobs.map(job => (
                <div key={job.job_id} className="border border-green-200 rounded-xl p-6 bg-green-50 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{job.job_name}</h4>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Active</span>
                      </div>
                      <div className="flex items-center space-x-6 text-sm text-gray-500 mb-3">
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
                          <span className="text-gray-600">Applications:</span>
                          <span className="font-semibold text-blue-600">{job.applicant_count}</span>
                          {job.pending_count > 0 && (
                            <span className="text-yellow-600">({job.pending_count} pending)</span>
                          )}
                          {job.accepted_count > 0 && (
                            <span className="text-green-600">({job.accepted_count} accepted)</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleViewJob(job.job_id)}
                        className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleJobAction(job.job_id, 'disable')}
                        className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                      >
                        Disable
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No active job postings</h3>
              <p className="mt-1 text-gray-500">You don't have any active job postings at the moment.</p>
              <button
                onClick={() => router.push('/Dashboard/employee/add-job')}
                className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Create New Job Posting
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Inactive Postings */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Inactive Postings ({inactiveJobs.length})</h3>
        </div>
        <div className="p-6">
          {inactiveJobs.length > 0 ? (
            <div className="space-y-4">
              {inactiveJobs.map(job => (
                <div key={job.job_id} className="border border-gray-200 rounded-xl p-6 bg-gray-50 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{job.job_name}</h4>
                        <span className="px-2 py-1 bg-gray-100 text-gray-800 text-xs font-medium rounded-full">Inactive</span>
                      </div>
                      <div className="flex items-center space-x-6 text-sm text-gray-500 mb-3">
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
                          <span className="text-gray-600">Applications:</span>
                          <span className="font-semibold text-blue-600">{job.applicant_count}</span>
                          {job.accepted_count > 0 && (
                            <span className="text-green-600">({job.accepted_count} accepted)</span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleViewJob(job.job_id)}
                        className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleJobAction(job.job_id, 'reactivate')}
                        className="px-4 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
                      >
                        Reactivate
                      </button>
                      <button
                        onClick={() => handleJobAction(job.job_id, 'delete')}
                        className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No inactive job postings</h3>
              <p className="mt-1 text-gray-500">You don't have any inactive job postings at the moment.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
