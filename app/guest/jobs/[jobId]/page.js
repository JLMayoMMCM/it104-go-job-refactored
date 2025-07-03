'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

function ExperienceLevelBadge({ level }) {
  const map = {
    "Entry Level": "bg-blue-100 text-blue-800",
    "Mid Level": "bg-green-100 text-green-800",
    "Senior Level": "bg-orange-100 text-orange-800",
    "Managerial Level": "bg-purple-100 text-purple-800",
    "Executive Level": "bg-red-100 text-red-800",
    "Not specified": "bg-gray-100 text-gray-800",
  };
  const className = map[level] || map["Not specified"];
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${className}`}>
      {level}
    </span>
  );
}

export default function GuestJobDetails() {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId;

  useEffect(() => {
    if (jobId) {
      fetchJobDetails(jobId);
    }
  }, [jobId]);

  const fetchJobDetails = async (jobId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/guest/jobs/${jobId}`);
      const data = await response.json();
      
      if (!response.ok) throw new Error(data.error || 'Failed to fetch job details');
      
      if (data.success && data.data) {
        setJob(data.data);
      } else {
        throw new Error('Job data not found');
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    router.back();
  };

  const handleViewCompany = () => {
    if (job && job.companyId) {
      router.push(`/guest/company/${job.companyId}`);
    } else {
      console.error('Company ID not found on job object');
    }
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
      <div className="error-container text-center py-20">
        <p className="text-[var(--error-color)]">{error}</p>
        <button onClick={handleBack} className="mt-4 btn btn-primary">Go Back</button>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-20 text-[var(--text-light)]">
        <p>Job not found.</p>
        <button onClick={handleBack} className="mt-4 btn btn-primary">Go Back</button>
      </div>
    );
  }

  return (
    <div className="flex-1 py-8 px-6 sm:px-8 lg:px-10">
      <main className="w-full">
        {/* Back Button */}
        <div className="mb-4">
          <button onClick={handleBack} className="inline-flex items-center gap-1 text-sm py-2 px-6 min-w-[120px] justify-center bg-[var(--primary-color)] text-white rounded-md hover:bg-[var(--primary-hover)] transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span>Back to Jobs</span>
          </button>
        </div>
        
        <div className="card">
          {/* Job Header */}
          <div className="p-6 md:p-8 border-b border-[var(--border-color)]">
            <h1 className="text-3xl font-extrabold text-[var(--foreground)]">{job.title}</h1>
            <div className="mt-2 flex items-center space-x-4 text-[var(--text-light)]">
              <p className="cursor-pointer hover:underline" onClick={handleViewCompany}>{job.company}</p>
              <span>&bull;</span>
              <p>{job.location}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
                <ExperienceLevelBadge level={job.experienceLevel || "Not specified"} />
                <span className="bg-gray-100 text-gray-800 rounded-full px-3 py-1 text-xs font-medium dark:bg-gray-700 dark:text-gray-300">{job.jobType}</span>
                {job.salary && (
                    <span className="bg-green-100 text-green-800 rounded-full px-3 py-1 text-xs font-medium dark:bg-green-900 dark:text-green-200">
                        ₱{Number(job.salary).toLocaleString()}
                    </span>
                )}
            </div>
          </div>

          {/* Job Body */}
          <div className="p-6 md:p-8">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Left Column: Description */}
              <div className="md:col-span-2 space-y-6">
                <div>
                  <h2 className="text-xl font-bold text-[var(--foreground)] mb-3">Job Description</h2>
                  <div 
                    className="prose prose-sm lg:prose-base max-w-none text-[var(--text-light)] bg-[var(--background)] p-4 rounded-lg border border-[var(--border-color)] h-[20vh] overflow-y-auto" 
                    dangerouslySetInnerHTML={{ __html: job.description }} 
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-[var(--foreground)] mb-3">Requirements</h2>
                  <div 
                    className="prose prose-sm lg:prose-base max-w-none text-[var(--text-light)] bg-[var(--background)] p-4 rounded-lg border border-[var(--border-color)] h-[15vh] overflow-y-auto" 
                    dangerouslySetInnerHTML={{ __html: job.requirements }} 
                  />
                </div>
                {job.benefits && (
                  <div>
                    <h2 className="text-xl font-bold text-[var(--foreground)] mb-3">Benefits</h2>
                    <div 
                      className="prose prose-sm lg:prose-base max-w-none text-[var(--text-light)] bg-[var(--background)] p-4 rounded-lg border border-[var(--border-color)] h-[15vh] overflow-y-auto" 
                      dangerouslySetInnerHTML={{ __html: job.benefits }} 
                    />
                  </div>
                )}
              </div>

              {/* Right Column: Company Info */}
              <div className="space-y-6">
                <div className="bg-[var(--light-color)] dark:bg-[var(--card-background)] p-4 rounded-lg border border-[var(--border-color)]">
                  <h3 className="text-lg font-bold text-[var(--foreground)] mb-3">About {job.company}</h3>
                  <div className="flex items-center space-x-3 mb-4">
                    <img src={job.companyLogo || '/Assets/Logo.png'} alt={`${job.company} logo`} className="w-12 h-12 rounded-md object-contain bg-white p-1" />
                    <button onClick={handleViewCompany} className="text-[var(--primary-color)] font-semibold hover:underline">
                      View Company Profile
                    </button>
                  </div>
                  <p className="text-sm text-[var(--text-light)]">
                    {job.companyDescription?.substring(0, 150) || "No description available."}...
                  </p>
                </div>
                <div className="bg-[var(--light-color)] dark:bg-[var(--card-background)] p-4 rounded-lg border border-[var(--border-color)]">
                    <h3 className="text-lg font-bold text-[var(--foreground)] mb-3">Job Overview</h3>
                    <ul className="text-sm text-[var(--text-light)] space-y-2">
                        <li><strong>Posted:</strong> {new Date(job.postedDate).toLocaleDateString()}</li>
                        <li><strong>Location:</strong> {job.location}</li>
                        <li><strong>Job Type:</strong> {job.jobType}</li>
                        {job.categoryName && <li><strong>Category:</strong> {job.categoryName}</li>}
                        {job.closingDate && <li><strong>Application Deadline:</strong> {new Date(job.closingDate).toLocaleDateString()}</li>}
                        {job.jobTime && <li><strong>Working Hours:</strong> {job.jobTime}</li>}
                    </ul>
                </div>
                <div className="bg-[var(--primary-color)] text-white p-4 rounded-lg text-center">
                  <p className="font-semibold mb-2">Interested in this job?</p>
                  <button 
                    onClick={() => router.push('/Login')}
                    className="bg-white text-[var(--primary-color)] hover:bg-gray-100 py-2 px-4 rounded-md font-medium w-full transition-colors"
                  >
                    Login to Apply
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 