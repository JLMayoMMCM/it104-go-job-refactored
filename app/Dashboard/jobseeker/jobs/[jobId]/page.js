'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ViewJob() {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [hasApplied, setHasApplied] = useState(false);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId;

  useEffect(() => {
    const accountId = localStorage.getItem('accountId');
    const accountType = localStorage.getItem('accountType');
    
    if (!accountId || accountType !== '2') {
      router.push('/Login');
      return;
    }
    
    fetchJobData(jobId, accountId);
  }, [router, jobId]);

  const fetchJobData = async (jobId, accountId) => {
    try {
      setError(null);
      const response = await fetch(`/api/jobseeker/jobs/${jobId}?accountId=${accountId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch job details');
      }
      
      if (data.success && data.data) {
        setJob(data.data.job);
        setIsSaved(data.data.isSaved || false);
        setHasApplied(data.data.hasApplied || false);
      } else {
        throw new Error('Job data not found');
      }
    } catch (error) {
      console.error('Error fetching job data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveJob = async () => {
    try {
      const accountId = localStorage.getItem('accountId');
      const method = isSaved ? 'DELETE' : 'POST';
      const response = await fetch(`/api/jobseeker/saved-jobs`, {
        method: method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ jobId, accountId }),
      });
      
      if (response.ok) {
        setIsSaved(!isSaved);
        if (!isSaved) {
          setSuccessMessage('Job saved successfully!');
          setTimeout(() => setSuccessMessage(''), 2000);
        } else {
          setSuccessMessage('Job removed from saved list.');
          setTimeout(() => setSuccessMessage(''), 2000);
        }
      } else {
        throw new Error('Failed to update saved status');
      }
    } catch (error) {
      console.error('Error saving job:', error);
      setError('Failed to save job. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleApplyJob = () => {
    if (hasApplied) return;
    setShowApplyModal(true);
  };

  const handleSubmitApplication = async () => {
    try {
      const accountId = localStorage.getItem('accountId');
      const response = await fetch(`/api/jobseeker/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          jobId, 
          accountId, 
          coverLetter: coverLetter || 'I am interested in this position and would like to apply.'
        }),
      });
      
      if (response.ok) {
        setHasApplied(true);
        setShowApplyModal(false);
        setSuccessMessage('Your application has been submitted successfully!');
        setCoverLetter('');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        throw new Error('Failed to submit application');
      }
    } catch (error) {
      console.error('Error submitting application:', error);
      setError('Failed to submit application. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleViewCompany = () => {
    if (job && job.companyId) {
      router.push(`/Dashboard/jobseeker/company/${job.companyId}`);
    } else {
      setError('Company information not available.');
      setTimeout(() => setError(''), 2000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800">Error loading job details</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error || 'Job not found'}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => router.push('/Dashboard/jobseeker/jobs/all-jobs')}
                  className="bg-red-100 px-4 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                >
                  View All Jobs
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
          <div className="w-20 h-20 bg-gray-300 rounded-full flex items-center justify-center mb-4 md:mb-0 md:mr-6">
            <img
              src={job.companyLogo || '/Assets/Logo.png'}
              alt={`${job.company} Logo`}
              className="w-full h-full rounded-full object-cover"
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = '/Assets/Logo.png';
              }}
            />
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold mb-2">{job.title}</h1>
            <p className="text-lg mb-1">{job.company}</p>
            <div className="flex justify-center md:justify-start items-center mb-4 text-yellow-400">
              {[...Array(5)].map((_, i) => (
                <svg key={i} className={`w-5 h-5 ${i < Math.floor(job.companyRating || 0) ? 'text-yellow-400' : 'text-gray-300'}`} fill="currentColor" viewBox="0 0 20 20">
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
              <span className="text-gray-300 ml-2">({(job.companyRating || 0).toFixed(1)})</span>
            </div>
            <div className="flex flex-wrap justify-center md:justify-start gap-3 mb-4">
              <div className="flex items-center text-gray-300 text-sm">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {job.location || 'Not specified'}
              </div>
              <div className="flex items-center text-gray-300 text-sm">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                {job.type || 'Not specified'}
              </div>
              <div className="flex items-center text-gray-300 text-sm">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {job.salary || 'Not specified'}
              </div>
              <div className="flex items-center text-gray-300 text-sm">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Posted {job.posted || 'N/A'}
              </div>
            </div>
            {typeof job.match === 'number' && (
              <div className="mt-2 text-sm text-green-200 bg-green-900 bg-opacity-30 inline-block px-3 py-1 rounded-full">
                {job.match}% Match
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Success/Error Messages */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <div className="text-sm text-green-700">
                <p>{successMessage}</p>
              </div>
            </div>
          </div>
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <div className="text-sm text-red-700">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3">
        <button onClick={handleSaveJob} className={`btn btn-primary px-6 py-2 font-medium ${isSaved ? 'bg-blue-400' : ''}`}>
          {isSaved ? 'Saved' : 'Save Job'}
        </button>
        <button onClick={handleApplyJob} className={`btn btn-primary px-6 py-2 font-medium ${hasApplied ? 'bg-gray-400' : 'bg-green-600 hover:bg-green-700'}`} disabled={hasApplied}>
          {hasApplied ? 'Applied' : 'Apply Now'}
        </button>
        <button onClick={handleViewCompany} className="btn btn-secondary px-6 py-2 font-medium">
          View Company
        </button>
      </div>

      {/* Job Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Description */}
          <div className="card">
            <div className="panel-header">
              <h3 className="text-lg font-semibold">Job Description</h3>
            </div>
            <div className="p-6">
              <div className="prose max-w-none">
                <p className="text-[var(--foreground)] leading-relaxed whitespace-pre-line">
                  {job.description || 'No description provided for this job.'}
                </p>
              </div>
            </div>
          </div>
          
          {/* Requirements */}
          <div className="card">
            <div className="panel-header">
              <h3 className="text-lg font-semibold">Requirements</h3>
            </div>
            <div className="p-6">
              <div className="prose max-w-none">
                <ul className="space-y-2">
                  {job.requirements ? job.requirements.split('\n').filter(Boolean).map((req, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="w-5 h-5 text-green-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      <span className="text-[var(--foreground)]">{req}</span>
                    </li>
                  )) : (
                    <li className="text-[var(--text-light)] italic">No specific requirements listed.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
          
          {/* Benefits */}
          <div className="card">
            <div className="panel-header">
              <h3 className="text-lg font-semibold">Benefits</h3>
            </div>
            <div className="p-6">
              <div className="prose max-w-none">
                <ul className="space-y-2">
                  {job.benefits ? job.benefits.split('\n').filter(Boolean).map((benefit, index) => (
                    <li key={index} className="flex items-start">
                      <svg className="w-5 h-5 text-blue-600 mr-2 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <span className="text-[var(--foreground)]">{benefit}</span>
                    </li>
                  )) : (
                    <li className="text-[var(--text-light)] italic">No specific benefits listed.</li>
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
        
        {/* Right Column */}
        <div className="lg:col-span-1">
          <div className="card sticky top-6">
            <div className="panel-header">
              <h3 className="text-lg font-semibold">Job Summary</h3>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm text-[var(--text-light)]">Posted Date</p>
                <p className="font-medium text-[var(--foreground)]">{job.posted || 'N/A'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-light)]">Location</p>
                <p className="font-medium text-[var(--foreground)]">{job.location || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-light)]">Job Type</p>
                <p className="font-medium text-[var(--foreground)]">{job.type || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-light)]">Salary</p>
                <p className="font-medium text-[var(--foreground)]">{job.salary || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-light)]">Experience Level</p>
                <p className="font-medium text-[var(--foreground)]">{job.experienceLevel || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-light)]">Category</p>
                <p className="font-medium text-[var(--foreground)]">{job.category || 'Not specified'}</p>
              </div>
              <div>
                <p className="text-sm text-[var(--text-light)]">Field</p>
                <p className="font-medium text-[var(--foreground)]">{job.field || 'Not specified'}</p>
              </div>
              {typeof job.match === 'number' && (
                <div>
                  <p className="text-sm text-[var(--text-light)]">Profile Match</p>
                  <div className="w-full bg-gray-200 rounded-full h-2.5">
                    <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${job.match}%` }}></div>
                  </div>
                  <p className="text-sm font-medium text-green-700">{job.match}% Match</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50">
          <div className="modal-content">
            <h2 className="text-xl font-bold mb-4">Apply for {job.title}</h2>
            <p className="text-[var(--text-light)] mb-4">at {job.company}</p>
            <div className="mb-4">
              <label className="form-label">Cover Letter (optional)</label>
              <textarea 
                value={coverLetter} 
                onChange={(e) => setCoverLetter(e.target.value)} 
                placeholder="Enter your cover letter or a brief message. A default message will be sent if left empty." 
                className="form-textarea"
              ></textarea>
            </div>
            <div className="button-group">
              <button onClick={() => setShowApplyModal(false)} className="btn btn-secondary">Cancel</button>
              <button onClick={handleSubmitApplication} className="btn btn-primary">Submit Application</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
