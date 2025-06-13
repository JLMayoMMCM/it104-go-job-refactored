'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import JobCard from '@/components/JobCard';

export default function JobsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [jobs, setJobs] = useState([]);
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [jobTypes, setJobTypes] = useState([]);
  const [jobCategories, setJobCategories] = useState([]);
  const [categoryFields, setCategoryFields] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showRecommended, setShowRecommended] = useState(false);
  const [totalJobs, setTotalJobs] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedJobType, setSelectedJobType] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedField, setSelectedField] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [showFilters, setShowFilters] = useState(false);

  useEffect(() => {
    loadUserData();
    loadJobData();
    loadFilterOptions();
  }, []);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isRecommended = urlParams.get('recommended') === 'true';
    setShowRecommended(isRecommended);
    
    if (isRecommended) {
      loadRecommendedJobs();
    } else {
      loadJobs();
    }
  }, []);

  useEffect(() => {
    applyFilters();
  }, [jobs, searchTerm, selectedJobType, selectedCategory, selectedField, locationFilter, salaryMin, salaryMax, sortBy]);

  const loadUserData = async () => {
    try {
      const token = localStorage.getItem('authToken');
      if (token) {
        const response = await fetch('/api/auth/me', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        if (response.ok) {
          const userData = await response.json();
          setUser(userData);
        }
      }
    } catch (error) {
      console.error('Error loading user data:', error);
    }
  };

  const loadFilterOptions = async () => {
    try {
      // Load job types
      const typesResponse = await fetch('/api/job-types');
      if (typesResponse.ok) {
        const typesData = await typesResponse.json();
        setJobTypes(typesData);
      }

      // Load job categories
      const categoriesResponse = await fetch('/api/job-categories');
      if (categoriesResponse.ok) {
        const categoriesData = await categoriesResponse.json();
        setJobCategories(categoriesData);
      }

      // Load category fields
      const fieldsResponse = await fetch('/api/category-fields');
      if (fieldsResponse.ok) {
        const fieldsData = await fieldsResponse.json();
        setCategoryFields(fieldsData);
      }
    } catch (error) {
      console.error('Error loading filter options:', error);
    }
  };

  const loadJobData = async (page = 1) => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '12',
        search: searchTerm,
        location: locationFilter,
        jobType: selectedJobType,
        category: selectedCategory,
        sortBy: sortBy
      });

      if (salaryMin) params.append('salaryMin', salaryMin);
      if (salaryMax) params.append('salaryMax', salaryMax);

      const response = await fetch(`/api/jobs?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        if (page === 1) {
          setJobs(data.jobs || []);
        } else {
          setJobs(prev => [...prev, ...(data.jobs || [])]);
        }
        setTotalJobs(data.pagination?.totalJobs || 0);
        setHasMore(data.pagination?.hasNext || false);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadJobs = () => {
    loadJobData(1);
  };

  const loadRecommendedJobs = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/jobs/recommended', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const data = await response.json();
        setJobs(data.jobs || data);
        setTotalJobs(data.jobs?.length || data.length || 0);
      }
    } catch (error) {
      console.error('Error loading recommended jobs:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const applyFilters = () => {
    let filtered = [...jobs];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(job => 
        job.job_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.job_description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.company_name.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply job type filter
    if (selectedJobType) {
      filtered = filtered.filter(job => job.job_type_name === selectedJobType);
    }

    // Apply category filter
    if (selectedCategory) {
      filtered = filtered.filter(job => 
        job.job_categories && job.job_categories.includes(selectedCategory)
      );
    }

    // Apply field filter
    if (selectedField) {
      filtered = filtered.filter(job => 
        job.category_fields && job.category_fields.includes(selectedField)
      );
    }

    // Apply location filter
    if (locationFilter) {
      filtered = filtered.filter(job => 
        job.job_location.toLowerCase().includes(locationFilter.toLowerCase())
      );
    }

    // Apply salary filters
    if (salaryMin) {
      filtered = filtered.filter(job => 
        job.job_salary && parseFloat(job.job_salary) >= parseFloat(salaryMin)
      );
    }

    if (salaryMax) {
      filtered = filtered.filter(job => 
        job.job_salary && parseFloat(job.job_salary) <= parseFloat(salaryMax)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'salary_high':
          return (parseFloat(b.job_salary) || 0) - (parseFloat(a.job_salary) || 0);
        case 'salary_low':
          return (parseFloat(a.job_salary) || 0) - (parseFloat(b.job_salary) || 0);
        case 'company_rating':
          return (parseFloat(b.company_rating) || 0) - (parseFloat(a.company_rating) || 0);
        case 'oldest':
          return new Date(a.job_posted_date) - new Date(b.job_posted_date);
        default: // newest
          return new Date(b.job_posted_date) - new Date(a.job_posted_date);
      }
    });

    setFilteredJobs(filtered);
  };

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedJobType('');
    setSelectedCategory('');
    setSelectedField('');
    setLocationFilter('');
    setSalaryMin('');
    setSalaryMax('');
    setSortBy('newest');
  };

  const loadMore = () => {
    if (hasMore && !isLoading) {
      loadJobData(currentPage + 1);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={user} />
      
      <main className="p-8 max-w-7xl mx-auto">
        {/* Header Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-800">
                {showRecommended ? 'Recommended Jobs' : 'Browse Jobs'}
              </h1>
              <p className="text-gray-600 mt-2">
                {showRecommended 
                  ? 'Jobs tailored to your preferences' 
                  : `${totalJobs} job opportunities available`
                }
              </p>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => {
                  setShowRecommended(false);
                  loadJobs();
                  window.history.pushState({}, '', '/jobs');
                }}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  !showRecommended 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All Jobs
              </button>
              {user?.isJobSeeker && (
                <button
                  onClick={() => {
                    setShowRecommended(true);
                    loadRecommendedJobs();
                    window.history.pushState({}, '', '/jobs?recommended=true');
                  }}
                  className={`px-4 py-2 rounded-lg transition-colors ${
                    showRecommended 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  Recommended
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Search and Filter Section */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          {/* Search Bar */}
          <div className="flex flex-col md:flex-row gap-4 mb-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search jobs, companies, or keywords..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="bg-gray-600 text-white px-6 py-3 rounded-lg hover:bg-gray-700 transition-colors flex items-center gap-2"
              >
                <span>🔍</span>
                {showFilters ? 'Hide Filters' : 'Show Filters'}
              </button>
              <button
                onClick={clearFilters}
                className="bg-red-600 text-white px-6 py-3 rounded-lg hover:bg-red-700 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>

          {/* Filter Options */}
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              {/* Job Type Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Job Type</label>
                <select
                  value={selectedJobType}
                  onChange={(e) => setSelectedJobType(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Types</option>
                  {jobTypes.map(type => (
                    <option key={type.job_type_id} value={type.job_type_name}>
                      {type.job_type_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Category Field Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Field</label>
                <select
                  value={selectedField}
                  onChange={(e) => setSelectedField(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Fields</option>
                  {categoryFields.map(field => (
                    <option key={field.category_field_id} value={field.category_field_name}>
                      {field.category_field_name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Job Category Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Categories</option>
                  {jobCategories
                    .filter(cat => !selectedField || cat.category_field_name === selectedField)
                    .map(category => (
                      <option key={category.job_category_id} value={category.job_category_name}>
                        {category.job_category_name}
                      </option>
                    ))}
                </select>
              </div>

              {/* Location Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                <input
                  type="text"
                  placeholder="Enter location"
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Salary Range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Min Salary</label>
                <input
                  type="number"
                  placeholder="₱ 0"
                  value={salaryMin}
                  onChange={(e) => setSalaryMin(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Max Salary</label>
                <input
                  type="number"
                  placeholder="₱ 999,999"
                  value={salaryMax}
                  onChange={(e) => setSalaryMax(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="newest">Newest First</option>
                  <option value="oldest">Oldest First</option>
                  <option value="salary_high">Salary: High to Low</option>
                  <option value="salary_low">Salary: Low to High</option>
                  <option value="company_rating">Company Rating</option>
                </select>
              </div>

              {/* Apply Filters Button */}
              <div className="flex items-end">
                <button
                  onClick={loadJobs}
                  className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Apply Filters
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Results Summary */}
        <div className="flex justify-between items-center mb-6">
          <p className="text-gray-600">
            Showing {filteredJobs.length} of {totalJobs} jobs
            {showRecommended && (
              <span className="ml-2 text-blue-600 font-medium">
                (Personalized recommendations)
              </span>
            )}
          </p>
          <div className="text-sm text-gray-500">
            {searchTerm && (
              <span>Search: "{searchTerm}" • </span>
            )}
            {selectedJobType && (
              <span>Type: {selectedJobType} • </span>
            )}
            {selectedCategory && (
              <span>Category: {selectedCategory} • </span>
            )}
            {locationFilter && (
              <span>Location: {locationFilter} • </span>
            )}
            {showRecommended ? 'Ordered by preference match' : `Sorted by: ${sortBy.replace('_', ' ')}`}
          </div>
        </div>

        {/* Recommendation Info Banner */}
        {showRecommended && user?.isJobSeeker && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-start">
              <div className="text-blue-600 mr-3 text-xl">🎯</div>
              <div>
                <h4 className="font-semibold text-blue-800 mb-2">How recommendations work</h4>
                <div className="text-blue-700 text-sm space-y-1">
                  <p><span className="font-medium">⭐ Perfect Match:</span> Jobs in your preferred categories</p>
                  <p><span className="font-medium">✨ Similar Field:</span> Jobs in related fields to your preferences</p>
                  <p><span className="font-medium">📊 Ordering:</span> Preference match → Company rating → Latest posted</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Jobs Grid */}
        {isLoading && filteredJobs.length === 0 ? (
          <div className="flex justify-center items-center py-12">
            <div className="text-lg text-gray-600">Loading jobs...</div>
          </div>
        ) : filteredJobs.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-6xl mb-4">🔍</div>
            <h3 className="text-xl font-semibold text-gray-800 mb-2">No jobs found</h3>
            <p className="text-gray-600 mb-6">
              Try adjusting your search criteria or clearing the filters.
            </p>
            <button
              onClick={clearFilters}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6 mb-8">
              {filteredJobs.map(job => (
                <JobCard 
                  key={job.job_id} 
                  job={job} 
                  showPreferenceMatch={showRecommended}
                />
              ))}
            </div>

            {/* Load More Button */}
            {hasMore && !showRecommended && (
              <div className="text-center">
                <button
                  onClick={loadMore}
                  disabled={isLoading}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                >
                  {isLoading ? 'Loading...' : 'Load More Jobs'}
                </button>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}