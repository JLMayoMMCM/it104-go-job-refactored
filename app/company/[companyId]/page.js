'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import JobCard from '../../components/JobCard';

function Star({ index, rating }) {
  const isFilled = index < Math.round(rating);
  const getStarColor = () => isFilled ? 'text-yellow-400' : 'text-gray-300';
  
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

export default function ViewCompany() {
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
    router.push(`/jobs/${jobId}`);
  };
  
  if (loading) return <div className="text-center py-10">Loading...</div>;
  if (error) return <div className="text-center py-10 text-red-500">Error: {error}</div>;
  if (!company) return <div className="text-center py-10">Company not found.</div>;

  const {
    company_name, company_logo, location, company_website,
    average_rating, total_ratings, company_description,
    jobs = [], reviews = []
  } = company;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
            <button onClick={() => router.back()} className="btn btn-secondary">
                &larr; Back
            </button>
            <button onClick={() => router.push('/Login')} className="btn btn-primary">
                Login
            </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto py-8 px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <img
              src={company_logo ? `data:image/png;base64,${company_logo}` : '/Assets/Logo.png'}
              alt={`${company_name} Logo`}
              className="w-24 h-24 rounded-full border-4 border-gray-200 dark:border-gray-700 object-cover shadow-md"
            />
            <div className="flex-1 text-center md:text-left">
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{company_name}</h1>
              <p className="text-gray-500 dark:text-gray-400">{location}</p>
              {company_website && (
                <a href={company_website} target="_blank" rel="noopener noreferrer" className="text-primary-color hover:underline">
                  {company_website}
                </a>
              )}
              <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                <StarRating rating={average_rating} />
                <span className="text-gray-500 dark:text-gray-400 text-sm">
                  ({(typeof average_rating === 'number' ? average_rating.toFixed(1) : 'N/A')} from {total_ratings} reviews)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* About Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">About {company_name}</h2>
          <p className="text-gray-600 dark:text-gray-300 whitespace-pre-wrap">{company_description}</p>
        </div>
        
        {/* Job Postings */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Active Job Postings ({jobs.length})</h2>
          <div className="space-y-4 max-h-[25rem] overflow-y-auto pr-2">
            {jobs.length > 0 ? jobs.map(job => (
              <JobCard 
                key={job.id} 
                job={job} 
                onView={() => handleViewJob(job.job_id)}
                isPublic={true}
              />
            )) : <p className="text-gray-500 dark:text-gray-400">No active job postings from this company.</p>}
          </div>
        </div>
        
        {/* Reviews Section */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <h2 className="text-xl font-bold mb-4 text-gray-800 dark:text-white">Reviews ({reviews.length})</h2>
          <div className="space-y-4 max-h-[25rem] overflow-y-auto pr-2">
            {reviews.length > 0 ? reviews.map((review, i) => (
              <div key={i} className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg">
                <div className="flex items-center mb-2">
                  <img src={review.author_avatar || '/Assets/Logo.png'} className="w-10 h-10 rounded-full mr-3" alt="avatar" />
                  <div>
                    <p className="font-semibold text-gray-800 dark:text-white">{review.author_name}</p>
                    <StarRating rating={review.rating} />
                  </div>
                </div>
                <p className="text-gray-600 dark:text-gray-400">{review.review_text || "No review text."}</p>
                <p className="text-xs text-gray-500 mt-2">{new Date(review.rating_date).toLocaleDateString()}</p>
              </div>
            )) : <p className="text-gray-500 dark:text-gray-400">No reviews for this company yet.</p>}
          </div>
        </div>
      </main>
    </div>
  );
} 