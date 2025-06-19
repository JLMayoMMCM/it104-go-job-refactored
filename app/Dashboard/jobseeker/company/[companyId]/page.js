'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ViewCompany() {
  const [company, setCompany] = useState(null);
  const [recentJobs, setRecentJobs] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [rating, setRating] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');
  const [followLoading, setFollowLoading] = useState(false);
  const [ratingLoading, setRatingLoading] = useState(false);
  const router = useRouter();
  const params = useParams();
  const companyId = params.companyId;

  useEffect(() => {
    const accountId = localStorage.getItem('accountId');
    const accountType = localStorage.getItem('accountType');
    
    if (!accountId || accountType !== '2') {
      router.push('/Login');
      return;
    }
    
    fetchCompanyData(companyId, accountId);
  }, [router, companyId]);

  // Filter jobs by search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredJobs(recentJobs);
    } else {
      const lower = searchTerm.toLowerCase();
      setFilteredJobs(
        recentJobs.filter(job =>
          job.title?.toLowerCase().includes(lower)
        )
      );
    }
  }, [searchTerm, recentJobs]);

  const fetchCompanyData = async (companyId, accountId) => {
    try {
      setError(null);
      setLoading(true);
      
      const response = await fetch(`/api/jobseeker/company/${companyId}?accountId=${accountId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch company data');
      }
      
      setCompany(data.company);
      setRecentJobs(data.recentJobs);
      setIsFollowing(data.isFollowing);
      setRating(data.userRating);
      
    } catch (error) {
      console.error('Error fetching company data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowCompany = async () => {
    const accountId = localStorage.getItem('accountId');
    if (!accountId) {
      setError('Please log in to follow companies');
      return;
    }

    setFollowLoading(true);
    try {
      if (isFollowing) {
        // Unfollow
        const response = await fetch(`/api/jobseeker/company/${companyId}/follow?accountId=${accountId}`, {
          method: 'DELETE',
        });
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to unfollow company');
        }
        
        setIsFollowing(false);
        setSuccessMessage(data.message);
      } else {
        // Follow
        const response = await fetch(`/api/jobseeker/company/${companyId}/follow`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ accountId }),
        });
        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(data.error || 'Failed to follow company');
        }
        
        setIsFollowing(true);
        setSuccessMessage(data.message);
      }
      
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      console.error('Error following/unfollowing company:', error);
      setError(error.message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setFollowLoading(false);
    }
  };

  const handleRateCompany = async (newRating) => {
    const accountId = localStorage.getItem('accountId');
    if (!accountId) {
      setError('Please log in to rate companies');
      return;
    }

    setRatingLoading(true);
    try {
      const response = await fetch(`/api/jobseeker/company/${companyId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          accountId, 
          rating: newRating 
        }),
      });
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to rate company');
      }
      
      setRating(newRating);
      setSuccessMessage(data.message + ' - Rating updated! Refreshing company rating...');
      
      // Refresh the company data to get the updated average rating
      setTimeout(async () => {
        try {
          await fetchCompanyData(companyId, accountId);
          setSuccessMessage('Rating updated successfully! Company rating has been refreshed.');
          setTimeout(() => setSuccessMessage(''), 3000);
        } catch (error) {
          console.error('Error refreshing company data:', error);
          setSuccessMessage('Rating updated, but failed to refresh company rating. Please refresh the page.');
          setTimeout(() => setSuccessMessage(''), 5000);
        }
      }, 1000);
    } catch (error) {
      console.error('Error rating company:', error);
      setError(error.message);
      setTimeout(() => setError(null), 3000);
    } finally {
      setRatingLoading(false);
    }
  };

  const handleViewJob = (jobId) => {
    router.push(`/Dashboard/jobseeker/jobs/${jobId}`);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)]"></div>
      </div>
    );
  }

  if (error || !company) {
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
              <h3 className="text-sm font-medium text-[var(--error-color)]">Error loading company details</h3>
              <div className="mt-2 text-sm text-[var(--error-color)]">
                <p>{error || 'Company not found'}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => router.push('/Dashboard/jobseeker')}
                  className="btn btn-secondary"
                >
                  Back to Dashboard
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
        <div className="flex flex-col md:flex-row items-center md:items-start">
          <div className="w-24 h-24 bg-[var(--border-color)] rounded-full flex items-center justify-center mb-4 md:mb-0 md:mr-6">
            {company.logo ? (
              <img
                src={`data:image/jpeg;base64,${company.logo}`}
                alt={`${company.name} Logo`}
                className="w-full h-full rounded-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/Assets/Logo.png';
                }}
              />
            ) : (
              <img
                src="/Assets/Logo.png"
                alt={`${company.name} Logo`}
                className="w-full h-full rounded-full object-cover"
              />
            )}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-heading" style={{ color: 'white' }}>{company.name}</h1>
            <div className="flex justify-center md:justify-start items-center mb-4">
              {[...Array(5)].map((_, i) => (
                <svg
                  key={i}
                  className={`w-5 h-5 ${
                    i < Math.floor(company.rating)
                      ? 'text-[var(--warning-color)]'
                      : 'text-[var(--border-color)]'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span style={{ color: 'white' }} className="ml-2">({company.rating.toFixed(1)})</span>
            </div>
            <p className="mb-4" style={{ color: 'white' }}>{company.location}</p>
            <div className="button-group flex-wrap justify-center md:justify-start">
              <button
                onClick={handleFollowCompany}
                disabled={followLoading}
                className={`btn btn-primary ${isFollowing ? 'bg-green-600 hover:bg-green-700' : ''} ${followLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {followLoading ? 'Loading...' : (isFollowing ? 'Following' : 'Follow Company')}
              </button>
              {company.website && (
                <a 
                  href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="btn btn-secondary"
                >
                  Visit Website
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="success-message">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-[var(--success-color)]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
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

      {/* Company Details */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Column 1: About Company & Rate */}
        <div className="flex flex-col h-[560px] max-h-[560px] gap-4">
          {/* About Section - 2/3 of space */}
          <div className="card overflow-hidden" style={{ height: 'calc(66.67% - 8px)' }}>
            <div className="panel-header">
              <h3 className="text-subheading" style={{ color: 'white' }}>About {company.name}</h3>
            </div>
            <div className="h-full flex flex-col">
              <div className="p-6 overflow-y-auto scrollbar-hide flex-1">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                  <div>
                    <p className="text-sm text-[var(--text-light)]">Location</p>
                    <p className="font-medium text-[var(--foreground)]">{company.location}</p>
                  </div>
                  {company.email && (
                    <div>
                      <p className="text-sm text-[var(--text-light)]">Email</p>
                      <p className="font-medium text-[var(--foreground)]">{company.email}</p>
                    </div>
                  )}
                  {company.phone && (
                    <div>
                      <p className="text-sm text-[var(--text-light)]">Phone</p>
                      <p className="font-medium text-[var(--foreground)]">{company.phone}</p>
                    </div>
                  )}
                  {company.website && (
                    <div>
                      <p className="text-sm text-[var(--text-light)]">Website</p>
                      <p className="font-medium">
                        <a 
                          href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-[var(--primary-color)] hover:text-[var(--secondary-color)]"
                        >
                          {company.website}
                        </a>
                      </p>
                    </div>
                  )}
                </div>
                {company.description && (
                  <p className="text-description leading-relaxed">{company.description}</p>
                )}
              </div>
            </div>
          </div>
          {/* Rate Company - 1/3 of space */}
          <div className="card overflow-hidden" style={{ height: 'calc(33.33% - 8px)' }}>
            <div className="panel-header">
              <h3 className="text-subheading" style={{ color: 'white' }}>Rate {company.name}</h3>
              <p style={{ color: 'white', opacity: 0.8 }}>Share your experience with this company</p>
            </div>
            <div className="h-full flex flex-col">
              <div className="p-6 overflow-y-auto scrollbar-hide flex-1">
                <div className="mb-4">
                  <div className="flex items-center">
                    {[...Array(5)].map((_, i) => {
                      const ratingValue = i + 1;
                      return (
                        <button
                          key={i}
                          onClick={() => handleRateCompany(ratingValue)}
                          disabled={ratingLoading}
                          className={`text-2xl mr-1 focus:outline-none ${
                            ratingValue <= rating ? 'text-yellow-400' : 'text-gray-300'
                          } ${ratingLoading ? 'opacity-50 cursor-not-allowed' : 'hover:text-yellow-400'}`}
                        >
                          <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </button>
                      );
                    })}
                  </div>
                </div>
                {rating > 0 && (
                  <p className="text-description">You've rated {company.name} {rating}/5 stars</p>
                )}
                {ratingLoading && (
                  <p className="text-description text-[var(--primary-color)]">Saving your rating...</p>
                )}
              </div>
            </div>
          </div>
        </div>
        {/* Column 2: Recent Job Postings */}
        <div>
          <div className="card overflow-hidden h-[560px] max-h-[560px] flex flex-col">
            <div className="panel-header flex items-center justify-between">
              <h3 className="text-subheading" style={{ color: 'white' }}>Recent Job Postings at {company.name}</h3>
              {/* Search bar beside title */}
              <div className="relative w-64">
                <input
                  type="text"
                  placeholder="Search job title..."
                  className="form-input pr-10"
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <svg className="absolute right-3 top-3.5 w-5 h-5 text-[var(--text-light)] pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
            </div>
            <div className="p-6 flex-1 overflow-y-auto scrollbar-hide">
              {filteredJobs.length > 0 ? (
                <div className="space-y-6">
                  {filteredJobs.map(job => (
                    <div key={job.id} className="job-card">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h4 className="job-card-title">{job.title}</h4>
                          <div className="space-y-1">
                            <div className="flex items-center text-[var(--text-light)] text-sm">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                              {job.location}
                            </div>
                            <div className="flex items-center text-[var(--text-light)] text-sm">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                              </svg>
                              {job.type}
                            </div>
                            <div className="flex items-center text-[var(--text-light)] text-sm">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Posted {job.posted}
                            </div>
                            <div className="flex items-center text-[var(--text-light)] text-sm">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              {job.salary}
                            </div>
                            <div className="flex items-center text-[var(--text-light)] text-sm">
                              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              Experience: {job.experienceLevel}
                            </div>
                          </div>
                        </div>
                        <button
                          onClick={() => handleViewJob(job.id)}
                          className="mt-3 btn btn-primary text-sm"
                        >
                          View Job
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[var(--text-light)] text-center py-8">No recent job postings available.</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
