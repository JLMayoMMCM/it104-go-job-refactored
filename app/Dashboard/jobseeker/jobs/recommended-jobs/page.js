'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import JobCard from '../../../../components/JobCard';
import Pagination from '../../../../components/Pagination';

export default function RecommendedJobs() {
  /* --------------------------- STATE --------------------------- */
  const [rawJobs, setRawJobs] = useState([]);
  const [allJobs, setAllJobs] = useState([]);
  const [experienceLevels, setExperienceLevels] = useState([]);
  const [jobFields, setJobFields] = useState([]);
  const [applicationStatus, setApplicationStatus] = useState({});
  const [savedJobs, setSavedJobs] = useState({});
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [displayedJobs, setDisplayedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [filters, setFilters] = useState({
    sort: 'match_high',
    category: 'all',
    salaryRange: 'all',
    experienceLevel: 'all'
  });
  
  const router = useRouter();
  const jobsPerPage = 10;

  /* ---------------------- INITIAL LOAD ------------------------ */
  useEffect(() => {
    const accountId = localStorage.getItem('accountId');
    const accountType = localStorage.getItem('accountType');
    if (!accountId || accountType !== '2') {
      router.push('/Login');
      return;
    }
    
    // Fetch all necessary data in parallel for faster loading
    Promise.all([
      fetchJobFields(),
      fetchExperienceLevels(),
      fetchApplicationStatus(accountId),
      fetchSavedJobs(accountId)
    ]).then(() => {
      fetchAndProcessRecommendedJobs(accountId);
    });
  }, [router]);

  /* ----------------------- FILTERING -------------------------- */
  useEffect(() => {
    if (loading) return; // Don't filter until initial load is complete
    
    // First filter for match percentage >= 20%
    let list = allJobs.filter(job => (job.match || 0) >= 20);

    // 1. Search Term Filter
    if (searchTerm.trim()) {
      const lowercasedTerm = searchTerm.toLowerCase();
      list = list.filter(j =>
        j.title?.toLowerCase().includes(lowercasedTerm) ||
        j.company?.toLowerCase().includes(lowercasedTerm) ||
        j.location?.toLowerCase().includes(lowercasedTerm)
      );
    }

    // 2. Job Field (Category) Filter
    if (filters.category !== 'all') {
      const fid = String(filters.category);
      list = list.filter(j => j.fieldId === fid);
    }

    // 3. Salary Range Filter
    if (filters.salaryRange !== 'all') {
      const getSal = s => typeof s === 'number' ? s : parseInt(String(s).replace(/[^\d]/g, '')) || 0;
      list = list.filter(j => {
        const s = getSal(j.salary);
        switch (filters.salaryRange) {
          case '0-20000': return s <= 20000;
          case '20001-40000': return s >= 20001 && s <= 40000;
          case '40001-60000': return s >= 40001 && s <= 60000;
          case '60001-80000': return s >= 60001 && s <= 80000;
          case '80001+': return s >= 80001;
          default: return true;
        }
      });
    }

    // 4. Experience Level Filter
    if (filters.experienceLevel !== 'all') {
      list = list.filter(j => String(j.job_experience_level_id) === String(filters.experienceLevel));
    }

    // 5. Sorting
    const getSal = j => typeof j.salary === 'number' ? j.salary : parseInt(String(j.salary).replace(/[^\d]/g, '')) || -1;
    const getMatch = j => j.match || 0;
    list.sort((a, b) => {
      switch (filters.sort) {
        case 'match_high': return getMatch(b) - getMatch(a);
        case 'match_low': return getMatch(a) - getMatch(b);
        case 'newest': return new Date(b.postedDate) - new Date(a.postedDate);
        case 'oldest': return new Date(a.postedDate) - new Date(b.postedDate);
        case 'salary_high': return getSal(b) - getSal(a);
        case 'salary_low': return getSal(a) - getSal(b);
        default: return getMatch(b) - getMatch(a);
      }
    });

    setFilteredJobs(list);
    setCurrentPage(1); // Reset to first page on filter change
  }, [allJobs, searchTerm, filters, loading]);

  /* --------------------- PAGINATION --------------------------- */
  useEffect(() => {
    const start = (currentPage - 1) * jobsPerPage;
    setDisplayedJobs(filteredJobs.slice(start, start + jobsPerPage));
    setTotalPages(Math.ceil(filteredJobs.length / jobsPerPage));
  }, [filteredJobs, currentPage]);

  /* ----------------------- FETCHERS --------------------------- */
  const fetchJobFields = async () => {
    try {
      const r = await fetch('/api/data/job-fields');
      const j = await r.json();
      if (r.ok && j.success) setJobFields(j.data);
    } catch (e) { console.error("Failed to fetch job fields", e); }
  };

  const fetchExperienceLevels = async () => {
    try {
      const r = await fetch('/api/data/experience-levels');
      const j = await r.json();
      if (r.ok && j.success) setExperienceLevels(j.data);
    } catch (e) { console.error("Failed to fetch experience levels", e); }
  };

  const fetchAndProcessRecommendedJobs = async (accountId) => {
    try {
      setLoading(true);

      // Fetch both recommended jobs (for IDs and match scores) and all jobs (for full data)
      const [recRes, allRes] = await Promise.all([
        fetch(`/api/jobseeker/jobs?${new URLSearchParams({ accountId, type: 'recommended', limit: '1000' })}`),
        fetch(`/api/jobseeker/jobs?${new URLSearchParams({ accountId, type: 'search', limit: '5000' })}`)
      ]);

      const recJson = await recRes.json();
      const allJson = await allRes.json();

      if (!recRes.ok) throw new Error(recJson.error || 'Failed to fetch recommended jobs');
      if (!allRes.ok) {
        console.error(allJson.error || 'Failed to fetch all jobs data');
        // If all jobs fails, we can still use the recommended jobs data
        setAllJobs(recJson.data || []);
        return;
      }

      const allJobsMap = new Map((allJson.data || []).map(job => [job.id, job]));

      const enrichedJobs = (recJson.data || []).map(recJob => {
        const fullJobData = allJobsMap.get(recJob.id);
        if (fullJobData) {
          // Create a new object using the full data from the 'search' endpoint
          // and ONLY add the match score from the recommendation data to avoid conflicts.
          return {
            ...fullJobData,
            id: fullJobData.id || fullJobData.job_id,
            title: fullJobData.title || fullJobData.job_name,
            company: fullJobData.company || fullJobData.company_name,
            location: fullJobData.location || fullJobData.job_location,
            type: fullJobData.type || fullJobData.job_type?.job_type_name,
            salary: fullJobData.salary || fullJobData.job_salary,
            experienceLevel: fullJobData.experience_level?.experience_level_name || 
                           getExperienceLevelName(fullJobData.job_experience_level_id),
            match: recJob.matchPercentage || recJob.match || 0,
            fieldId: fullJobData.job_category_list?.[0]?.job_category?.category_field?.category_field_id,
            categories: fullJobData.job_category_list?.map(jcl => ({
              id: jcl.job_category?.job_category_id,
              name: jcl.job_category?.job_category_name
            })) || [],
            field: fullJobData.job_category_list?.[0]?.job_category?.category_field?.category_field_name,
            closingDate: fullJobData.job_closing_date || fullJobData.closingDate,
            jobTime: fullJobData.job_time || fullJobData.jobTime,
            rating: fullJobData.rating || 0,
            posted: fullJobData.posted || fullJobData.postedDate,
            description: fullJobData.description || fullJobData.job_description?.substring(0, 150) + '...'
          };
        }
        // Fallback to the partial recommended job data if not found in the full list
        return {
          ...recJob,
          id: recJob.id || recJob.job_id,
          title: recJob.title || recJob.job_name,
          company: recJob.company || recJob.company_name,
          location: recJob.location || recJob.job_location,
          type: recJob.type || recJob.job_type?.job_type_name,
          salary: recJob.salary || recJob.job_salary,
          experienceLevel: recJob.experience_level?.experience_level_name || 
                         getExperienceLevelName(recJob.job_experience_level_id),
          match: recJob.matchPercentage || recJob.match || 0,
          fieldId: recJob.job_category_list?.[0]?.job_category?.category_field?.category_field_id,
          categories: recJob.job_category_list?.map(jcl => ({
            id: jcl.job_category?.job_category_id,
            name: jcl.job_category?.job_category_name
          })) || [],
          field: recJob.job_category_list?.[0]?.job_category?.category_field?.category_field_name,
          closingDate: recJob.job_closing_date || recJob.closingDate,
          jobTime: recJob.job_time || recJob.jobTime,
          rating: recJob.rating || 0,
          posted: recJob.posted || recJob.postedDate,
          description: recJob.description || recJob.job_description?.substring(0, 150) + '...'
        };
      });
      
      setAllJobs(enrichedJobs);
    } catch (e) {
      setError(e.message);
      console.error('Error fetching recommended jobs:', e);
    } finally {
      setLoading(false);
    }
  };

  const fetchApplicationStatus = async (accountId) => {
    try {
      const r = await fetch(`/api/jobseeker/applications?accountId=${accountId}`);
      const j = await r.json();
      if (r.ok && j.success) {
        const map = {};
        j.data.forEach(a => {
          if (!map[a.jobId]) map[a.jobId] = [];
          map[a.jobId].push(a);
        });
        setApplicationStatus(map);
      }
    } catch (e) { console.error("Failed to fetch application status", e); }
  };

  const fetchSavedJobs = async (accountId) => {
    try {
      setLoadingSaved(true);
      const r = await fetch(`/api/jobseeker/saved-jobs?accountId=${accountId}`);
      const j = await r.json();
      if (r.ok && j.success) {
        const map = {};
        j.data.forEach(s => {
          const i = s.job_id ?? s.jobId;
          if (i != null) map[i] = true;
        });
        setSavedJobs(map);
      }
    } catch (e) { console.error("Failed to fetch saved jobs", e); } finally { setLoadingSaved(false); }
  };

  /* --------------------- HANDLERS ----------------------------- */
  const handlePageChange = (p) => {
    setCurrentPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  
  const handleViewJob = (id) => router.push(`/Dashboard/jobseeker/jobs/${id}`);

  const handleSaveJob = async (id) => {
    try {
      const accountId = localStorage.getItem('accountId');
      if (!accountId) return;
      
      const isCurrentlySaved = savedJobs[id];
      // Optimistic UI update
      setSavedJobs(prev => ({ ...prev, [id]: !isCurrentlySaved }));
      setSuccess(isCurrentlySaved ? 'Job unsaved!' : 'Job saved!');
      setTimeout(() => setSuccess(''), 2000);
      
      const response = await fetch('/api/jobseeker/saved-jobs', {
        method: isCurrentlySaved ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jobId: id, accountId }),
      });

      if (!response.ok) {
        // Revert on failure
        setSavedJobs(prev => ({ ...prev, [id]: isCurrentlySaved }));
        setError("Failed to update saved status.");
        setTimeout(() => setError(null), 3000);
      }
    } catch (e) { console.error(e); }
  };
  
  const handleApplySuccess = (jobId) => {
    const accountId = localStorage.getItem('accountId');
    fetchApplicationStatus(accountId); // Re-fetch all statuses
  };

  const handleClearFilters = () => {
    setFilters({
      sort: 'match_high',
      category: 'all',
      salaryRange: 'all',
      experienceLevel: 'all'
    });
  };

  /* --------------------- UTILITIES ---------------------------- */
  const getSalaryRangeLabel = (range) => {
    switch (range) {
      case '0-20000': return 'Below ₱20,000';
      case '20001-40000': return '₱20,001 - ₱40,000';
      case '40001-60000': return '₱40,001 - ₱60,000';
      case '60001-80000': return '₱60,001 - ₱80,000';
      case '80001+': return 'Above ₱80,000';
      default: return range.replace('_', ' ');
    }
  };

  // Map experience level IDs to their display names
  const getExperienceLevelName = (levelId) => {
    const levelMap = {
      1: "Entry Level",
      2: "Mid Level",
      3: "Senior Level",
      4: "Managerial Level",
      5: "Executive Level"
    };
    return levelMap[levelId] || "Not specified";
  };

  /* ------------------------ RENDER ---------------------------- */
  const renderPagination = () => {
    if (totalPages <= 1) return null;
    return (
      <div className="px-6 py-4 border-t border-[var(--border-color)] flex flex-col sm:flex-row items-center justify-between">
        <div className="text-sm text-[var(--text-light)] mb-2 sm:mb-0">Page {currentPage} of {totalPages}</div>
        <div className="flex space-x-2">
          <button disabled={currentPage === 1} onClick={() => handlePageChange(currentPage - 1)} className="btn-page">Prev</button>
          {[...Array(totalPages)].map((_, i) => (
            <button key={i} onClick={() => handlePageChange(i + 1)} className={currentPage === i + 1 ? "btn-page-active" : "btn-page"}>{i + 1}</button>
          ))}
          <button disabled={currentPage === totalPages} onClick={() => handlePageChange(currentPage + 1)} className="btn-page">Next</button>
        </div>
      </div>
    );
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
        <h1 className="text-heading">Recommended Jobs</h1>
        <p className="text-description">Jobs that match your skills and preferences.</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="success-message">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-[var(--success-color)]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <div className="text-sm text-[var(--success-color)]">
                <p>{success}</p>
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
                  placeholder="Search recommended jobs..."
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
          {(filters.category !== 'all' || filters.salaryRange !== 'all' || filters.sort !== 'match_high') && (
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
              {filters.sort !== 'match_high' && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-[var(--light-color)] bg-opacity-30 text-[var(--foreground)]">
                  Sort: {filters.sort === 'salary_high' ? 'Highest Salary' : filters.sort === 'salary_low' ? 'Lowest Salary' : filters.sort === 'newest' ? 'Newest First' : 'Oldest First'}
                  <button
                    onClick={() => setFilters(prev => ({ ...prev, sort: 'match_high' }))}
                    className="ml-1 text-[var(--foreground)] hover:text-[var(--accent-color)]"
                  >
                    ×
                  </button>
                </span>
              )}
              <button
                onClick={() => setFilters({
                  sort: 'match_high',
                  category: 'all',
                  salaryRange: 'all',
                  experienceLevel: 'all'
                })}
                className="text-xs text-[var(--error-color)] hover:text-[var(--error-color)] underline"
              >
                Clear all
              </button>
            </div>
          )}
          
          {/* Results count */}
          <div className="text-sm text-[var(--text-light)]">
            Found {filteredJobs.length} recommended job{filteredJobs.length !== 1 ? 's' : ''} {searchTerm && `for "${searchTerm}"`}
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
                if (accountId) {
                  fetchAndProcessRecommendedJobs(accountId);
                }
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
                <div className="space-y-2 h-[40vh] w-full overflow-y-auto pr-2 scrollbar-hide">
                  {displayedJobs.map(job => (
                    <JobCard
                      key={job.id}
                      job={job}
                      applicationStatus={applicationStatus[job.id]}
                      saved={!!savedJobs[job.id]}
                      loadingSaved={loadingSaved}
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
                  No recommended jobs found matching your criteria.
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

      {/* Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--card-background)] p-6 rounded-lg shadow-lg max-w-lg w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">Filter Recommended Jobs</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Sort by</label>
                <select
                  value={filters.sort}
                  onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value }))}
                  className="form-input"
                >
                  <option value="match_high">Highest Match</option>
                  <option value="match_low">Lowest Match</option>
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="salary_high">Highest Salary</option>
                  <option value="salary_low">Lowest Salary</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Job Field</label>
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
                <label className="block text-sm font-medium text-[var(--foreground)] mb-1">Salary Range</label>
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
            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setFilters({
                    sort: 'match_high',
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