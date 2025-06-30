'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import JobCard from '../../components/JobCard';

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
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [jobFields, setJobFields] = useState([]);
  
  const [filters, setFilters] = useState({
    sort: 'newest',
    category: 'all',
    salaryRange: 'all',
    experienceLevel: 'all'
  });
  
  const router = useRouter();

  const jobsPerPage = 10;

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', 'jobseeker');
    fetchJobFields();
    fetchExperienceLevels();
    fetchAllJobs();
  }, []);

  useEffect(() => {
    if (allJobs.length === 0) return;

    let filtered = [...allJobs];

    if (searchTerm) {
      filtered = filtered.filter(job => 
        job.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filters.category !== 'all') {
      filtered = filtered.filter(job => {
        const selectedFieldId = String(filters.category);
        if (Array.isArray(job.job_category_list)) {
          return job.job_category_list.some(jcl =>
            String(jcl.job_category?.category_field?.category_field_id) === selectedFieldId
          );
        }
        const selectedField = jobFields.find(f => String(f.category_field_id) === selectedFieldId);
        if (selectedField && job.field === selectedField.category_field_name) return true;
        if (
          job.category_field_id === filters.category ||
          job.categoryFieldId === filters.category ||
          job.categoryId === filters.category
        ) return true;
        return false;
      });
    }

    if (filters.salaryRange !== 'all') {
      filtered = filtered.filter(job => {
        let salaryNum = 0;
        if (typeof job.salary === 'number') {
          salaryNum = job.salary;
        } else if (typeof job.salary === 'string') {
          salaryNum = parseInt(job.salary.replace(/[^\d]/g, '')) || 0;
        }
        switch (filters.salaryRange) {
          case '0-20000': return salaryNum <= 20000;
          case '20001-40000': return salaryNum >= 20001 && salaryNum <= 40000;
          case '40001-60000': return salaryNum >= 40001 && salaryNum <= 60000;
          case '60001-80000': return salaryNum >= 60001 && salaryNum <= 80000;
          case '80001+': return salaryNum >= 80001;
          default: return true;
        }
      });
    }

    if (filters.experienceLevel !== 'all' && filters.experienceLevel !== '' && filters.experienceLevel != null) {
      filtered = filtered.filter(job => {
        if (job.job_experience_level_id == null) return false;
        return String(job.job_experience_level_id) === String(filters.experienceLevel);
      });
    }

    filtered.sort((a, b) => {
      const getSalary = (job) => {
        if (typeof job.salary === "number") return job.salary;
        if (typeof job.salary === "string") {
          const num = parseInt(job.salary.replace(/[^\d]/g, ""));
          return isNaN(num) ? -1 : num;
        }
        return -1;
      };
      switch (filters.sort) {
        case "newest": return new Date(b.postedDate) - new Date(a.postedDate);
        case "oldest": return new Date(a.postedDate) - new Date(b.postedDate);
        case "salary_high": {
          const salaryA = getSalary(a);
          const salaryB = getSalary(b);
          if (salaryA === -1 && salaryB === -1) return 0;
          if (salaryA === -1) return 1;
          if (salaryB === -1) return -1;
          return salaryB - salaryA;
        }
        case "salary_low": {
          const salaryA = getSalary(a);
          const salaryB = getSalary(b);
          if (salaryA === -1 && salaryB === -1) return 0;
          if (salaryA === -1) return 1;
          if (salaryB === -1) return -1;
          return salaryA - salaryB;
        }
        default: return new Date(b.postedDate) - new Date(a.postedDate);
      }
    });

    setFilteredJobs(filtered);
    setCurrentPage(1);
  }, [allJobs, searchTerm, filters, jobFields]);

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

  const fetchAllJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams({ type: 'search', limit: '1000' });
      const response = await fetch(`/api/jobseeker/jobs?${queryParams}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch jobs');
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

  const handlePageChange = (newPage) => {
    if (newPage > 0 && newPage <= totalPages) {
      setCurrentPage(newPage);
    }
  };

  const handleViewJob = (jobId) => {
    router.push(`/jobs/${jobId}`);
  };

  const getSalaryRangeLabel = (range) => {
    const ranges = {
      '0-20000': 'Up to ₱20,000',
      '20001-40000': '₱20,001 - ₱40,000',
      '40001-60000': '₱40,001 - ₱60,000',
      '60001-80000': '₱60,001 - ₱80,000',
      '80001+': '₱80,001 and above'
    };
    return ranges[range] || 'All';
  };

  const activeFiltersCount = Object.values(filters).filter(value => value !== 'all' && value !== 'newest').length;

  return (
    <div className="page-fill">
      {/* Header */}
      <header className="card-background shadow-sm border-b border-border-color sticky top-0 z-30 w-full">
        <div className="flex items-center justify-between px-4 sm:px-6 h-16 max-w-7xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
            Browse All Jobs
          </h1>
          <button 
            onClick={() => router.push('/Login')}
            className="btn btn-primary"
          >
            Login to Apply
          </button>
        </div>
      </header>

      <main className="content-container max-w-7xl mx-auto w-full p-4 sm:p-6">
        {/* Search and Filter Bar */}
        <div className="mb-6 flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-10/12">
            <input
              type="text"
              placeholder="Search by job title, company, or location..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input w-full"
            />
          </div>
          <button
            onClick={() => setShowFilterModal(true)}
            className="btn btn-secondary flex items-center justify-center gap-2 w-full md:w-2/12"
          >
            <span className="flex items-center justify-center">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4h18M7 12h10m-9 8h8" /></svg>
              <span className="ml-2">Filters</span>
              {activeFiltersCount > 0 && (
                <span className="ml-2 bg-primary-color text-white text-xs font-semibold rounded-full h-5 w-5 flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </span>
          </button>
        </div>

        {/* Loading and Error States */}
        {loading && (
          <div className="text-center py-10">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-color mx-auto"></div>
            <p className="mt-4 text-lg">Loading Jobs...</p>
          </div>
        )}
        {error && <div className="error-message">{error}</div>}

        {/* Job Listings */}
        {!loading && !error && (
          <>
            <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              Showing {displayedJobs.length} of {filteredJobs.length} jobs
            </div>
            <div className="grid grid-cols-1 gap-4">
              {displayedJobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  onView={() => handleViewJob(job.id)}
                  onApply={() => router.push('/Login')}
                  isGuest={true}
                />
              ))}
            </div>

            {/* No Jobs Found Message */}
            {displayedJobs.length === 0 && (
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
                        salaryRange: 'all',
                        experienceLevel: 'all'
                      });
                      setCurrentPage(1);
                    }}
                    className="btn btn-primary text-sm"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
               <div className="flex justify-center items-center mt-8 space-x-2">
                 <button
                   onClick={() => handlePageChange(currentPage - 1)}
                   disabled={currentPage === 1}
                   className="pagination-btn"
                 >
                   &larr; Previous
                 </button>
                 <span className="text-gray-700 dark:text-gray-300">
                   Page {currentPage} of {totalPages}
                 </span>
                 <button
                   onClick={() => handlePageChange(currentPage + 1)}
                   disabled={currentPage === totalPages}
                   className="pagination-btn"
                 >
                   Next &rarr;
                 </button>
               </div>
             )}
          </>
        )}
      </main>

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold">Filters</h3>
              <button onClick={() => setShowFilterModal(false)} className="text-2xl">&times;</button>
            </div>
            
            <div className="space-y-4">
              {/* Sort by */}
              <div>
                <label className="form-label">Sort by</label>
                <select
                  value={filters.sort}
                  onChange={(e) => setFilters(prev => ({...prev, sort: e.target.value}))}
                  className="form-input"
                >
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                  <option value="salary_high">Salary: High to Low</option>
                  <option value="salary_low">Salary: Low to High</option>
                </select>
              </div>

              {/* Category */}
              <div>
                <label className="form-label">Category</label>
                <select
                  value={filters.category}
                  onChange={(e) => setFilters(prev => ({...prev, category: e.target.value}))}
                  className="form-input"
                >
                  <option value="all">All Categories</option>
                  {jobFields.map((field) => (
                    <option key={field.category_field_id} value={field.category_field_id}>
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
                  onChange={(e) => setFilters(prev => ({...prev, salaryRange: e.target.value}))}
                  className="form-input"
                >
                  <option value="all">All Salary Ranges</option>
                  <option value="0-20000">Up to ₱20,000</option>
                  <option value="20001-40000">₱20,001 - ₱40,000</option>
                  <option value="40001-60000">₱40,001 - ₱60,000</option>
                  <option value="60001-80000">₱60,001 - ₱80,000</option>
                  <option value="80001+">₱80,001 and above</option>
                </select>
              </div>
              
              {/* Experience Level */}
              <div>
                <label className="form-label">Experience Level</label>
                <select
                  value={filters.experienceLevel}
                  onChange={(e) => setFilters(prev => ({...prev, experienceLevel: e.target.value}))}
                  className="form-input"
                >
                  <option value="all">All Experience Levels</option>
                  {experienceLevels.map((level) => (
                    <option key={level.job_seeker_experience_level_id} value={level.job_seeker_experience_level_id}>
                      {level.experience_level_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-6 flex justify-end gap-3">
               <button
                onClick={() => {
                  setFilters({ sort: 'newest', category: 'all', salaryRange: 'all', experienceLevel: 'all' });
                }}
                className="btn btn-secondary"
              >
                Clear
              </button>
              <button onClick={() => setShowFilterModal(false)} className="btn btn-primary">
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 