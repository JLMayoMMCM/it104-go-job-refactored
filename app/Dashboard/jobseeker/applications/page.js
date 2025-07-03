'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Pagination from '../../../components/Pagination';

export default function Applications() {
  const [activeTab, setActiveTab] = useState('pending');
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [displayedApplications, setDisplayedApplications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  
  const router = useRouter();
  const applicationsPerPage = 10;

  useEffect(() => {
    const accountId = localStorage.getItem('accountId');
    const accountType = localStorage.getItem('accountType');
    
    if (!accountId || accountType !== '2') {
      router.push('/Login');
      return;
    }
    
    fetchApplications(accountId, activeTab);
  }, [router, activeTab]);

  // Filter applications based on search term
  useEffect(() => {
    let filtered = [...applications];
    
    if (searchTerm) {
      filtered = filtered.filter(app => 
        (app.jobTitle || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.company || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (app.location || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    setFilteredApplications(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [applications, searchTerm]);

  // Paginate filtered applications
  useEffect(() => {
    const startIndex = (currentPage - 1) * applicationsPerPage;
    const endIndex = startIndex + applicationsPerPage;
    setDisplayedApplications(filteredApplications.slice(startIndex, endIndex));
    setTotalPages(Math.ceil(filteredApplications.length / applicationsPerPage));
  }, [filteredApplications, currentPage]);

  const fetchApplications = async (accountId, status) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/jobseeker/applications?accountId=${accountId}&status=${status}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch applications');
      }
      
      if (data.success && data.data) {
        setApplications(data.data);
        setFilteredApplications(data.data);
      } else {
        throw new Error('Applications data not found');
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSelectedApplication(null);
    setShowDetailsModal(false);
    setSearchTerm('');
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo(0, 0); // Scroll to top on page change
  };

  const handleViewDetails = (application) => {
    setSelectedApplication(application);
    setShowDetailsModal(true);
  };

  const handleViewJob = (jobId) => {
    router.push(`/Dashboard/jobseeker/jobs/${jobId}`);
  };

  const getStatusColor = (status) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'accepted':
        return 'bg-green-100 text-green-800';
      case 'rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status.toLowerCase()) {
      case 'pending':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'accepted':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'rejected':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)]"></div>
      </div>
    );
  }

    return (
    <div className="space-y-8">
      {/* Header */}
      <div className="profile-header">
        <h1 className="text-heading">My Applications</h1>
        <p className="text-description">Track the status of your job applications and manage your career journey.</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-[var(--error-color)]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <div className="text-sm text-[var(--error-color)]">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="card overflow-hidden">
        <div className="flex flex-col sm:flex-row">
          <button
            onClick={() => handleTabChange('pending')}
            className={`px-6 py-4 text-center font-medium focus:outline-none transition-all duration-200 ${
              activeTab === 'pending'
                ? 'bg-[var(--primary-color)] text-white'
                : 'bg-[var(--background)] text-[var(--text-light)] hover:bg-[var(--border-color)]'
            }`}
          >
            <div className="flex items-center justify-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Pending
            </div>
          </button>
          <button
            onClick={() => handleTabChange('accepted')}
            className={`px-6 py-4 text-center font-medium focus:outline-none transition-all duration-200 ${
              activeTab === 'accepted'
                ? 'bg-[var(--primary-color)] text-white'
                : 'bg-[var(--background)] text-[var(--text-light)] hover:bg-[var(--border-color)]'
            }`}
          >
            <div className="flex items-center justify-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Accepted
            </div>
          </button>
          <button
            onClick={() => handleTabChange('rejected')}
            className={`px-6 py-4 text-center font-medium focus:outline-none transition-all duration-200 ${
              activeTab === 'rejected'
                ? 'bg-[var(--primary-color)] text-white'
                : 'bg-[var(--background)] text-[var(--text-light)] hover:bg-[var(--border-color)]'
            }`}
          >
            <div className="flex items-center justify-center">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
              Rejected
            </div>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="card overflow-hidden">
        <div className="p-6">
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search applications by job title, company, or location..."
              className="form-input"
            />
            <svg className="absolute right-3 top-3.5 w-5 h-5 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          
          {/* Results count */}
          <div className="text-sm text-[var(--text-light)] mt-4">
            Found {filteredApplications.length} {activeTab} application{filteredApplications.length !== 1 ? 's' : ''} {searchTerm && `for "${searchTerm}"`}
          </div>
        </div>
      </div>

      {/* Applications List */}
      <div className="card">
        <div className="p-4 sm:p-6 w-full">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)]"></div>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-[var(--text-light)]">
                  Showing {displayedApplications.length} of {filteredApplications.length} applications
                </div>
                {filteredApplications.length > 0 && (
                  <div className="text-sm text-[var(--text-light)]">
                    Page {currentPage} of {totalPages}
                  </div>
                )}
              </div>
              
              {filteredApplications.length > 0 ? (
                <div className="space-y-2 h-[40vh] w-full overflow-y-auto pr-2 scrollbar-hide">
                  {displayedApplications.map((app, index) => (
                    <div
                      key={app.request_id || index}
                      className={`flex flex-col md:flex-row md:items-center justify-between p-3 border border-[var(--border-color)] rounded-lg bg-[var(--background)] hover:shadow-md transition-shadow`}
                    >
                      <div className="mb-2 md:mb-0 md:w-1/3">
                        <h4 className="text-base font-semibold text-[var(--foreground)]">
                          {app.jobTitle || app.jobs?.job_name || 'Untitled Position'}
                        </h4>
                        <p className="text-xs text-[var(--text-light)]">
                          {app.company || app.jobs?.companies?.company_name || 'Unknown Company'} • {app.location || app.jobs?.job_location || 'Location not specified'}
                        </p>
                        <p className="text-xs text-[var(--text-light)] mt-1">
                          Applied: {new Date(app.request_date || app.appliedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                        </p>
                      </div>
                      <div className="flex flex-col md:flex-row md:items-center md:w-1/3 space-y-1 md:space-y-0 md:space-x-3">
                        <div className="flex items-center text-[var(--text-light)] text-xs">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                          </svg>
                          {app.jobType || app.jobs?.job_type?.job_type_name || 'Not specified'}
                        </div>
                        <div className="flex items-center text-[var(--text-light)] text-xs">
                          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          {app.salary || app.jobs?.job_salary || 'Salary not specified'}
                        </div>
                        <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium capitalize ${getStatusColor(app.status || app.request_status || 'pending')}`}>
                          <span className="mr-1">{getStatusIcon(app.status || app.request_status || 'pending')}</span>
                          {app.status || app.request_status || 'Pending'}
                        </div>
                      </div>
                      <div className="mt-2 md:mt-0 md:w-1/3 flex justify-end space-x-2">
                        <button
                          onClick={() => handleViewDetails(app)}
                          className="px-3 py-1 border border-[var(--primary-color)] text-[var(--primary-color)] rounded-md text-xs font-medium hover:bg-[var(--primary-color)] hover:text-white transition-all"
                        >
                          Details
                        </button>
                        <button
                          onClick={() => handleViewJob(app.jobId || app.job_id)}
                          className="px-3 py-1 bg-[var(--primary-color)] text-white rounded-md text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors"
                        >
                          View Job
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
            <div className="text-center py-12 border border-dashed border-[var(--border-color)] rounded-lg">
              <svg className="mx-auto h-12 w-12 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <div className="mt-2 text-sm text-[var(--text-light)]">
                {activeTab === 'pending' && <p>No pending applications. Check other tabs or apply for more jobs.</p>}
                {activeTab === 'accepted' && <p>No accepted applications yet. Keep applying!</p>}
                {activeTab === 'rejected' && <p>No rejected applications. Your applications are still in progress or accepted.</p>}
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
              )}
              
              {/* Pagination */}
              <Pagination 
                currentPage={currentPage} 
                totalPages={totalPages} 
                onPageChange={handlePageChange} 
              />
            </>
          )}
        </div>
      </div>

      {/* Application Details Modal */}
      {showDetailsModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--card-background)] p-6 rounded-lg shadow-lg max-w-3xl w-full max-h-[80vh] overflow-y-auto mx-4">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--foreground)]">
                  {selectedApplication.jobTitle || selectedApplication.jobs?.job_name || 'Untitled Position'}
                </h2>
                <p className="text-[var(--text-light)]">
                  {selectedApplication.company || selectedApplication.jobs?.companies?.company_name || 'Unknown Company'} • {selectedApplication.location || selectedApplication.jobs?.job_location || 'Location not specified'}
                </p>
              </div>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-[var(--text-light)] hover:text-[var(--foreground)]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <h3 className="text-lg font-semibold text-[var(--foreground)]">Application Status</h3>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium capitalize ${getStatusColor(selectedApplication.status || selectedApplication.request_status)}`}>
                    <span className="mr-1">{getStatusIcon(selectedApplication.status || selectedApplication.request_status)}</span>
                    {selectedApplication.status || selectedApplication.request_status}
                  </div>
                </div>
                <p className="text-sm text-[var(--text-light)]">
                  Applied on: {new Date(selectedApplication.request_date || selectedApplication.appliedDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                </p>
                {selectedApplication.responseDate && (
                  <p className="text-sm text-[var(--text-light)]">
                    Response received: {selectedApplication.responseDate}
                  </p>
                )}
              </div>

              <div>
                <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Your Cover Letter</h3>
                <div className="bg-[var(--background)] p-4 rounded border border-[var(--border-color)]">
                  <p className="text-[var(--foreground)] whitespace-pre-line">
                    {selectedApplication.coverLetter || selectedApplication.cover_letter || 'No cover letter provided with this application.'}
                  </p>
                </div>
              </div>

              {selectedApplication.response && (
                <div>
                  <h3 className="text-lg font-semibold text-[var(--foreground)] mb-2">Employer Response</h3>
                  <div className="bg-[var(--background)] p-4 rounded border border-[var(--border-color)]">
                    <p className="text-[var(--foreground)] whitespace-pre-line">{selectedApplication.response}</p>
                  </div>
                </div>
              )}

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="btn btn-secondary"
                >
                  Close
                </button>
                <button
                  onClick={() => handleViewJob(selectedApplication.jobId || selectedApplication.job_id)}
                  className="btn btn-primary"
                >
                  View Job Details
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
