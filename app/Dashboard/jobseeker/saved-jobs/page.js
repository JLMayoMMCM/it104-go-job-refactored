'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import JobCard from '../../../components/JobCard';

export default function SavedJobs() {
  const [allJobs, setAllJobs] = useState([]);
  const [savedJobsMap, setSavedJobsMap] = useState({});
  const [filteredJobs, setFilteredJobs] = useState([]);
  const [applicationStatus, setApplicationStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const [loadingSaved, setLoadingSaved] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [coverLetter, setCoverLetter] = useState('');
  const [selectedJob, setSelectedJob] = useState(null);
  const [showApplyModal, setShowApplyModal] = useState(false);

  const router = useRouter();

  useEffect(() => {
    const accountId = localStorage.getItem('accountId');
    const accountType = localStorage.getItem('accountType');
    if (!accountId || accountType !== '2') {
      router.push('/Login');
      return;
    }
    fetchAllJobs(accountId);
    fetchSavedJobs(accountId);
    fetchApplicationStatus(accountId);
  }, [router]);

  useEffect(() => {
    // Filter all jobs to only those that are saved
    const filtered = allJobs.filter(job => savedJobsMap[job.id] || savedJobsMap[job.jobId]);
    setFilteredJobs(filtered);
  }, [allJobs, savedJobsMap]);

  const fetchAllJobs = async (accountId) => {
    try {
      setLoading(true);
      setError(null);
      const queryParams = new URLSearchParams({
        accountId: accountId,
        type: 'search',
        limit: '1000'
      });
      const response = await fetch(`/api/jobseeker/jobs?${queryParams}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to fetch jobs');
      if (data.success && data.data) {
        setAllJobs(data.data);
      } else {
        throw new Error('Jobs data not found');
      }
    } catch (error) {
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchSavedJobs = async (accountId) => {
    try {
      setLoadingSaved(true);
      const response = await fetch(`/api/jobseeker/saved-jobs?accountId=${accountId}`);
      const data = await response.json();
      if (response.ok && data.success && data.data) {
        const map = {};
        data.data.forEach(job => {
          const id = job.job_id !== undefined ? String(job.job_id) : (job.jobId !== undefined ? String(job.jobId) : null);
          if (id) map[id] = true;
        });
        setSavedJobsMap(map);
      }
    } catch (error) {
      // Silent fail
    } finally {
      setLoadingSaved(false);
    }
  };

  const fetchApplicationStatus = async (accountId) => {
    try {
      const response = await fetch(`/api/jobseeker/applications?accountId=${accountId}`);
      const data = await response.json();
      if (response.ok && data.success && data.data) {
        const statusMap = {};
        data.data.forEach(app => {
          if (!statusMap[app.jobId]) statusMap[app.jobId] = [];
          let status = app.status || app.Status || "";
          if (typeof status === "number") {
            if (status === 1) status = "Accepted";
            else if (status === 2) status = "In-progress";
            else if (status === 3) status = "Rejected";
          } else if (typeof status === "string") {
            status = status.trim();
            if (status === "1") status = "Accepted";
            else if (status === "2") status = "In-progress";
            else if (status === "3") status = "Rejected";
            else if (status.toLowerCase() === "in-progress" || status.toLowerCase() === "pending") {
              status = "In-progress";
            } else if (status.toLowerCase() === "accepted") {
              status = "Accepted";
            } else if (status.toLowerCase() === "rejected") {
              status = "Rejected";
            }
          }
          statusMap[app.jobId].push({
            ...app,
            status,
          });
        });
        setApplicationStatus(statusMap);
      }
    } catch (error) {
      // Silent fail
    }
  };

  const handleSaveJob = async (jobId) => {
    try {
      const accountId = localStorage.getItem('accountId');
      if (savedJobsMap[jobId]) {
        // Optimistically update UI before API call
        setSavedJobsMap(prev => {
          const newSaved = { ...prev };
          delete newSaved[jobId];
          return newSaved;
        });
        setSuccessMessage('Job unsaved successfully!');
        setTimeout(() => setSuccessMessage(''), 2000);

        // Unsave job
        const response = await fetch(`/api/jobseeker/saved-jobs`, {
          method: 'DELETE',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ jobId, accountId }),
        });
        const data = await response.json();
        if (!(response.ok && data.success)) {
          setSavedJobsMap(prev => ({ ...prev, [jobId]: true }));
          throw new Error(data.error || 'Failed to unsave job');
        }
      }
    } catch (error) {
      setError('Failed to update job status. Please try again.');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleQuickApply = (job) => {
    setSelectedJob(job);
    setShowApplyModal(true);
  };

  const handleSubmitApplication = async () => {
    if (!selectedJob) return;
    try {
      const accountId = localStorage.getItem('accountId');
      const response = await fetch(`/api/jobseeker/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: selectedJob.id,
          accountId,
          coverLetter: coverLetter || 'I am interested in this position and would like to apply.'
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setApplicationStatus(prev => {
          const prevApps = Array.isArray(prev[selectedJob.id]) ? prev[selectedJob.id] : [];
          return {
            ...prev,
            [selectedJob.id]: [
              ...prevApps,
              {
                status: "In-progress",
              }
            ]
          };
        });
        setShowApplyModal(false);
        setCoverLetter('');
        setSelectedJob(null);
        setSuccessMessage('Your application has been submitted successfully!');
        setTimeout(() => setSuccessMessage(''), 3000);
      } else {
        throw new Error(data.error || 'Failed to submit application');
      }
    } catch (error) {
      setError('Failed to submit application. Please try again.');
      setTimeout(() => setError(''), 3000);
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
              <h3 className="text-sm font-medium text-[var(--error-color)]">Error loading saved jobs</h3>
              <div className="mt-2 text-sm text-[var(--error-color)]">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    const accountId = localStorage.getItem('accountId');
                    if (accountId) fetchAllJobs(accountId);
                  }}
                  className="btn btn-secondary"
                >
                  Try Again
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
      <div className="profile-header">
        <h1 className="text-heading">Saved Jobs</h1>
        <p className="text-description">Jobs you've saved for future reference.</p>
      </div>
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
      {filteredJobs.length === 0 ? (
        <div className="text-center py-12 border border-dashed border-[var(--border-color)] rounded-lg">
          <svg className="mx-auto h-12 w-12 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
          <div className="mt-2 text-sm text-[var(--text-light)]">
            <p>You haven't saved any jobs yet. Save jobs that interest you to review them later.</p>
          </div>
          <div className="mt-6">
            <button
              onClick={() => router.push('/Dashboard/jobseeker/jobs/all-jobs')}
              className="btn btn-primary text-sm"
            >
              Search Jobs
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-4 max-h-[calc(100vh-280px)] overflow-y-auto scrollbar-hide">
          {filteredJobs.map((job) => {
            // Normalize job data for JobCard
            const mappedJob = {
              ...job,
              id: job.id || job.jobId || job.job_id || "",
              title: job.title || job.job_name || "",
              categories: job.categories || job.category_list || [],
              field: job.field || job.category_field_name || "",
              experienceLevel: job.experienceLevel || job.experience_level || job.experience_level_name || "",
              closingDate: job.closingDate || job.closing_date || "",
              jobTime: job.jobTime || job.job_time || "",
              match: job.match || job.matchPercentage || 0,
              posted: job.posted || job.postedDate || "",
              salary: job.salary || "",
              company: job.company || job.company_name || "",
              location: job.location || "",
              rating: job.rating || 0,
            };
            return (
              <JobCard
                key={mappedJob.id}
                job={mappedJob}
                applicationStatus={applicationStatus[mappedJob.id] || []}
                saved={!!savedJobsMap[mappedJob.id]}
                loadingSaved={loadingSaved}
                onSave={handleSaveJob}
                onApplySuccess={(jobId) => {
                  setApplicationStatus(prev => {
                    const prevApps = Array.isArray(prev[jobId]) ? prev[jobId] : [];
                    return {
                      ...prev,
                      [jobId]: [
                        ...prevApps,
                        {
                          status: "In-progress",
                          request_date: new Date().toISOString()
                        }
                      ]
                    };
                  });
                }}
                onView={handleViewJob}
                showSave={true}
                showApply={true}
                showView={true}
              />
            );
          })}
        </div>
      )}
      {showApplyModal && selectedJob && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-[var(--card-background)] p-6 rounded-lg shadow-lg max-w-lg w-full mx-4">
            <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">Apply for {selectedJob.title}</h2>
            <p className="text-[var(--text-light)] mb-4">at {selectedJob.company}</p>
            <textarea
              value={coverLetter}
              onChange={(e) => setCoverLetter(e.target.value)}
              placeholder="Enter your cover letter or a brief message (optional). A default message will be sent if left empty."
              className="form-input mb-4 h-32 resize-none"
            ></textarea>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => {
                  setShowApplyModal(false);
                  setSelectedJob(null);
                  setCoverLetter('');
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmitApplication}
                className="btn btn-primary"
              >
                Submit Application
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
