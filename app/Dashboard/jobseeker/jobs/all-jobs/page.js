'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AllJobs() {
  const [allJobs, setAllJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [displayedJobs, setDisplayedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [successMessage, setSuccessMessage] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [applicationStatus, setApplicationStatus] = useState({});
  const [savedJobs, setSavedJobs] = useState({});
  const [categories, setCategories] = useState([]);
  
  // Filter states
  const [filters, setFilters] = useState({
    sort: 'newest',
    category: 'all',
    salaryRange: 'all'
  });
  
  const router = useRouter();

  const jobsPerPage = 10;

  // Initial load - fetch all jobs and application status
  useEffect(() => {
    const accountId = localStorage.getItem('accountId');
    const accountType = localStorage.getItem('accountType');
    
    if (!accountId || accountType !== '2') {
      router.push('/Login');
      return;
    }
    
    fetchCategories();
    fetchAllJobs(accountId);
    fetchApplicationStatus(accountId);
    fetchSavedJobs(accountId);
  }, [router]);

  // Filter and sort jobs when search term or filters change
  useEffect(() => {
    if (allJobs.length === 0) return;

    let filtered = [...allJobs];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(job => 
        job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(job => job.categoryId === filters.category);
    }

    // Apply salary range filter
    if (filters.salaryRange !== 'all') {
      filtered = filtered.filter(job => {
        const salary = parseInt(job.salary?.replace(/[^\d]/g, '') || '0');
        switch (filters.salaryRange) {
          case '0-20000':
            return salary <= 20000;
          case '20001-40000':
            return salary >= 20001 && salary <= 40000;
          case '40001-60000':
            return salary >= 40001 && salary <= 60000;
          case '60001-80000':
            return salary >= 60001 && salary <= 80000;
          case '80001+':
            return salary >= 80001;
          default:
            return true;
        }
      });
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (filters.sort) {
        case 'newest':
          return new Date(b.postedDate) - new Date(a.postedDate);
        case 'salary_high':
          return parseInt(b.salary?.replace(/[^\d]/g, '') || '0') - parseInt(a.salary?.replace(/[^\d]/g, '') || '0');
        case 'salary_low':
          return parseInt(a.salary?.replace(/[^\d]/g, '') || '0') - parseInt(b.salary?.replace(/[^\d]/g, '') || '0');
        default:
          return new Date(b.postedDate) - new Date(a.postedDate);
      }
    });

    setFilteredJobs(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [allJobs, searchTerm, filters]);

  // Paginate filtered jobs
  useEffect(() => {
    const startIndex = (currentPage - 1) * jobsPerPage;
    const endIndex = startIndex + jobsPerPage;
    setDisplayedJobs(filteredJobs.slice(startIndex, endIndex));
    setTotalPages(Math.ceil(filteredJobs.length / jobsPerPage));
  }, [filteredJobs, currentPage]);

  const fetchCategories = async () => {
    try {
      const response = await fetch('/api/data/job-fields');
      const data = await response.json();
      
      if (response.ok && data.success && data.data) {
        setCategories(data.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchAllJobs = async (accountId) => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch all jobs using search functionality with type='search'
      const queryParams = new URLSearchParams({
        accountId: accountId,
        type: 'search',
        limit: '1000', // Large limit to get all jobs
        sort: 'newest'
      });
      
      const response = await fetch(`/api/jobseeker/jobs?${queryParams}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch jobs');
      }
      
      if (data.success && data.data) {
        setAllJobs(data.data);
        setFilteredJobs(data.data);
      } else {
        throw new Error('Jobs data not found');
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicationStatus = async (accountId) => {
    try {
      const response = await fetch(`/api/jobseeker/applications?accountId=${accountId}`);
      const data = await response.json();
      
      if (response.ok && data.success && data.data) {
        const statusMap = {};
        data.data.forEach(app => {
          statusMap[app.jobId] = app.status;
        });
        setApplicationStatus(statusMap);
      }
    } catch (error) {
      console.error('Error fetching application status:', error);
    }
  };

  const fetchSavedJobs = async (accountId) => {
    try {
      const response = await fetch(`/api/jobseeker/saved-jobs?accountId=${accountId}`);
      const data = await response.json();
      
      if (response.ok && data.success && data.data) {
        const savedMap = {};
        data.data.forEach(job => {
          savedMap[job.job_id] = true;
        });
        setSavedJobs(savedMap);
      }
    } catch (error) {
      console.error('Error fetching saved jobs:', error);
    }
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo(0, 0); // Scroll to top on page change
  };

  const handleViewJob = (jobId) => {
    router.push(`/Dashboard/jobseeker/jobs/${jobId}`);
  };

  const handleSaveJob = async (jobId) => {
    try {
      const accountId = localStorage.getItem('accountId');
      if (savedJobs[jobId]) {
        // Unsave job
        const response = await fetch(`/api/jobseeker/saved-jobs`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jobId, accountId }),
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          setSavedJobs(prev => {
            const newSaved = { ...prev };
            delete newSaved[jobId];
            return newSaved;
          });
          setSuccessMessage('Job unsaved successfully!');
          setTimeout(() => setSuccessMessage(''), 2000);
        } else {
          throw new Error(data.error || 'Failed to unsave job');
        }
      } else {
        // Save job
        const response = await fetch(`/api/jobseeker/saved-jobs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jobId, accountId }),
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          setSavedJobs(prev => ({ ...prev, [jobId]: true }));
          setSuccessMessage('Job saved successfully!');
          setTimeout(() => setSuccessMessage(''), 2000);
        } else {
          throw new Error(data.error || 'Failed to save job');
        }
      }
    } catch (error) {
      console.error('Error handling job save/unsave:', error);
      setError('Failed to update job status. Please try again.');
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
          jobId: selectedJob.id, 
          accountId, 
          coverLetter: coverLetter || 'I am interested in this position and would like to apply.'
        }),
      });
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Update application status immediately before closing modal
        setApplicationStatus(prev => ({ ...prev, [selectedJob.id]: 'pending' }));
        
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

  const getSalaryRangeLabel = (range) => {
    switch (range) {
      case '0-20000': return 'Below ₱20,000';
      case '20001-40000': return '₱20,001 - ₱40,000';
      case '40001-60000': return '₱40,001 - ₱60,000';
      case '60001-80000': return '₱60,001 - ₱80,000';
      case '80001+': return 'Above ₱80,000';
      default: return 'All Salary Ranges';
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
        <div className="error-message">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-[var(--error-color)]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-[var(--error-color)]">Error loading jobs</h3>
              <div className="mt-2 text-sm text-[var(--error-color)]">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    const accountId = localStorage.getItem('accountId');
                    if (accountId) fetchAllJobs(accountId);
                  }}
                  className="btn btn-secondary"
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
      <div className="profile-header">
        <h1 className="text-heading">All Jobs</h1>
        <p className="text-description">Browse all available job listings.</p>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="success-message">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-[var(--success-color)]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <div className="text-sm text-[var(--success-color)]">
                <p>{successMessage}</p>
              </div>
            </div>
          </div>
        </div>
      )}
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

      {/* Search and Filters */}
      <div className="card overflow-hidden">
        <div className="p-6">
          <div className="mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-grow relative">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search jobs by title, company, or location..."
                  className="form-input"
                />
                <svg className="absolute right-3 top-3.5 w-5 h-5 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterModal(true)}
                className="btn btn-secondary px-6 py-3 flex items-center gap-2 text-[var(--foreground)]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                </svg>
                Filters
              </button>
            </div>
          </div>
          
          {/* Active Filters Display */}
          {(filters.category !== 'all' || filters.salaryRange !== 'all' || filters.sort !== 'newest') && (
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-sm text-[var(--text-light)]">Active filters:</span>
              {filters.category !== 'all' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--light-color)] bg-opacity-30 text-[var(--foreground)]">
                  Category: {categories.find(c => c.category_field_id === filters.category)?.category_field_name}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, category: 'all' }))}
                    className="ml-1 text-[var(--foreground)] hover:text-[var(--accent-color)]"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.salaryRange !== 'all' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--light-color)] bg-opacity-30 text-[var(--foreground)]">
                  Salary: {getSalaryRangeLabel(filters.salaryRange)}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, salaryRange: 'all' }))}
                    className="ml-1 text-[var(--foreground)] hover:text-[var(--accent-color)]"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.sort !== 'newest' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--light-color)] bg-opacity-30 text-[var(--foreground)]">
                  Sort: {filters.sort === 'salary_high' ? 'Highest Salary' : 'Lowest Salary'}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, sort: 'newest' }))}
                    className="ml-1 text-[var(--foreground)] hover:text-[var(--accent-color)]"
                  >
                    ×
                  </button>
                </span>
              )}
              <button
                onClick={() => setFilters({
                  sort: 'newest',
                  category: 'all',
                  salaryRange: 'all'
                })}
                className="text-xs text-[var(--error-color)] hover:text-[var(--error-color)] underline"
              >
                Clear all
              </button>
            </div>
          )}
          
          {/* Results count */}
          <div className="text-sm text-[var(--text-light)]">
            Found {filteredJobs.length} job{filteredJobs.length !== 1 ? 's' : ''} {searchTerm && `for "${searchTerm}"`}
          </div>
        </div>
      </div>

      {/* Jobs List */}
      <div className="card">
        <div className="p-6">
          {displayedJobs.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-[var(--border-color)] rounded-lg">
              <svg className="mx-auto h-12 w-12 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
              </svg>
              <div className="mt-2 text-sm text-[var(--text-light)]">
                <p>No jobs found matching your criteria. Try adjusting your filters or search terms.</p>
              </div>
              <div className="mt-6">
                <button
                  onClick={() => {
                    setSearchTerm('');
                    setFilters({
                      sort: 'newest',
                      category: 'all',
                      salaryRange: 'all'
                    });
                    setCurrentPage(1);
                  }}
                  className="btn btn-primary text-sm"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {displayedJobs.map((job, index) => (
                <div
                  key={job.id}
                  className={`flex flex-col md:flex-row md:items-center justify-between p-4 border border-[var(--border-color)] rounded-lg ${
                    index % 2 === 0 ? 'bg-[var(--background)]' : 'bg-[rgba(128, 128, 128, 0.05)]'
                  } hover:shadow-md transition-shadow`}
                >
                  <div className="mb-3 md:mb-0 md:w-1/3">
                    <h4 className="text-lg font-semibold text-[var(--foreground)]">{job.title}</h4>
                    <p className="text-sm text-[var(--text-light)]">{job.company} • {job.location} {job.rating > 0 && <span>• ⭐ {job.rating.toFixed(1)}/5.0</span>}</p>
                    <p className="text-sm text-[var(--text-light)] mt-1">{job.posted}</p>
                  </div>
                  <div className="flex flex-col md:flex-row md:items-center md:w-1/3 space-y-2 md:space-y-0 md:space-x-4">
                    <div className="flex items-center text-[var(--text-light)] text-sm">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {job.type}
                    </div>
                    <div className="flex items-center text-[var(--text-light)] text-sm">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {job.salary}
                    </div>
                    {job.match > 0 && (
                      <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        job.match >= 80 ? 'bg-green-100 text-green-800' : 
                        job.match >= 60 ? 'bg-yellow-100 text-yellow-800' : 
                        'bg-red-100 text-red-800'
                      }`}>
                        <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        {job.match}% Match
                      </div>
                    )}
                  </div>
                  <div className="mt-3 md:mt-0 md:w-1/3 flex justify-end space-x-2">
                    <button
                      onClick={() => handleSaveJob(job.id)}
                      className="px-4 py-2 border border-[var(--primary-color)] text-[var(--primary-color)] rounded-md text-sm font-medium hover:bg-[var(--primary-color)] hover:text-white transition-all"
                    >
                      {savedJobs[job.id] ? 'Unsave' : 'Save'}
                    </button>
                    <button
                      onClick={() => handleQuickApply(job)}
                      disabled={applicationStatus[job.id] === 'pending' || applicationStatus[job.id] === 'accepted'}
                      className={`px-4 py-2 rounded-md text-sm font-medium text-white ${
                        applicationStatus[job.id] === 'pending'
                          ? 'bg-gray-400 cursor-not-allowed'
                          : applicationStatus[job.id] === 'accepted'
                          ? 'bg-green-500 cursor-not-allowed'
                          : applicationStatus[job.id] === 'rejected'
                          ? 'bg-red-500 hover:bg-red-600'
                          : 'bg-green-600 hover:bg-green-700'
                      }`}
                    >
                      {applicationStatus[job.id] === 'pending'
                        ? 'Pending'
                        : applicationStatus[job.id] === 'accepted'
                        ? 'Accepted'
                        : applicationStatus[job.id] === 'rejected'
                        ? 'Apply Again'
                        : 'Apply'}
                    </button>
                    <button
                      onClick={() => handleViewJob(job.id)}
                      className="btn btn-primary text-sm"
                    >
                      View Job
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-[var(--border-color)] flex flex-col sm:flex-row items-center justify-between">
            <div className="text-sm text-[var(--text-light)] mb-2 sm:mb-0">
              Showing page {currentPage} of {totalPages}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  currentPage === 1
                    ? 'bg-[var(--border-color)] text-[var(--text-light)] cursor-not-allowed'
                    : 'bg-[var(--primary-color)] text-white hover:bg-[var(--secondary-color)]'
                }`}
              >
                Previous
              </button>
              
              {/* Page number buttons */}
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-1 rounded-md text-sm font-medium ${
                    currentPage === page
                      ? 'bg-[var(--primary-color)] text-white'
                      : 'bg-[var(--border-color)] text-[var(--text-light)] hover:bg-[var(--hover-color)]'
                  }`}
                >
                  {page}
                </button>
              ))}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className={`px-3 py-1 rounded-md text-sm font-medium ${
                  currentPage === totalPages
                    ? 'bg-[var(--border-color)] text-[var(--text-light)] cursor-not-allowed'
                    : 'bg-[var(--primary-color)] text-white hover:bg-[var(--secondary-color)]'
                }`}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Apply Modal */}
      {showApplyModal && selectedJob && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50">
          <div className="modal-content">
            <h2 className="text-subheading">Apply for {selectedJob.title}</h2>
            <p className="text-description mb-4">at {selectedJob.company}</p>
            <div className="mb-4">
              <label className="form-label">Cover Letter (optional)</label>
              <textarea 
                value={coverLetter} 
                onChange={(e) => setCoverLetter(e.target.value)} 
                placeholder="Enter your cover letter or a brief message. A default message will be sent if left empty." 
                className="form-textarea"
              ></textarea>
            </div>
            <div className="button-group">
              <button onClick={() => {
                setShowApplyModal(false);
                setSelectedJob(null);
                setCoverLetter('');
              }} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSubmitApplication} className="btn btn-primary">Submit Application</button>
            </div>
          </div>
        </div>
      )}

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50">
          <div className="modal-content">
            <h2 className="text-subheading">Filter Jobs</h2>
            <div className="space-y-4">
              <div>
                <label className="form-label">Sort by</label>
                <select
                  value={filters.sort}
                  onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value }))}
                  className="form-input"
                >
                  <option value="newest">Newest First</option>
                  <option value="salary_high">Highest Salary</option>
                  <option value="salary_low">Lowest Salary</option>
                </select>
              </div>
              <div>
                <label className="form-label">Job Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="form-input"
                >
                  <option value="all">All Categories</option>
                  {categories.map(cat => (
                    <option key={cat.category_field_id} value={cat.category_field_id}>
                      {cat.category_field_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="form-label">Salary Range</label>
                <select
                  value={filters.salaryRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, salaryRange: e.target.value }))}
                  className="form-input"
                >
                  <option value="all">All Salary Ranges</option>
                  <option value="0-20000">Below ₱20,000</option>
                  <option value="20001-40000">₱20,001 - ₱40,000</option>
                  <option value="40001-60000">₱40,001 - ₱60,000</option>
                  <option value="60001-80000">₱60,001 - ₱80,000</option>
                  <option value="80001+">Above ₱80,000</option>
                </select>
              </div>
            </div>
            <div className="button-group">
              <button onClick={() => setShowFilterModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={() => setShowFilterModal(false)} className="btn btn-primary">Apply Filters</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
