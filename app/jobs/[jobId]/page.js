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

export default function JobDetails() {
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
      
      const response = await fetch(`/api/jobseeker/jobs/${jobId}`);
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
      router.push(`/company/${job.companyId}`);
    } else {
      console.error('Company ID not found on job object');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-color"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-20">
        <p className="text-red-500">{error}</p>
        <button onClick={handleBack} className="mt-4 btn btn-primary">Go Back</button>
      </div>
    );
  }

  if (!job) {
    return (
      <div className="text-center py-20">
        <p>Job not found.</p>
        <button onClick={handleBack} className="mt-4 btn btn-primary">Go Back</button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <header className="bg-white dark:bg-gray-800 shadow-sm sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex justify-between items-center">
          <button onClick={handleBack} className="btn btn-secondary">
            &larr; Back to Jobs
          </button>
          <button 
            onClick={() => router.push('/Login')}
            className="btn btn-primary"
          >
            Login to Apply
          </button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg overflow-hidden">
          {/* Job Header */}
          <div className="p-6 md:p-8 border-b border-gray-200 dark:border-gray-700">
            <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white">{job.title}</h1>
            <div className="mt-2 flex items-center space-x-4 text-gray-500 dark:text-gray-400">
              <p className="cursor-pointer hover:underline" onClick={handleViewCompany}>{job.companyName}</p>
              <span>&bull;</span>
              <p>{job.location}</p>
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
                <ExperienceLevelBadge level={job.experienceLevel || "Not specified"} />
                <span className="bg-gray-100 text-gray-800 rounded-full px-3 py-1 text-xs font-medium">{job.jobType}</span>
                {job.salary && (
                    <span className="bg-green-100 text-green-800 rounded-full px-3 py-1 text-xs font-medium">
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
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-3">Job Description</h2>
                  <div 
                    className="prose prose-sm lg:prose-base max-w-none text-gray-600 dark:text-gray-300" 
                    dangerouslySetInnerHTML={{ __html: job.description }} 
                  />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-gray-800 dark:text-white mb-3">Qualifications</h2>
                  <div 
                    className="prose prose-sm lg:prose-base max-w-none text-gray-600 dark:text-gray-300" 
                    dangerouslySetInnerHTML={{ __html: job.qualifications }} 
                  />
                </div>
              </div>

              {/* Right Column: Company Info */}
              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                  <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3">About {job.companyName}</h3>
                  <div className="flex items-center space-x-3 mb-4">
                    <img src={job.companyLogo || '/Assets/Logo.png'} alt={`${job.companyName} logo`} className="w-12 h-12 rounded-md object-contain" />
                    <button onClick={handleViewCompany} className="text-primary-color font-semibold hover:underline">
                      View Company Profile
                    </button>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {job.companyDescription?.substring(0, 150) || "No description available."}...
                  </p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                    <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-3">Job Overview</h3>
                    <ul className="text-sm text-gray-600 dark:text-gray-300 space-y-2">
                        <li><strong>Posted:</strong> {new Date(job.postedDate).toLocaleDateString()}</li>
                        <li><strong>Location:</strong> {job.location}</li>
                        <li><strong>Job Type:</strong> {job.jobType}</li>
                        {job.categoryName && <li><strong>Category:</strong> {job.categoryName}</li>}
                    </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
} 