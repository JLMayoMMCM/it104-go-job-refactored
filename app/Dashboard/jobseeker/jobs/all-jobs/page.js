'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function AllJobs() {
  const [allJobs, setAllJobs] = useState([]); // Store all jobs fetched from server
  const [filteredJobs, setFilteredJobs] = useState([]); // Store filtered jobs for display
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedJob, setSelectedJob] = useState(null);
  const [coverLetter, setCoverLetter] = useState('');
  const [applicationStatus, setApplicationStatus] = useState({});
  
  // Filter states
  const [filters, setFilters] = useState({
    sort: 'newest',
    category: '',
    jobType: '',
    experienceLevel: '',
    salaryMin: '',
    salaryMax: '',
    location: ''
  });
  
  // Filter options data
  const [filterOptions, setFilterOptions] = useState({
    categories: [],
    jobTypes: [],
    experienceLevels: []
  });
  
  const router = useRouter();

  useEffect(() => {
    const accountId = localStorage.getItem('accountId');
    const accountType = localStorage.getItem('accountType');
    
    if (!accountId || accountType !== '2') {
      router.push('/Login');
      return;
    }
    
    fetchFilterOptions();
    // Only fetch jobs on initial load with default values
    fetchJobs();
    fetchApplicationStatus(accountId);
  }, [router]);

  // Separate useEffect for pagination only
  useEffect(() => {
    if (currentPage > 1) {
      fetchJobs();
    }
  }, [currentPage]);

  // useEffect for live filtering on search term change
  useEffect(() => {
    if (allJobs.length > 0) {
      setCurrentPage(1); // Reset to first page on search
      filterJobsLocally(allJobs, searchTerm);
    }
  }, [searchTerm, allJobs]);

  const fetchFilterOptions = async () => {
    try {
      // Fetch categories
      const categoriesResponse = await fetch('/api/data/job-fields');
      const categoriesData = await categoriesResponse.json();
      
      // Fetch job types
      const jobTypesResponse = await fetch('/api/data/job-types');
      const jobTypesData = await jobTypesResponse.json();
      
      // Fetch experience levels
      const experienceResponse = await fetch('/api/data/experience-levels');
      const experienceData = await experienceResponse.json();
      
      setFilterOptions({
        categories: categoriesData.success ? categoriesData.data : [],
        jobTypes: jobTypesData.success ? jobTypesData.data : [],
        experienceLevels: experienceData.success ? experienceData.data : []
      });
    } catch (error) {
      console.error('Error fetching filter options:', error);
    }
  };

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const accountId = localStorage.getItem('accountId');
      // Construct query parameters - don't include search term in API call
      const queryParams = new URLSearchParams({
        page: '1', // Always fetch from page 1 for client-side filtering
        limit: '100', // Fetch more jobs for better client-side filtering
        search: '', // Don't filter by search term on server
        sort: filters.sort,
        category: filters.category,
        jobType: filters.jobType,
        experienceLevel: filters.experienceLevel,
        salaryMin: filters.salaryMin,
        salaryMax: filters.salaryMax,
        location: filters.location,
        accountId: accountId,
        type: 'search'
      });
      
      const response = await fetch(`/api/jobseeker/jobs?${queryParams}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch jobs');
      }
      
      if (data.success) {
        const jobs = data.data || [];
        setAllJobs(jobs);
        
        // Apply client-side search filtering
        filterJobsLocally(jobs, searchTerm);
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

  // Client-side filtering function
  const filterJobsLocally = (jobs, searchTerm) => {
    let filtered = jobs;
    
    if (searchTerm.trim()) {
      const searchLower = searchTerm.toLowerCase();
      filtered = jobs.filter(job => 
        job.title?.toLowerCase().includes(searchLower) ||
        job.company?.toLowerCase().includes(searchLower) ||
        job.description?.toLowerCase().includes(searchLower) ||
        job.location?.toLowerCase().includes(searchLower)
      );
    }
    
    setFilteredJobs(filtered);
    setTotalJobs(filtered.length);
    
    // Calculate pagination for filtered results
    const jobsPerPage = 12;
    setTotalPages(Math.ceil(filtered.length / jobsPerPage));
  };

  // Get jobs for current page
  const getPaginatedJobs = () => {
    const jobsPerPage = 12;
    const startIndex = (currentPage - 1) * jobsPerPage;
    const endIndex = startIndex + jobsPerPage;
    return filteredJobs.slice(startIndex, endIndex);
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1); // Reset to first page on new search
    // Apply client-side filtering instead of fetching from server
    filterJobsLocally(allJobs, searchTerm);
  };

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setCurrentPage(1); // Reset to first page on filter change
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

  const fetchApplicationStatus = async (accountId) => {
    try {
      const response = await fetch(`/api/jobseeker/applications?accountId=${accountId}`);
      const data = await response.json();
      
      if (response.ok && data.success && data.data) {
        const statusMap = {};
        data.data.forEach(app => {
          statusMap[app.job_id] = app.request_status;
        });
        setApplicationStatus(statusMap);
      }
    } catch (error) {
      console.error('Error fetching application status:', error);
    }
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
        // Update application status
        setApplicationStatus(prev => ({ ...prev, [selectedJob.id]: 'pending' }));
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
                    fetchJobs();
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
        <h1 className="text-heading">All Job Postings</h1>
        <p className="text-description text-[var(--light-color)]">Browse through the latest job opportunities and find your perfect match.</p>
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
                  placeholder="Search by job title, company, or location..."
                  className="form-input"
                />
                <svg className="absolute right-3 top-3.5 w-5 h-5 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <button
                type="button"
                onClick={() => setShowFilterModal(true)}
                className="btn btn-primary px-6 py-3 flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                </svg>
                Filters
              </button>
            </div>
          </div>
          
          {/* Active Filters Display */}
          {(filters.category || filters.jobType || filters.experienceLevel || filters.salaryMin || filters.salaryMax || filters.location) && (
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-sm text-[var(--text-light)]">Active filters:</span>
              {filters.category && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--light-color)] bg-opacity-30 text-[var(--foreground)]">
                  Category: {filterOptions.categories.find(c => c.category_field_id == filters.category)?.category_field_name}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, category: '' }))}
                    className="ml-1 text-[var(--foreground)] hover:text-[var(--accent-color)]"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.jobType && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--light-color)] bg-opacity-30 text-[var(--foreground)]">
                  Type: {filterOptions.jobTypes.find(jt => jt.job_type_id == filters.jobType)?.job_type_name}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, jobType: '' }))}
                    className="ml-1 text-[var(--foreground)] hover:text-[var(--accent-color)]"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.experienceLevel && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--light-color)] bg-opacity-30 text-[var(--foreground)]">
                  Experience: {filterOptions.experienceLevels.find(el => el.job_seeker_experience_level_id == filters.experienceLevel)?.experience_level_name}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, experienceLevel: '' }))}
                    className="ml-1 text-[var(--foreground)] hover:text-[var(--accent-color)]"
                  >
                    ×
                  </button>
                </span>
              )}
              {(filters.salaryMin || filters.salaryMax) && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--light-color)] bg-opacity-30 text-[var(--foreground)]">
                  Salary: {filters.salaryMin && `₱${filters.salaryMin}+`} {filters.salaryMax && `- ₱${filters.salaryMax}`}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, salaryMin: '', salaryMax: '' }))}
                    className="ml-1 text-[var(--foreground)] hover:text-[var(--accent-color)]"
                  >
                    ×
                  </button>
                </span>
              )}
              {filters.location && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--light-color)] bg-opacity-30 text-[var(--foreground)]">
                  Location: {filters.location}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, location: '' }))}
                    className="ml-1 text-[var(--foreground)] hover:text-[var(--accent-color)]"
                  >
                    ×
                  </button>
                </span>
              )}
              <button
                onClick={() => setFilters({
                  sort: 'newest',
                  category: '',
                  jobType: '',
                  experienceLevel: '',
                  salaryMin: '',
                  salaryMax: '',
                  location: ''
                })}
                className="text-xs text-[var(--error-color)] hover:text-[var(--error-color)] underline"
              >
                Clear all
              </button>
            </div>
          )}
          
          {/* Results count */}
          <div className="text-sm text-[var(--text-light)]">
            Found {totalJobs} job{totalJobs !== 1 ? 's' : ''} {searchTerm && `for "${searchTerm}"`}
          </div>
        </div>
      </div>

      {/* Jobs Grid */}
      <div className="card overflow-hidden">
        <div className="p-6">
          {filteredJobs.length === 0 ? (
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
                      category: '',
                      jobType: '',
                      experienceLevel: '',
                      salaryMin: '',
                      salaryMax: '',
                      location: ''
                    });
                    setCurrentPage(1);
                    filterJobsLocally(allJobs, '');
                  }}
                  className="btn btn-primary text-sm"
                >
                  Clear Filters
                </button>
              </div>
            </div>
          ) : (
            <div className="grid-responsive">
              {getPaginatedJobs().map((job) => (
                <div
                  key={job.id}
                  className="job-card flex flex-col overflow-hidden"
                >
                  <h3 className="job-card-title">{job.title}</h3>
                  <p className="job-card-subtitle">{job.company} • {job.location}</p>
                  <div className="flex flex-wrap gap-2 mb-3 text-[var(--text-light)] text-sm">
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                      </svg>
                      {job.jobType}
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {job.salary}
                    </div>
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      {job.postedDate}
                    </div>
                  </div>
                  <p className="text-sm text-[var(--text-light)] mb-4 flex-grow">{job.description}</p>
                  <div className="button-group mt-auto">
                    <button
                      onClick={() => handleSaveJob(job.id)}
                      className="px-3 py-1.5 border border-[var(--primary-color)] text-[var(--primary-color)] rounded-md text-sm font-medium hover:bg-[var(--primary-color)] hover:text-white transition-all"
                    >
                      Save
                    </button>
                    <button
                      onClick={() => handleQuickApply(job)}
                      disabled={applicationStatus[job.id] === 'pending' || applicationStatus[job.id] === 'accepted' || applicationStatus[job.id] === 'rejected'}
                      className={`px-3 py-1.5 rounded-md text-sm font-medium ${
                        applicationStatus[job.id] === 'pending' || applicationStatus[job.id] === 'accepted' || applicationStatus[job.id] === 'rejected'
                          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                          : 'bg-green-600 text-white hover:bg-green-700'
                      }`}
                    >
                      {applicationStatus[job.id] === 'pending' ? 'Applied' : 
                       applicationStatus[job.id] === 'accepted' ? 'Accepted' : 
                       applicationStatus[job.id] === 'rejected' ? 'Rejected' : 'Apply'}
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

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--card-background)] rounded-lg shadow-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-[var(--foreground)]">Filter Jobs</h2>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="text-[var(--text-light)] hover:text-[var(--foreground)]"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Sort By */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Sort By
                  </label>
                  <select
                    value={filters.sort}
                    onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] bg-[var(--background)]"
                  >
                    <option value="newest">Newest First</option>
                    <option value="salary_high">Highest Salary</option>
                    <option value="salary_low">Lowest Salary</option>
                  </select>
                </div>
                
                {/* Job Category */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Job Category
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] bg-[var(--background)]"
                  >
                    <option value="">All Categories</option>
                    {filterOptions.categories.map(cat => (
                      <option key={cat.category_field_id} value={cat.category_field_id}>
                        {cat.category_field_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Job Type */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Job Type
                  </label>
                  <select
                    value={filters.jobType}
                    onChange={(e) => setFilters(prev => ({ ...prev, jobType: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] bg-[var(--background)]"
                  >
                    <option value="">All Job Types</option>
                    {filterOptions.jobTypes.map(type => (
                      <option key={type.job_type_id} value={type.job_type_id}>
                        {type.job_type_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Experience Level */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Experience Level
                  </label>
                  <select
                    value={filters.experienceLevel}
                    onChange={(e) => setFilters(prev => ({ ...prev, experienceLevel: e.target.value }))}
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] bg-[var(--background)]"
                  >
                    <option value="">All Experience Levels</option>
                    {filterOptions.experienceLevels.map(level => (
                      <option key={level.job_seeker_experience_level_id} value={level.job_seeker_experience_level_id}>
                        {level.experience_level_name}
                      </option>
                    ))}
                  </select>
                </div>
                
                {/* Location */}
                <div>
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Location
                  </label>
                  <input
                    type="text"
                    value={filters.location}
                    onChange={(e) => setFilters(prev => ({ ...prev, location: e.target.value }))}
                    placeholder="Enter location..."
                    className="w-full px-3 py-2 border border-[var(--border-color)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] bg-[var(--background)]"
                  />
                </div>
                
                {/* Salary Range */}
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                    Salary Range
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <input
                        type="number"
                        value={filters.salaryMin}
                        onChange={(e) => setFilters(prev => ({ ...prev, salaryMin: e.target.value }))}
                        placeholder="Min salary"
                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] bg-[var(--background)]"
                      />
                    </div>
                    <div>
                      <input
                        type="number"
                        value={filters.salaryMax}
                        onChange={(e) => setFilters(prev => ({ ...prev, salaryMax: e.target.value }))}
                        placeholder="Max salary"
                        className="w-full px-3 py-2 border border-[var(--border-color)] rounded-md focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] bg-[var(--background)]"
                      />
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => {
                    setFilters({
                      sort: 'newest',
                      category: '',
                      jobType: '',
                      experienceLevel: '',
                      salaryMin: '',
                      salaryMax: '',
                      location: ''
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-[var(--text-light)] bg-[var(--background)] border border-[var(--border-color)] rounded-md hover:bg-[var(--card-background)]"
                >
                  Clear All
                </button>
                <button
                  onClick={() => setShowFilterModal(false)}
                  className="px-4 py-2 text-sm font-medium text-[var(--text-light)] bg-[var(--background)] border border-[var(--border-color)] rounded-md hover:bg-[var(--card-background)]"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    setShowFilterModal(false);
                    setCurrentPage(1);
                    fetchJobs();
                  }}
                  className="btn btn-primary px-4 py-2 text-sm font-medium"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
