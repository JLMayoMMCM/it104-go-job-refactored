'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import GuestJobCard from '../../../components/GuestJobCard';

export default function GuestJobsList() {
  const [allJobs, setAllJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [displayedJobs, setDisplayedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [jobFields, setJobFields] = useState([]);
  const [experienceLevels, setExperienceLevels] = useState([]);
  const [showFilterModal, setShowFilterModal] = useState(false);
  
  // Filter states
  const [filters, setFilters] = useState({
    sort: 'newest',
    category: 'all',
    salaryRange: 'all',
    experienceLevel: 'all'
  });
  
  const router = useRouter();
  const jobsPerPage = 10;

  useEffect(() => {
    fetchJobFields();
    fetchExperienceLevels();
    fetchJobs();
  }, []);

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
  }, [allJobs, searchTerm, filters, jobFields]);

  // Paginate filtered jobs
  useEffect(() => {
    const startIndex = (currentPage - 1) * jobsPerPage;
    const endIndex = startIndex + jobsPerPage;
    setDisplayedJobs(filteredJobs.slice(startIndex, endIndex));
    setTotalPages(Math.ceil(filteredJobs.length / jobsPerPage));
  }, [filteredJobs, currentPage]);

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

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch('/api/jobseeker/jobs?limit=1000'); // Set to maximum possible limit
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Failed to fetch jobs');
      
      if (data.success && Array.isArray(data.data)) {
        setAllJobs(data.data);
        setFilteredJobs(data.data);
      } else {
        throw new Error('Invalid data format received');
      }
    } catch (error) {
      console.error('Error fetching jobs:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewJob = (jobId) => {
    router.push(`/guest/jobs/${jobId}`);
  };

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
  };

  const getSalaryRangeLabel = (range) => {
    switch (range) {
      case '0-20000':
        return '₱0 - ₱20,000';
      case '20001-40000':
        return '₱20,001 - ₱40,000';
      case '40001-60000':
        return '₱40,001 - ₱60,000';
      case '60001-80000':
        return '₱60,001 - ₱80,000';
      case '80001+':
        return '₱80,001+';
      default:
        return 'All Salary Ranges';
    }
  };

  return (
    <div className="flex-1 py-8 px-6 sm:px-8 lg:px-10">
      <main className="w-full">
        <div className="mb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <h1 className="text-2xl font-bold text-[var(--foreground)]">Browse All Jobs</h1>
        </div>

        {/* Search and Filter Section */}
        <div className="card p-4 sm:p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search Bar */}
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search jobs by title, company, or location..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="form-input"
              />
            </div>
            {/* Filter Button */}
            <button
              onClick={() => setShowFilterModal(true)}
              className="btn btn-secondary flex items-center justify-center gap-2"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
              </svg>
              Filters
            </button>
          </div>
        </div>

        {/* Jobs Panel */}
        <div className="card p-4 sm:p-6 w-full">
          {loading ? (
            // Loading skeletons
            [...Array(3)].map((_, i) => (
              <GuestJobCard key={`loading-${i}`} loading={true} />
            ))
          ) : error ? (
            <div className="error-container text-center py-10">
              <p className="text-[var(--error-color)]">{error}</p>
              <button onClick={fetchJobs} className="mt-4 btn btn-primary">
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
                <div className="space-y-2 h-[40vh] w-full overflow-y-auto pr-2 scrollbar-hide">
                  {displayedJobs.map(job => (
                    <GuestJobCard
                      key={`job-${job.id}`}
                      job={job}
                      onView={() => handleViewJob(job.id)}
                    />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-[var(--text-light)]">
                  No jobs found matching your criteria.
                </div>
              )}
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex justify-center mt-6 gap-2">
                  <button
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      currentPage === 1
                        ? 'bg-[var(--border-color)] text-[var(--text-light)] cursor-not-allowed'
                        : 'bg-[var(--primary-color)] text-white hover:bg-[var(--primary-color-hover)]'
                    }`}
                  >
                    Previous
                  </button>
                  
                  {/* Page number buttons */}
                  {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
                    // Show first page, last page, current page, and pages around current
                    let pageToShow;
                    if (totalPages <= 5) {
                      // If 5 or fewer pages, show all
                      pageToShow = i + 1;
                    } else if (currentPage <= 3) {
                      // Near start
                      pageToShow = i + 1;
                      if (i === 4) pageToShow = totalPages;
                    } else if (currentPage >= totalPages - 2) {
                      // Near end
                      pageToShow = i === 0 ? 1 : totalPages - 4 + i;
                    } else {
                      // Middle
                      pageToShow = i === 0 ? 1 : i === 4 ? totalPages : currentPage - 1 + i;
                    }
                    
                    // Add ellipsis
                    if ((i === 1 && pageToShow !== 2) || (i === 3 && pageToShow !== totalPages - 1)) {
                      return (
                        <span key={`ellipsis-${i}`} className="px-3 py-1 text-[var(--text-light)]">
                          ...
                        </span>
                      );
                    }
                    
                    return (
                      <button
                        key={`page-${pageToShow}`}
                        onClick={() => handlePageChange(pageToShow)}
                        className={`px-3 py-1 rounded-md text-sm font-medium ${
                          currentPage === pageToShow
                            ? 'bg-[var(--primary-color)] text-white'
                            : 'bg-[var(--border-color)] text-[var(--text-light)] hover:bg-[var(--hover-color)]'
                        }`}
                      >
                        {pageToShow}
                      </button>
                    );
                  })}
                  
                  <button
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={`px-3 py-1 rounded-md text-sm font-medium ${
                      currentPage === totalPages
                        ? 'bg-[var(--border-color)] text-[var(--text-light)] cursor-not-allowed'
                        : 'bg-[var(--primary-color)] text-white hover:bg-[var(--primary-color-hover)]'
                    }`}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50">
          <div className="modal-content">
            <h2 className="text-subheading">Filter Jobs</h2>
            <div className="space-y-4">
              {/* Sort */}
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

              {/* Job Field */}
              <div>
                <label className="form-label">Job Field</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({ ...prev, category: e.target.value }))}
                  className="form-input"
                >
                  <option value="all">All Fields</option>
                  {jobFields.map(field => (
                    <option key={`field-${field.category_field_id}`} value={field.category_field_id}>
                      {field.category_field_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Salary Range */}
              <div>
                <label className="form-label">Salary Range</label>
                <select
                  value={filters.salaryRange}
                  onChange={(e) => setFilters(prev => ({ ...prev, salaryRange: e.target.value }))}
                  className="form-input"
                >
                  <option value="all">All Salary Ranges</option>
                  <option value="0-20000">₱0 - ₱20,000</option>
                  <option value="20001-40000">₱20,001 - ₱40,000</option>
                  <option value="40001-60000">₱40,001 - ₱60,000</option>
                  <option value="60001-80000">₱60,001 - ₱80,000</option>
                  <option value="80001+">₱80,001+</option>
                </select>
              </div>

              {/* Experience Level */}
              <div>
                <label className="form-label">Experience Level</label>
                <select
                  value={filters.experienceLevel}
                  onChange={(e) => setFilters(prev => ({ ...prev, experienceLevel: e.target.value }))}
                  className="form-input"
                >
                  <option value="all">All Experience Levels</option>
                  {experienceLevels.map(level => (
                    <option key={`level-${level.job_seeker_experience_level_id}`} value={level.job_seeker_experience_level_id}>
                      {level.experience_level_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="button-group">
              <button
                onClick={() => {
                  setFilters({
                    sort: 'newest',
                    category: 'all',
                    salaryRange: 'all',
                    experienceLevel: 'all'
                  });
                }}
                className="btn btn-secondary"
              >
                Clear Filters
              </button>
              <button
                onClick={() => setShowFilterModal(false)}
                className="btn btn-primary"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 