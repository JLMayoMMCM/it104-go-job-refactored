'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EmployeeDashboard() {
  const [analytics, setAnalytics] = useState({
    totalApplicants: 0,
    acceptedApplicants: 0,
    totalJobPostings: 0,
    activePostings: 0
  });
  const [activeJobs, setActiveJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const accountId = localStorage.getItem('accountId');
    const accountType = localStorage.getItem('accountType');
    
    if (!accountId || accountType !== '1') {
      router.push('/Login');
      return;
    }
    
    fetchDashboardData(accountId);
  }, [router]);

  const fetchDashboardData = async (accountId) => {
    try {
      setError(null);
      
      // Fetch analytics data from the API
      const response = await fetch(`/api/employee/analytics?accountId=${accountId}`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch dashboard data');
      }
      
      const data = await response.json();
      
      if (data.success) {
        setAnalytics(data.data.analytics);
        setActiveJobs(data.data.activeJobs);
      } else {
        throw new Error(data.error || 'Failed to load dashboard data');
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleJobAction = async (jobId, action) => {
    try {
      switch (action) {
        case 'view':
          router.push(`/Dashboard/employee/all-postings/view/${jobId}`);
          break;
        case 'edit':
          router.push(`/Dashboard/employee/all-postings/edit/${jobId}`);
          break;
        case 'disable':
          try {
            const accountId = localStorage.getItem('accountId');
            if (!accountId) {
              throw new Error('User not authenticated');
            }
  
            const response = await fetch(`/api/employee/jobs/${jobId}`, {
              method: 'PUT',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                accountId,
                toggleStatus: true
              }),
            });
  
            if (!response.ok) {
              const errorData = await response.json();
              throw new Error(errorData.error || 'Failed to toggle job status');
            }
  
            const result = await response.json();
            if (!result.success) {
              throw new Error(result.error || 'Failed to toggle job status');
            }
  
            // Update local state
            setActiveJobs(prev => prev.map(job => 
              job.job_id === jobId 
                ? { ...job, job_is_active: !job.job_is_active }
                : job
            ));
          } catch (error) {
            console.error('Error toggling job status:', error);
          }
          break;
      }
    } catch (error) {
      console.error('Error handling job action:', error);
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
      {/* Page Header */}
      <div className="bg-gradient-to-r from-[var(--primary-color)] to-[var(--secondary-color)] rounded-lg shadow-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Employee Dashboard</h1>
        <p className="text-[var(--light-color)] text-lg">Manage your job postings and track applications</p>
      </div>

      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-[var(--card-background)] overflow-hidden shadow-lg rounded-xl border-l-4 border-[var(--primary-color)] transform hover:scale-105 transition-transform duration-200">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-[var(--primary-color)] rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-[var(--text-light)] uppercase tracking-wide">Total Applicants</dt>
                  <dd className="text-3xl font-bold text-[var(--primary-color)]">{analytics.totalApplicants}</dd>
                  <dd className="text-xs text-[var(--text-light)] mt-1">All time</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--card-background)] overflow-hidden shadow-lg rounded-xl border-l-4 border-[var(--success-color)] transform hover:scale-105 transition-transform duration-200">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-[var(--success-color)] rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-[var(--text-light)] uppercase tracking-wide">Accepted Applicants</dt>
                  <dd className="text-3xl font-bold text-[var(--success-color)]">{analytics.acceptedApplicants}</dd>
                  <dd className="text-xs text-[var(--text-light)] mt-1">Successfully hired</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--card-background)] overflow-hidden shadow-lg rounded-xl border-l-4 border-[var(--secondary-color)] transform hover:scale-105 transition-transform duration-200">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-[var(--secondary-color)] rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-[var(--text-light)] uppercase tracking-wide">Total Job Postings</dt>
                  <dd className="text-3xl font-bold text-[var(--secondary-color)]">{analytics.totalJobPostings}</dd>
                  <dd className="text-xs text-[var(--text-light)] mt-1">All time</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-[var(--card-background)] overflow-hidden shadow-lg rounded-xl border-l-4 border-[var(--accent-color)] transform hover:scale-105 transition-transform duration-200">
          <div className="p-6">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-[var(--accent-color)] rounded-xl flex items-center justify-center shadow-lg">
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-[var(--text-light)] uppercase tracking-wide">Active Postings</dt>
                  <dd className="text-3xl font-bold text-[var(--accent-color)]">{analytics.activePostings}</dd>
                  <dd className="text-xs text-[var(--text-light)] mt-1">Currently hiring</dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-[var(--card-background)] shadow-lg rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-[var(--background)] to-[rgba(128, 128, 128, 0.1)] border-b border-[var(--border-color)]">
          <h3 className="text-xl font-semibold text-[var(--foreground)]">Quick Actions</h3>
          <p className="text-sm text-[var(--text-light)] mt-1">Manage your recruitment tasks efficiently</p>
        </div>
        <div className="p-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                      <button
                        onClick={() => handleJobAction(job.job_id, 'view')}
                        className="btn btn-primary text-sm"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleJobAction(job.job_id, 'edit')}
                        className="btn btn-primary text-sm"
                      >
                        Edit
                      </button>

            <button
              onClick={() => router.push('/Dashboard/employee/all-postings')}
              className="group flex flex-col items-center p-6 bg-gradient-to-br from-[rgba(143, 211, 163, 0.1)] to-[rgba(143, 211, 163, 0.2)] hover:from-[rgba(143, 211, 163, 0.2)] hover:to-[rgba(143, 211, 163, 0.3)] rounded-xl transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg border border-[rgba(143, 211, 163, 0.3)]"
            >
              <div className="w-12 h-12 bg-[var(--primary-color)] rounded-xl flex items-center justify-center mb-3 group-hover:bg-[var(--secondary-color)] transition-colors">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-[var(--primary-color)] text-center">Active Postings</span>
              <span className="text-xs text-[var(--primary-color)] mt-1">Manage jobs</span>
            </button>

            <button
              onClick={() => router.push('/Dashboard/employee/job-requests')}
              className="group flex flex-col items-center p-6 bg-gradient-to-br from-[rgba(143, 211, 163, 0.1)] to-[rgba(143, 211, 163, 0.2)] hover:from-[rgba(143, 211, 163, 0.2)] hover:to-[rgba(143, 211, 163, 0.3)] rounded-xl transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg border border-[rgba(143, 211, 163, 0.3)]"
            >
              <div className="w-12 h-12 bg-[var(--accent-color)] rounded-xl flex items-center justify-center mb-3 group-hover:bg-[var(--secondary-color)] transition-colors">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-[var(--accent-color)] text-center">Job Requests</span>
              <span className="text-xs text-[var(--accent-color)] mt-1">Review applicants</span>
            </button>

            <button
              onClick={() => router.push('/Dashboard/employee/profile')}
              className="group flex flex-col items-center p-6 bg-gradient-to-br from-[rgba(143, 211, 163, 0.1)] to-[rgba(143, 211, 163, 0.2)] hover:from-[rgba(143, 211, 163, 0.2)] hover:to-[rgba(143, 211, 163, 0.3)] rounded-xl transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg border border-[rgba(143, 211, 163, 0.3)]"
            >
              <div className="w-12 h-12 bg-[var(--secondary-color)] rounded-xl flex items-center justify-center mb-3 group-hover:bg-[var(--primary-color)] transition-colors">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <span className="text-sm font-semibold text-[var(--secondary-color)] text-center">My Profile</span>
              <span className="text-xs text-[var(--secondary-color)] mt-1">Edit details</span>
            </button>
          </div>
        </div>
      </div>

      {/* Active Postings */}
        <div className="bg-[var(--card-background)] shadow-lg rounded-xl overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-[var(--background)] to-[rgba(128, 128, 128, 0.1)] border-b border-[var(--border-color)]">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xl font-semibold text-[var(--foreground)]">Recent Job Postings</h3>
                <p className="text-sm text-[var(--text-light)] mt-1">Your latest active job listings</p>
              </div>
              <button
                onClick={() => router.push('/Dashboard/employee/all-postings')}
                className="btn btn-primary text-sm font-medium"
              >
                View All
              </button>
            </div>
          </div>
        <div className="p-6">
          {activeJobs.length > 0 ? (
            <div className="space-y-4">
              {activeJobs.map((job) => (
                <div key={job.job_id} className="border border-[var(--border-color)] rounded-xl p-6 hover:shadow-lg transition-all duration-200 hover:border-[var(--hover-color)] bg-gradient-to-r from-[var(--background)] to-[rgba(128, 128, 128, 0.05)]">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-[var(--foreground)]">{job.job_name}</h4>
                        <span className="px-2 py-1 bg-[rgba(83, 168, 182, 0.1)] text-[var(--success-color)] text-xs font-medium rounded-full">Active</span>
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
                          <span>{job.category_field_name}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                          </svg>
                          <span>{job.job_category_name}</span>
                        </div>
                      </div>
                      {job.applicant_count !== undefined && (
                        <div className="flex items-center space-x-2 text-sm">
                          <span className="text-[var(--text-light)]">Applications:</span>
                          <span className="font-semibold text-[var(--primary-color)]">{job.applicant_count}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex space-x-2 ml-4">
                      <button
                        onClick={() => handleJobAction(job.job_id, 'view')}
                        className="btn btn-primary text-sm"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleJobAction(job.job_id, 'edit')}
                        className="btn btn-primary text-sm"
                      >
                        Edit
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-24 h-24 bg-[rgba(128, 128, 128, 0.1)] rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-12 h-12 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-[var(--foreground)] mb-2">No active job postings</h3>
              <p className="text-[var(--text-light)] mb-6">Get started by creating your first job posting to attract talented candidates.</p>
              <button
                onClick={() => router.push('/Dashboard/employee/add-job')}
                className="btn btn-primary text-base font-medium"
              >
                <svg className="-ml-1 mr-2 h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Create Your First Job
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
