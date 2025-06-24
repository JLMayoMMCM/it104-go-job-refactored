'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

function ExperienceLevelBadge({ level }) {
  const map = {
    "Entry Level": {
      className: "bg-blue-100 text-blue-800 border border-blue-300 rounded-full px-3 py-0.5 text-xs font-normal flex items-center gap-1",
      icon: "🟦",
      style: { fontStyle: "italic" }
    },
    "Mid Level": {
      className: "bg-green-50 text-green-800 border border-green-400 rounded-full px-3 py-0.5 text-xs font-normal flex items-center gap-1",
      icon: "🟩",
      style: {}
    },
    "Senior Level": {
      className: "bg-gradient-to-r from-orange-100 to-orange-200 text-orange-900 border border-orange-300 rounded-lg px-3 py-0.5 text-xs font-bold flex items-center gap-1 shadow-sm",
      icon: "🟧",
      style: { fontWeight: "bold" }
    },
    "Managerial Level": {
      className: "bg-purple-100 text-purple-800 border border-purple-300 rounded-full px-3 py-0.5 text-xs font-semibold flex items-center gap-1",
      icon: "👔",
      style: {}
    },
    "Executive Level": {
      className: "bg-red-100 text-red-800 border-2 border-red-400 rounded-full px-3 py-0.5 text-xs font-extrabold flex items-center gap-1 shadow-lg",
      icon: "👑",
      style: { textShadow: "0 1px 2px #fff" }
    },
    "Not specified": {
      className: "bg-gray-100 text-gray-800 border border-gray-300 rounded px-3 py-0.5 text-xs font-normal flex items-center gap-1",
      icon: "❔",
      style: {}
    }
  };
  const { className, icon, style } = map[level] || map["Not specified"];
  return (
    <span className={className} style={style}>
      <span>{icon}</span>
      <span>{level}</span>
    </span>
  );
}

export default function JobDetails() {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [applicationStatus, setApplicationStatus] = useState(null); // 'apply', 'pending', 'accepted', 'rejected'
  const [isSaved, setIsSaved] = useState(false);
  
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId;

  // Initial load - fetch job details and application status
  useEffect(() => {
    const accountId = localStorage.getItem('accountId');
    const accountType = localStorage.getItem('accountType');
    
    if (!accountId || accountType !== '2') {
      router.push('/Login');
      return;
    }
    
    fetchJobDetails(accountId, jobId);
    fetchApplicationStatus(accountId, jobId);
  }, [router, jobId]);

  const fetchJobDetails = async (accountId, jobId) => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`/api/jobseeker/jobs/${jobId}?accountId=${accountId}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch job details');
      }
      
      if (data.success && data.data) {
        setJob(data.data);
        // Set the saved status from the API response
        if (typeof data.isSaved === 'boolean') {
          setIsSaved(data.isSaved);
        }
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

  const fetchApplicationStatus = async (accountId, jobId) => {
    try {
      // Fetch all applications for this job and jobseeker
      const response = await fetch(`/api/jobseeker/applications/status?accountId=${accountId}&jobId=${jobId}`);
      const data = await response.json();

      // data.status can be a string or an array of applications
      // We'll support both for backward compatibility
      if (response.ok && data.success) {
        let status = 'apply';
        if (Array.isArray(data.applications)) {
          // New API: array of applications with status fields
          const apps = data.applications;
          if (apps.some(app => app.status === 'Accepted' || app.status === 'accepted')) {
            status = 'accepted';
          } else if (apps.some(app => app.status === 'In-progress' || app.status === 'pending')) {
            status = 'pending';
          } else if (apps.length === 0 || apps.every(app => app.status === 'Rejected' || app.status === 'rejected')) {
            status = 'apply';
          }
        } else if (typeof data.status === 'string') {
          // Old API: single status string
          if (data.status === 'accepted') status = 'accepted';
          else if (data.status === 'pending') status = 'pending';
          else if (data.status === 'rejected') status = 'apply';
          else status = 'apply';
        }
        setApplicationStatus(status);
      }
    } catch (error) {
      console.error('Error fetching application status:', error);
    }
  };


  const handleBack = () => {
    router.back();
  };

  const handleSaveJob = async () => {
    try {
      const accountId = localStorage.getItem('accountId');
      if (isSaved) {
        // Unsave job
        const response = await fetch(`/api/jobseeker/saved-jobs`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jobId, accountId }),
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          setIsSaved(false);
          setSuccessMessage('Job unsaved successfully!');
          setTimeout(() => setSuccessMessage(''), 2000);
        } else {
          throw new Error(data.error || 'Failed to unsave job');
        }
      } else {
        // Save job
        const response = await fetch(`/api/jobseeker/saved-jobs`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jobId, accountId }),
        });
        
        const data = await response.json();
        
        if (response.ok && data.success) {
          setIsSaved(true);
          setSuccessMessage('Job saved successfully!');
          setTimeout(() => setSuccessMessage(''), 2000);
        } else {
          throw new Error(data.error || 'Failed to save job');
        }
      }
    } catch (error) {
      console.error('Error handling job save/unsave:', error);
      setError('Failed to update job status. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleApply = () => {
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
      
      const data = await response.json();
      
      if (response.ok && data.success) {
        setShowApplyModal(false);
        setCoverLetter('');
        setSuccessMessage('Your application has been submitted successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
        setApplicationStatus('pending');
      } else {
        throw new Error(data.error || 'Failed to submit application');
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
      console.error('Company ID not found on job object');
      setError('Could not navigate to company page: Company ID is missing.');
      setTimeout(() => setError(''), 3000);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)]"></div>
      </div>
    );
  }

  if (error) {
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
              <h3 className="text-sm font-medium text-[var(--error-color)]">Error loading job details</h3>
              <div className="mt-2 text-sm text-[var(--error-color)]">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    const accountId = localStorage.getItem('accountId');
                    if (accountId) fetchJobDetails(accountId, jobId);
                  }}
                  className="btn btn-secondary"
                >
                  Try Again
                </button>
                <button
                  onClick={handleBack}
                  className="btn btn-primary ml-2"
                >
                  Back to Jobs
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!job) {
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
              <h3 className="text-sm font-medium text-[var(--error-color)]">Job not found</h3>
              <div className="mt-2 text-sm text-[var(--error-color)]">
                <p>The job you're looking for doesn't exist or has been removed.</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={handleBack}
                  className="btn btn-primary"
                >
                  Back to Jobs
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
        <button
          onClick={handleBack}
          className="flex items-center text-white mb-4 hover:underline"
        >
          <svg className="w-5 h-5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Jobs
        </button>
        <h1 className="text-heading flex items-center gap-4">
          {job.title || 'Job Title'}
          {job.experienceLevel && <ExperienceLevelBadge level={job.experienceLevel} />}
        </h1>
        <p className="text-description text-[var(--light-color)]">
          {job.company || 'Company'} • {job.location || 'Location'}
          {job.companyRating > 0 && <span> • ⭐ {job.companyRating.toFixed(1)}/5.0</span>}
        </p>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col sm:flex-row gap-3 my-4">
        <button
          onClick={handleViewCompany}
          className="btn btn-secondary w-full sm:w-auto"
        >
          View Company
        </button>
        <button
          onClick={handleSaveJob}
          className={`btn ${isSaved ? 'btn-secondary' : 'btn-primary'} w-full sm:w-auto transition-all`}
        >
          {isSaved ? 'Unsave Job' : 'Save Job'}
        </button>
        <button
          onClick={handleApply}
          disabled={applicationStatus === 'pending' || applicationStatus === 'accepted'}
          className="btn btn-primary w-full sm:w-auto disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {applicationStatus === 'pending' && 'Application Pending'}
          {applicationStatus === 'accepted' && 'Application Accepted'}
          {applicationStatus === 'apply' && 'Apply for this Job'}
          {applicationStatus === 'rejected' && 'Re-apply for this Job'}
        </button>
      </div>

      {/* Job Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card 1: Job Overview */}
          <div className="card">
            <div className="p-6">
              <h2 className="text-subheading mb-4">Job Overview</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="flex items-center text-[var(--text-dark)]">
                  <svg className="w-5 h-5 mr-2 text-[var(--primary-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                  <div>
                    <div className="text-sm text-[var(--text-light)]">Job Type</div>
                    <div className="font-medium">{job.type || 'Not specified'}</div>
                  </div>
                </div>
                <div className="flex items-center text-[var(--text-dark)]">
                  <svg className="w-5 h-5 mr-2 text-[var(--primary-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <div className="text-sm text-[var(--text-light)]">Salary</div>
                    <div className="font-medium">{job.salary || 'Not specified'}</div>
                  </div>
                </div>
                <div className="flex items-center text-[var(--text-dark)]">
                  <svg className="w-5 h-5 mr-2 text-[var(--primary-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <div>
                    <div className="text-sm text-[var(--text-light)]">Location</div>
                    <div className="font-medium">{job.location || 'Not specified'}</div>
                  </div>
                </div>
              </div>
              {/* Field and Categories */}
              <div className="flex flex-wrap gap-2 mb-4">
                {job.field && (
                  <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">{job.field}</span>
                )}
                {Array.isArray(job.categories) && job.categories.map((cat, idx) => (
                  <span key={idx} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">{cat.name || cat}</span>
                ))}
              </div>

              <div className="text-description">
                <p>Posted: {job.posted ? new Date(job.posted).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' }) : 'N/A'}</p>
              </div>

              {/* Closing Date and Job Time */}
              {(job.closingDate || job.jobTime) && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {job.closingDate && (
                    <span className="inline-block bg-yellow-100 text-yellow-800 text-xs px-2 py-0.5 rounded-full">
                      Deadline: {new Date(job.closingDate).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                    </span>
                  )}
                  {job.jobTime && (
                    <span className="inline-block bg-purple-100 text-purple-800 text-xs px-2 py-0.5 rounded-full">
                      {job.jobTime}
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Card 2: Job Description */}
          <div className="card">
            <div className="p-6">
              <h2 className="text-subheading mb-4">Job Description</h2>
              <div className="text-description">
                {(job.description || 'No description available').split('\n').map((paragraph, index) => (
                  <p key={index} className="mb-2">{paragraph}</p>
                ))}
              </div>
            </div>
          </div>

          {/* Card 3: Requirements */}
          <div className="card">
            <div className="p-6">
              <h2 className="text-subheading mb-4">Requirements</h2>
              <ul className="list-disc pl-5 text-description">
                {(job.requirements || 'No requirements specified').split('\n').map((req, index) => (
                  <li key={index}>{req}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Card 4: Benefits */}
          <div className="card">
            <div className="p-6">
              <h2 className="text-subheading mb-4">Benefits</h2>
              <ul className="list-disc pl-5 text-description">
                {(job.benefits || 'No benefits specified').split('\n').map((benefit, index) => (
                  <li key={index}>{benefit}</li>
                ))}
              </ul>
            </div>
          </div>
        </div>
        
        {/* Right Column */}
        <div className="space-y-6">
          {/* Company Info */}
          <div className="card">
            <div className="p-6">
              <h2 className="text-subheading mb-4">About {job.company}</h2>
              <div className="flex items-center mb-4">
                {job.companyLogo ? (
                  <img src={job.companyLogo} alt={job.company || 'Company'} className="w-12 h-12 rounded-full mr-3" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-[var(--primary-color)] flex items-center justify-center text-white mr-3">
                    <span className="text-lg font-bold">{job.company && job.company.length > 0 ? job.company.charAt(0) : '?'}</span>
                  </div>
                )}
                <div>
                  <h3 className="font-semibold text-[var(--foreground)]">{job.company}</h3>
                </div>
              </div>
              <p className="text-description mb-4">{job.companyDescription}</p>
              <button
                onClick={handleViewCompany}
                className="btn btn-secondary w-full"
              >
                View Company Profile
              </button>
            </div>
          </div>
          
          {/* Success/Error Messages */}
          {successMessage && (
            <div className="success-message">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-[var(--success-color)]" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
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
        </div>
      </div>

      {/* Apply Modal */}
      {showApplyModal && (
        <div className="fixed inset-0 modal-backdrop flex items-center justify-center z-50">
          <div className="modal-content">
            <h2 className="text-subheading">Apply for {job.title}</h2>
            <p className="text-description mb-4">at {job.company}</p>
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
