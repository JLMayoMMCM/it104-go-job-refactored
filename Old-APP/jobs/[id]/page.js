'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import CompanyRating from '@/components/CompanyRating';
import React from 'react';

export default function JobDetailsPage({ params }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [job, setJob] = useState(null);
  const [company, setCompany] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isApplying, setIsApplying] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [showApplicationForm, setShowApplicationForm] = useState(false);

  // Unwrap params using React.use()
  const routeParams = React.use(params);

  useEffect(() => {
    loadJobDetails();
  }, [routeParams.id]);

  const loadJobDetails = async () => {
    try {
      const token = localStorage.getItem('authToken');
      
      // Load user data if logged in
      if (token) {
        try {
          const userResponse = await fetch('/api/auth/me', {
            headers: { 'Authorization': `Bearer ${token}` }
          });
          if (userResponse.ok) {
            const userData = await userResponse.json();
            setUser(userData);
          }
        } catch (error) {
          console.log('User not logged in or token invalid');
        }
      }

      // Load job details
      const jobResponse = await fetch(`/api/jobs/${routeParams.id}`, {
        headers: token ? { 'Authorization': `Bearer ${token}` } : {}
      });

      if (jobResponse.ok) {
        const jobData = await jobResponse.json();
        setJob(jobData);
        // Handle company data that may be nested in the job object
        setCompany(jobData.company || {
          company_id: jobData.company_id,
          company_name: jobData.company_name,
          company_rating: jobData.company_rating,
          company_logo: jobData.company_logo,
          company_description: jobData.company_description,
          company_website: jobData.company_website
        });
        setHasApplied(jobData.hasApplied || false);
        setIsSaved(jobData.isSaved || false);
      } else {
        setError('Job not found');
      }
    } catch (error) {
      setError('Error loading job details');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyForJob = async () => {
    if (!user) {
      router.push('/Login');
      return;
    }

    if (!user.isJobSeeker) {
      setError('Only job seekers can apply for jobs');
      return;
    }

    setIsApplying(true);
    setError('');

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/jobs/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          jobId: job.job_id,
          coverLetter: coverLetter.trim()
        })
      });

      if (response.ok) {
        setSuccess('Application submitted successfully!');
        setHasApplied(true);
        setShowApplicationForm(false);
        setCoverLetter('');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to submit application');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsApplying(false);
    }
  };

  const handleSaveJob = async () => {
    if (!user) {
      router.push('/Login');
      return;
    }

    if (!user.isJobSeeker) {
      setError('Only job seekers can save jobs');
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/jobs/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ jobId: job.job_id })
      });

      if (response.ok) {
        setIsSaved(!isSaved);
        setSuccess(isSaved ? 'Job removed from saved jobs' : 'Job saved successfully!');
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to save job');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  const handleRatingSubmitted = (newAverageRating) => {
    setCompany(prev => ({
      ...prev,
      company_rating: newAverageRating
    }));
    setJob(prev => ({
      ...prev,
      company_rating: newAverageRating
    }));
    setSuccess('Rating submitted successfully!');
    setTimeout(() => setSuccess(''), 3000);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen text-lg">Loading...</div>;
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader user={user} />
        <div className="flex justify-center items-center h-96">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Job Not Found</h2>
            <button
              onClick={() => router.push('/jobs')}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700"
            >
              Browse Jobs
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={user} />
      
      <main className="p-8 max-w-4xl mx-auto">
        {error && (
          <div className="bg-red-100 text-red-800 p-3 rounded-md mb-4 border border-red-200">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 text-green-800 p-3 rounded-md mb-4 border border-green-200">
            {success}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Job Details */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">{job.job_name}</h1>
                  <p className="text-xl text-gray-600">{company?.company_name}</p>
                  <p className="text-gray-500">{job.job_location}</p>
                </div>
                <div className="text-right">
                  {job.job_salary && (
                    <p className="text-2xl font-bold text-green-600">
                      ₱{parseFloat(job.job_salary).toLocaleString()}
                    </p>
                  )}
                  <p className="text-sm text-gray-500">{job.job_type_name}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2 mb-6">
                {job.categories?.map(category => (
                  <span key={category.job_category_id} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                    {category.job_category_name}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-50 rounded-lg">
                <div>
                  <p className="text-sm text-gray-500">Posted</p>
                  <p className="font-medium">{new Date(job.job_posted_date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Positions</p>
                  <p className="font-medium">{job.job_quantity}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Type</p>
                  <p className="font-medium">{job.job_type_name}</p>
                </div>
                {job.job_closing_date && (
                  <div>
                    <p className="text-sm text-gray-500">Closes</p>
                    <p className="font-medium">{new Date(job.job_closing_date).toLocaleDateString()}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Job Description */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Job Description</h2>
              <div className="prose max-w-none">
                <p className="text-gray-700 whitespace-pre-line">{job.job_description}</p>
              </div>
            </div>

            {/* Requirements */}
            {job.job_requirements && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Requirements</h2>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-line">{job.job_requirements}</p>
                </div>
              </div>
            )}

            {/* Benefits */}
            {job.job_benefits && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h2 className="text-xl font-bold text-gray-900 mb-4">Benefits</h2>
                <div className="prose max-w-none">
                  <p className="text-gray-700 whitespace-pre-line">{job.job_benefits}</p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="lg:col-span-1">
            {/* Company Info */}
            <div className="bg-white rounded-lg shadow-md p-6 mb-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">About the Company</h3>
              {company?.company_logo && (
                <img 
                  src={`data:image/jpeg;base64,${company.company_logo}`} 
                  alt="Company Logo" 
                  className="w-20 h-20 object-contain mb-4"
                />
              )}
              <h4 className="font-semibold text-gray-900">{company?.company_name}</h4>
              {company?.company_description && (
                <p className="text-gray-600 mt-2">{company.company_description}</p>
              )}
              {company?.company_website && (
                <a 
                  href={company.company_website} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline mt-2 block"
                >
                  Visit Website
                </a>
              )}
            </div>

            {/* Action Buttons */}
            {user?.isJobSeeker && (
              <div className="bg-white rounded-lg shadow-md p-6 mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Actions</h3>
                
                {hasApplied ? (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                    <p className="text-green-800 font-medium">✓ Application Submitted</p>
                    <p className="text-green-600 text-sm">You have already applied for this job</p>
                  </div>
                ) : job.job_is_active ? (
                  <>
                    {!showApplicationForm ? (
                      <button
                        onClick={() => setShowApplicationForm(true)}
                        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors mb-3"
                      >
                        Apply for This Job
                      </button>
                    ) : (
                      <div className="mb-4">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Cover Letter (Optional)
                        </label>
                        <textarea
                          value={coverLetter}
                          onChange={(e) => setCoverLetter(e.target.value)}
                          rows="4"
                          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          placeholder="Tell the employer why you're interested in this position..."
                        />
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={handleApplyForJob}
                            disabled={isApplying}
                            className="flex-1 bg-green-600 text-white py-2 px-4 rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
                          >
                            {isApplying ? 'Applying...' : 'Submit Application'}
                          </button>
                          <button
                            onClick={() => setShowApplicationForm(false)}
                            className="flex-1 bg-gray-600 text-white py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                    <p className="text-red-800 font-medium">Job Closed</p>
                    <p className="text-red-600 text-sm">This job is no longer accepting applications</p>
                  </div>
                )}

                <button
                  onClick={handleSaveJob}
                  className={`w-full py-2 px-4 rounded-lg border transition-colors ${
                    isSaved 
                      ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100' 
                      : 'bg-gray-50 border-gray-200 text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  {isSaved ? '❤️ Saved' : '🤍 Save Job'}
                </button>
              </div>
            )}

            {!user && (
              <div className="bg-white rounded-lg shadow-md p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Interested?</h3>
                <p className="text-gray-600 mb-4">Sign in to apply for this job</p>
                <button
                  onClick={() => router.push('/Login')}
                  className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Sign In to Apply
                </button>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
