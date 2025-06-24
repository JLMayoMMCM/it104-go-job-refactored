'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import JobCard from '../../../../components/JobCard'; // Assuming JobCard is here

function StarRating({ rating, onRate, loading }) {
  return (
    <div className="flex items-center">
      {[...Array(5)].map((_, i) => (
        <svg
          key={i}
          onClick={() => !loading && onRate(i + 1)}
          className={`w-5 h-5 cursor-pointer ${
            i < rating ? 'text-yellow-400' : 'text-gray-300'
          } ${loading ? 'cursor-not-allowed' : ''}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.16c.969 0 1.371 1.24.588 1.81l-3.363 2.44a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.363-2.44a1 1 0 00-1.175 0l-3.363 2.44c-.784.57-1.838-.197-1.539-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.245 9.384c-.783-.57-.38-1.81.588-1.81h4.16a1 1 0 00.95-.69L9.049 2.927z" />
        </svg>
      ))}
    </div>
  );
}

export default function ViewCompany() {
  const [company, setCompany] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  
  const router = useRouter();
  const params = useParams();
  const companyId = params.companyId;

  useEffect(() => {
    const accountId = localStorage.getItem('accountId');
    fetchCompanyData(companyId, accountId);
  }, [companyId]);

  const fetchCompanyData = async (companyId, accountId) => {
    setLoading(true);
    setError(null);
    try {
      const url = accountId 
        ? `/api/jobseeker/company/${companyId}?accountId=${accountId}`
        : `/api/jobseeker/company/${companyId}`;
      
      const response = await fetch(url, { cache: 'no-store' });
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

  const handleFollowToggle = async () => {
    const accountId = localStorage.getItem('accountId');
    if (!accountId) {
      router.push('/Login');
      return;
    }

    const wasFollowing = company.isFollowing;

    try {
      const response = await fetch(`/api/jobseeker/company/${companyId}/follow`, {
        method: wasFollowing ? 'DELETE' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to update follow status.');
      }
      
      if (wasFollowing) {
        setSuccessMessage('Unfollowed successfully! Redirecting...');
        setTimeout(() => {
          router.push('/Dashboard/jobseeker/company/followed');
        }, 1500);
      } else {
        setCompany(prev => ({ ...prev, isFollowing: !prev.isFollowing }));
        setSuccessMessage(result.message);
        setTimeout(() => setSuccessMessage(''), 3000);
      }

    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 3000);
    }
  };

  const handleRateCompany = async (newRating) => {
    const accountId = localStorage.getItem('accountId');
    if (!accountId) {
      router.push('/Login');
      return;
    }

    try {
      const response = await fetch(`/api/jobseeker/company/${companyId}/rate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountId, rating: newRating, review_text: '' }), // review_text can be added later
      });

      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to submit rating.');
      }

      setSuccessMessage('Rating submitted successfully! Refreshing...');
      await fetchCompanyData(companyId, accountId);
      setSuccessMessage('Rating updated!');
      setTimeout(() => setSuccessMessage(''), 3000);
      
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 3000);
    }
  };
  
  if (loading) return <div className="text-center py-10">Loading...</div>;
  if (error) return <div className="text-center py-10 text-red-500">Error: {error}</div>;
  if (!company) return <div className="text-center py-10">Company not found.</div>;

  const {
    company_name, company_logo, location, company_website,
    average_rating, total_ratings, company_description,
    jobs, reviews, isFollowing, userRating
  } = company;

  return (
    <div className="space-y-6">
      {successMessage && <div className="success-message">{successMessage}</div>}
      
      {/* Header */}
      <div className="profile-header p-6">
        <div className="flex flex-col md:flex-row items-center gap-6">
          <img
            src={company_logo ? `data:image/png;base64,${company_logo}` : '/Assets/Logo.png'}
            alt={`${company_name} Logo`}
            className="w-24 h-24 rounded-full border-4 border-white/20 object-cover shadow-md"
          />
          <div className="flex-1 text-center md:text-left text-white-all">
            <h1 className="text-3xl font-bold">{company_name}</h1>
            <p className="text-white/80">{location}</p>
            {company_website && (
              <a href={company_website} target="_blank" rel="noopener noreferrer" className="text-white hover:underline">
                {company_website}
              </a>
            )}
            <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
              <StarRating rating={average_rating} onRate={() => {}} />
              <span className="text-white/80 text-sm">({(typeof average_rating === 'number' ? average_rating.toFixed(1) : parseFloat(average_rating || 0).toFixed(1))} from {total_ratings} reviews)</span>
            </div>
          </div>
          <div className="flex flex-col gap-2 items-center">
            <button onClick={handleFollowToggle} className="btn btn-primary min-w-[120px]">
              {isFollowing ? 'Unfollow' : 'Follow'}
            </button>
          </div>
        </div>
      </div>

      {/* About Section */}
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">About {company_name}</h2>
        <p className="text-[var(--text-light)] whitespace-pre-wrap">{company_description}</p>
      </div>
      
      {/* Rate Company Section */}
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-2 text-[var(--foreground)]">Rate This Company</h2>
        <p className="text-sm text-[var(--text-light)] mb-4">
          {userRating ? `You rated this company ${userRating.rating} stars.` : "You haven't rated this company yet."}
        </p>
        <StarRating rating={userRating?.rating || 0} onRate={handleRateCompany} />
      </div>

      {/* Job Postings */}
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">Active Job Postings ({jobs.length})</h2>
        <div className="space-y-4 max-h-[40rem] overflow-y-auto pr-2">
          {jobs.length > 0 ? jobs.map(job => (
            <JobCard key={job.id} job={job} showSave={true} showApply={true} showView={true} />
          )) : <p className="text-[var(--text-light)]">No active job postings from this company.</p>}
        </div>
      </div>
      
      {/* Reviews Section */}
      <div className="card p-6">
        <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">Reviews ({reviews.length})</h2>
        <div className="space-y-4">
          {reviews.length > 0 ? reviews.map((review, i) => (
            <div key={i} className="p-4 border border-[var(--border-color)] rounded-lg bg-white/50">
              <div className="flex items-center mb-2">
                <img src={review.author_avatar || '/Assets/Logo.png'} className="w-10 h-10 rounded-full mr-3" />
                <div>
                  <p className="font-semibold text-[var(--foreground)]">{review.author_name}</p>
                  <StarRating rating={review.rating} onRate={()=>{}} />
                </div>
              </div>
              <p className="text-[var(--text-light)]">{review.review_text || "No review text."}</p>
              <p className="text-xs text-gray-500 mt-2">{new Date(review.rating_date).toLocaleDateString()}</p>
            </div>
          )) : <p className="text-[var(--text-light)]">No reviews for this company yet.</p>}
        </div>
      </div>
    </div>
  );
}
