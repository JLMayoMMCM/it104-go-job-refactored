'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import JobCard from '../../../../components/JobCard';
import Pagination from '../../../../components/Pagination';

export default function AllJobs() {
  const [allJobs, setAllJobs] = useState([]);
  const [experienceLevels, setExperienceLevels] = useState([]);
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
  // applicationStatus: { [jobId]: array of applications }
  const [applicationStatus, setApplicationStatus] = useState({});
  const [savedJobs, setSavedJobs] = useState({});
  const [loadingSavedJobs, setLoadingSavedJobs] = useState(true);
  const [jobFields, setJobFields] = useState([]);
  // const [jobCategories, setJobCategories] = useState([]);
  
  // Filter states
  const [filters, setFilters] = useState({
    sort: 'newest',
    category: 'all',
    salaryRange: 'all',
    experienceLevel: 'all'
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
    
    fetchJobFields();
    // fetchJobCategories();
    fetchExperienceLevels();
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

    // Apply job field filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(job => {
        // Find the selected field id
        const selectedFieldId = String(filters.category);
        // If job has job_category_list (array of categories with field ids)
        if (Array.isArray(job.job_category_list)) {
          // Accept if any category's field id matches the selected field id
          return job.job_category_list.some(jcl =>
            String(jcl.job_category?.category_field?.category_field_id) === selectedFieldId
          );
        }
        // Fallback: Accept if job.field matches the selected field name
        const selectedField = jobFields.find(f => String(f.category_field_id) === selectedFieldId);
        if (selectedField && job.field === selectedField.category_field_name) return true;
        // Fallback: Accept if job.category_field_id/categoryFieldId/categoryId matches filter (legacy)
        if (
          job.category_field_id === filters.category ||
          job.categoryFieldId === filters.category ||
          job.categoryId === filters.category
        ) return true;
        return false;
      });
    }

    // Apply salary range filter
    if (filters.salaryRange !== 'all') {
      filtered = filtered.filter(job => {
        let salaryNum = 0;
        if (typeof job.salary === 'number') {
          salaryNum = job.salary;
        } else if (typeof job.salary === 'string') {
          // Remove non-digits and parse
          salaryNum = parseInt(job.salary.replace(/[^\d]/g, '')) || 0;
        }
        switch (filters.salaryRange) {
          case '0-20000':
            return salaryNum <= 20000;
          case '20001-40000':
            return salaryNum >= 20001 && salaryNum <= 40000;
          case '40001-60000':
            return salaryNum >= 40001 && salaryNum <= 60000;
          case '60001-80000':
            return salaryNum >= 60001 && salaryNum <= 80000;
          case '80001+':
            return salaryNum >= 80001;
          default:
            return true;
        }
      });
    }

    // Apply experience level filter
    if (filters.experienceLevel !== 'all' && filters.experienceLevel !== '' && filters.experienceLevel != null) {
      filtered = filtered.filter(job => {
        // Only filter if job_experience_level_id is not null/undefined
        if (job.job_experience_level_id == null) return false;
        return String(job.job_experience_level_id) === String(filters.experienceLevel);
      });
    }

  // Apply sorting
  filtered.sort((a, b) => {
    // Helper to get numeric salary, -1 if invalid/missing
    const getSalary = (job) => {
      if (typeof job.salary === "number") return job.salary;
      if (typeof job.salary === "string") {
        const num = parseInt(job.salary.replace(/[^\d]/g, ""));
        return isNaN(num) ? -1 : num;
      }
      return -1;
    };
    switch (filters.sort) {
      case "newest":
        return new Date(b.postedDate) - new Date(a.postedDate);
      case "oldest":
        return new Date(a.postedDate) - new Date(b.postedDate);
      case "salary_high": {
        const salaryA = getSalary(a);
        const salaryB = getSalary(b);
        if (salaryA === -1 && salaryB === -1) return 0;
        if (salaryA === -1) return 1; // a missing, b valid: b first
        if (salaryB === -1) return -1; // b missing, a valid: a first
        return salaryB - salaryA;
      }
      case "salary_low": {
        const salaryA = getSalary(a);
        const salaryB = getSalary(b);
        if (salaryA === -1 && salaryB === -1) return 0;
        if (salaryA === -1) return 1; // a missing, b valid: b first
        if (salaryB === -1) return -1; // b missing, a valid: a first
        return salaryA - salaryB;
      }
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

  // Fetch all job fields (category_field)
  const fetchJobFields = async () => {
    try {
      const response = await fetch('/api/data/job-fields');
      const data = await response.json();
      if (response.ok && data.success && data.data) {
        setJobFields(data.data);
      }
    } catch (error) {
      console.error('Error fetching job fields:', error);
    }
  };

  const fetchExperienceLevels = async () => {
    try {
      const response = await fetch('/api/data/experience-levels');
      const data = await response.json();
      if (response.ok && data.success && data.data) {
        setExperienceLevels(data.data);
      }
    } catch (error) {
      console.error('Error fetching experience levels:', error);
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
        limit: '1000'
      });

      const response = await fetch(`/api/jobseeker/jobs?${queryParams}`);
      let data;
      try {
        data = await response.json();
      } catch (jsonError) {
        const text = await response.text();
        console.error('Non-JSON response from /api/jobseeker/jobs:', text);
        throw new Error('Server returned invalid JSON. See console for details.');
      }
      
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
        // Group all applications by jobId
        const statusMap = {};
        data.data.forEach(app => {
          if (!statusMap[app.jobId]) statusMap[app.jobId] = [];
          // Map numeric status IDs to string values for status
          let status = app.status || app.Status || "";
          if (typeof status === "number") {
            if (status === 1) status = "Accepted";
            else if (status === 2) status = "In-progress";
            else if (status === 3) status = "Rejected";
          } else if (typeof status === "string") {
            status = status.trim();
            if (status === "1") status = "Accepted";
            else if (status === "2") status = "In-progress";
            else if (status === "3") status = "Rejected";
            else if (status.toLowerCase() === "in-progress" || status.toLowerCase() === "pending") {
              status = "In-progress";
            } else if (status.toLowerCase() === "accepted") {
              status = "Accepted";
            } else if (status.toLowerCase() === "rejected") {
              status = "Rejected";
            }
          }
          statusMap[app.jobId].push({
            ...app,
            status,
          });
        });
        setApplicationStatus(statusMap);
      }
    } catch (error) {
      console.error('Error fetching application status:', error);
    }
  };

  const fetchSavedJobs = async (accountId) => {
    try {
      setLoadingSavedJobs(true);
      const response = await fetch(`/api/jobseeker/saved-jobs?accountId=${accountId}`);
      const data = await response.json();
      
      if (response.ok && data.success && data.data) {
        const savedMap = {};
        data.data.forEach(job => {
          // Support both job_id and jobId, and normalize to string for consistent comparison
          const id = job.job_id !== undefined ? String(job.job_id) : (job.jobId !== undefined ? String(job.jobId) : null);
          if (id) savedMap[id] = true;
        });
        setSavedJobs(savedMap);
      }
    } catch (error) {
      console.error('Error fetching saved jobs:', error);
    } finally {
      setLoadingSavedJobs(false);
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
        // Optimistically update UI before API call
        setSavedJobs(prev => {
          const newSaved = { ...prev };
          delete newSaved[jobId];
          return newSaved;
        });
        setSuccessMessage('Job unsaved successfully!');
        setTimeout(() => setSuccessMessage(''), 2000);
        
        // Unsave job
        const response = await fetch(`/api/jobseeker/saved-jobs`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jobId, accountId }),
        });
        
        const data = await response.json();
        
        if (!(response.ok && data.success)) {
          // Revert optimistic update on failure
          setSavedJobs(prev => ({ ...prev, [jobId]: true }));
          throw new Error(data.error || 'Failed to unsave job');
        }
      } else {
        // Optimistically update UI before API call
        setSavedJobs(prev => ({ ...prev, [jobId]: true }));
        setSuccessMessage('Job saved successfully!');
        setTimeout(() => setSuccessMessage(''), 2000);
        
        // Save job
        const response = await fetch(`/api/jobseeker/saved-jobs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jobId, accountId }),
        });
        
        const data = await response.json();
        
        if (!(response.ok && data.success)) {
          // Revert optimistic update on failure
          setSavedJobs(prev => {
            const newSaved = { ...prev };
            delete newSaved[jobId];
            return newSaved;
          });
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
  setApplicationStatus(prev => {
    // Always use an array for the job's applications
    const prevApps = Array.isArray(prev[selectedJob.id]) ? prev[selectedJob.id] : [];
    // Add a new "In-progress" (pending) application
    return {
      ...prev,
      [selectedJob.id]: [
        ...prevApps,
        {
          status: "In-progress",
          // Optionally add more fields if needed (e.g., date, id)
        }
      ]
    };
  });

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
                className="btn btn-secondary flex items-center justify-center gap-2 text-[var(--foreground)] w-full max-w-[140px] mx-auto"
                style={{ minHeight: "44px" }}
              >
                <span className="flex items-center justify-center gap-2 w-full">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.707A1 1 0 013 7V4z" />
                  </svg>
                  <span>Filters</span>
                </span>
              </button>
            </div>
          </div>
          
          {/* Active Filters Display */}
          {(filters.category !== 'all' || filters.salaryRange !== 'all' || filters.sort !== 'newest') && (
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="text-sm text-[var(--text-light)]">Active filters:</span>
              {filters.category !== 'all' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--light-color)] bg-opacity-30 text-[var(--foreground)]">
                  Category: {jobFields.find(f => f.category_field_id === filters.category)?.category_field_name}
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
        <div className="p-4 sm:p-6 w-full">
          {loading ? (
            // Loading skeletons
            [...Array(3)].map((_, i) => (
              <JobCard key={`loading-${i}`} loading={true} />
            ))
          ) : error ? (
            <div className="error-container text-center py-10">
              <p className="text-[var(--error-color)]">{error}</p>
              <button onClick={() => {
                setError(null);
                setLoading(true);
                const accountId = localStorage.getItem('accountId');
                if (accountId) fetchAllJobs(accountId);
              }} className="mt-4 btn btn-primary">
                Retry
              </button>
            </div>
          ) : (
            <>
              <div className="flex justify-between items-center mb-4">
                <div className="text-sm text-[var(--text-light)]">
                  Showing {displayedJobs.length} of {filteredJobs.length} jobs
                </div>
                {filteredJobs.length > 0 && (
                  <div className="text-sm text-[var(--text-light)]">
                    Page {currentPage} of {totalPages}
                  </div>
                )}
              </div>
              
              {displayedJobs.length > 0 ? (
                <div className="space-y-2 h-[65vh] w-full overflow-y-auto pr-2 scrollbar-hide">
                  {displayedJobs.map(job => (
                    <JobCard
                      key={job.id}
                      job={job}
                      applicationStatus={applicationStatus[job.id]}
                      saved={!!savedJobs[job.id]}
                      loadingSaved={loadingSavedJobs}
                      onSave={handleSaveJob}
                      onApplySuccess={(jobId) => {
                        setApplicationStatus(prev => {
                          const prevApps = Array.isArray(prev[jobId]) ? prev[jobId] : [];
                          return {
                            ...prev,
                            [jobId]: [
                              ...prevApps,
                              {
                                status: "In-progress",
                                request_date: new Date().toISOString()
                              }
                            ]
                          };
                        });
                      }}
                      onView={handleViewJob}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-[var(--text-light)]">
                  No jobs found matching your criteria.
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
                  <option value="oldest">Oldest First</option>
                  <option value="salary_high">Highest Salary</option>
                  <option value="salary_low">Lowest Salary</option>
                </select>
              </div>
              <div>
                <label className="form-label">Job Field</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="form-input"
                >
                  <option value="all">All Fields</option>
                  {jobFields.map((field) => (
                    <option
                      key={field.category_field_id}
                      value={field.category_field_id}
                    >
                      {field.category_field_name}
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
                  <option key="all" value="all">All Salary Ranges</option>
                  <option key="0-20000" value="0-20000">Below ₱20,000</option>
                  <option key="20001-40000" value="20001-40000">₱20,001 - ₱40,000</option>
                  <option key="40001-60000" value="40001-60000">₱40,001 - ₱60,000</option>
                  <option key="60001-80000" value="60001-80000">₱60,001 - ₱80,000</option>
                  <option key="80001+" value="80001+">Above ₱80,000</option>
                </select>
              </div>
              <div>
                <label className="form-label">Job Experience Level</label>
                <select
                  value={filters.experienceLevel}
                  onChange={(e) => setFilters(prev => ({ ...prev, experienceLevel: e.target.value }))}
                  className="form-input"
                >
                  <option key="all" value="all">All Experience Levels</option>
                  {experienceLevels.map(level => (
                    <option key={level.job_seeker_experience_level_id} value={level.job_seeker_experience_level_id}>
                      {level.experience_level_name}
                    </option>
                  ))}
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
