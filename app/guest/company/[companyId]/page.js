'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import GuestJobCard from '../../../components/GuestJobCard';

function Star({ index, rating }) {
  const isFilled = index < Math.round(rating);
  const getStarColor = () => isFilled ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600';
  
  return (
    <svg className={`w-5 h-5 ${getStarColor()}`} fill="currentColor" viewBox="0 0 20 20">
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.16c.969 0 1.371 1.24.588 1.81l-3.363 2.44a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.363-2.44a1 1 0 00-1.175 0l-3.363 2.44c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.245 9.384c-.783-.57-.38-1.81.588-1.81h4.16a1 1 0 00.95-.69L9.049 2.927z" />
    </svg>
  );
}

function StarRating({ rating }) {
  const starCount = Math.max(0, Math.floor(rating));
  return (
    <div className="flex items-center">
      {[...Array(starCount)].map((_, i) => <Star key={i} index={i} rating={starCount} />)}
    </div>
  );
}

export default function GuestViewCompany() {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const router = useRouter();
  const params = useParams();
  const companyId = params.companyId;

  useEffect(() => {
    if (companyId) {
      fetchCompanyData(companyId);
    }
  }, [companyId]);

  const fetchCompanyData = async (companyId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/jobseeker/company/${companyId}`, { cache: 'no-store' });
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch company data');
      }
      setCompany(result.data);
    } catch (err) {
      console.error('Error fetching company data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleViewJob = (jobId) => {
    router.push(`/guest/jobs/${jobId}`);
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-[var(--primary-color)]"></div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="error-container text-center py-10">
        <p className="text-[var(--error-color)]">Error: {error}</p>
        <button onClick={() => router.back()} className="mt-4 btn btn-primary">Go Back</button>
      </div>
    );
  }
  
  if (!company) {
    return (
      <div className="text-center py-10 text-[var(--text-light)]">
        <p>Company not found.</p>
        <button onClick={() => router.back()} className="mt-4 btn btn-primary">Go Back</button>
      </div>
    );
  }

  const {
    company_name, company_logo, location, company_website,
    average_rating, total_ratings, company_description,
    jobs = [], reviews = []
  } = company;

  return (
    <div className="flex-1 py-8 px-6 sm:px-8 lg:px-10">
      <main className="w-full">
        {/* Back Button */}
        <div className="mb-4">
          <button onClick={() => router.back()} className="inline-flex items-center gap-1 text-sm py-2 px-6 min-w-[100px] justify-center bg-[var(--primary-color)] text-white rounded-md hover:bg-[var(--primary-hover)] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back</span>
          </button>
        </div>
        
        {/* Header */}
        <div className="card mb-6">
          <div className="flex flex-col md:flex-row items-center gap-6 p-6">
            <img
              src={company_logo ? `data:image/png;base64,${company_logo}` : '/Assets/Logo.png'}
              alt={`${company_name} Logo`}
              className="w-24 h-24 rounded-full border-4 border-[var(--border-color)] object-cover shadow-md"
            />
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-[var(--foreground)]">{company_name}</h1>
              <p className="text-[var(--text-light)]">{location}</p>
              {company_website && (
                <a href={company_website} target="_blank" rel="noopener noreferrer" className="text-[var(--primary-color)] hover:underline">
                  {company_website}
                </a>
              )}
              <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                <StarRating rating={average_rating} />
                <span className="text-[var(--text-light)] text-sm">
                  ({(typeof average_rating === 'number' ? average_rating.toFixed(1) : 'N/A')} from {total_ratings} reviews)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="card mb-6">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">About {company_name}</h2>
            <p className="text-[var(--text-light)] whitespace-pre-wrap">{company_description}</p>
          </div>
        </div>
        
        {/* Job Postings */}
        <div className="card mb-6">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">Active Job Postings ({jobs.length})</h2>
            {jobs.length > 0 ? (
              <div className="space-y-2 h-[40vh] w-full overflow-y-auto pr-2 scrollbar-hide border border-[var(--border-color)] rounded-lg p-4 bg-[var(--background)]">
                {jobs.map(job => (
                  <GuestJobCard 
                    key={job.id || job.job_id} 
                    job={{
                      ...job,
                      id: job.job_id || job.id // Ensure id is available for the view handler
                    }} 
                    onView={() => handleViewJob(job.job_id || job.id)}
                  />
                ))}
              </div>
            ) : (
              <p className="text-[var(--text-light)] p-4 border border-[var(--border-color)] rounded-lg bg-[var(--background)]">
                No active job postings from this company.
              </p>
            )}
          </div>
        </div>
        
        {/* Reviews Section */}
        <div className="card mb-6">
          <div className="p-6">
            <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">Reviews ({reviews.length})</h2>
            {reviews.length > 0 ? (
              <div className="space-y-4 h-[40vh] w-full overflow-y-auto pr-2 scrollbar-hide border border-[var(--border-color)] rounded-lg p-4 bg-[var(--background)]">
                {reviews.map((review, i) => (
                  <div key={i} className="p-4 border border-[var(--border-color)] rounded-lg bg-[var(--card-background)]">
                    <div className="flex items-center mb-2">
                      <img src={review.author_avatar || '/Assets/Logo.png'} className="w-10 h-10 rounded-full mr-3" alt="avatar" />
                      <div>
                        <p className="font-semibold text-[var(--foreground)]">{review.author_name}</p>
                        <StarRating rating={review.rating} />
                      </div>
                    </div>
                    <p className="text-[var(--text-light)]">{review.review_text || "No review text."}</p>
                    <p className="text-xs text-[var(--text-light)] mt-2">{new Date(review.rating_date).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[var(--text-light)] p-4 border border-[var(--border-color)] rounded-lg bg-[var(--background)]">
                No reviews for this company yet.
              </p>
            )}
          </div>
        </div>
      </main>
    </div>
  );
} 