"use client";
import React, { useState } from "react";

function ExperienceLevelBadge({ level }) {
  const map = {
    "Entry Level": {
      className: "bg-blue-100 text-blue-800 border border-blue-300 rounded-full px-3 py-0.5 text-xs font-normal flex items-center gap-1 min-w-[120px] justify-center",
      icon: "🟦",
      style: { fontStyle: "italic" }
    },
    "Mid Level": {
      className: "bg-green-50 text-green-800 border border-green-400 rounded-full px-3 py-0.5 text-xs font-normal flex items-center gap-1 min-w-[120px] justify-center",
      icon: "🟩",
      style: {}
    },
    "Senior Level": {
      className: "bg-gradient-to-r from-orange-100 to-orange-200 text-orange-900 border border-orange-300 rounded-lg px-3 py-0.5 text-xs font-bold flex items-center gap-1 shadow-sm min-w-[120px] justify-center",
      icon: "🟧",
      style: { fontWeight: "bold" }
    },
    "Managerial Level": {
      className: "bg-purple-100 text-purple-800 border border-purple-300 rounded-full px-3 py-0.5 text-xs font-semibold flex items-center gap-1 min-w-[120px] justify-center",
      icon: "👔",
      style: {}
    },
    "Executive Level": {
      className: "bg-red-100 text-red-800 border-2 border-red-400 rounded-full px-3 py-0.5 text-xs font-extrabold flex items-center gap-1 shadow-lg min-w-[120px] justify-center",
      icon: "👑",
      style: { textShadow: "0 1px 2px #fff" }
    },
    "Not specified": {
      className: "bg-gray-100 text-gray-800 border border-gray-300 rounded px-3 py-0.5 text-xs font-normal flex items-center gap-1 min-w-[120px] justify-center",
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

export default function JobCard({
  job,
  applicationStatus,
  saved,
  onSave,
  onView,
  onApplySuccess,
  showSave = true,
  showApply = true,
  showView = true,
  loadingSaved = false,
  loading = false,
}) {
  // Internal state for apply modal
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [coverLetter, setCoverLetter] = useState('');
  const [applyLoading, setApplyLoading] = useState(false);
  const [applySuccess, setApplySuccess] = useState('');
  const [applyError, setApplyError] = useState('');

  // Button logic (centralized for all usages: all jobs, recommended, saved)
  const apps = Array.isArray(applicationStatus) ? applicationStatus : [];
  let btn = {
    label: "Apply",
    disabled: false,
    className: "bg-green-600 hover:bg-green-700"
  };

  if (apps.length > 0) {
    // Find the most recent application (by date if available, else last in array)
    let latestApp = apps[apps.length - 1];
    if (apps.some(app => app.request_date)) {
      latestApp = apps
        .slice()
        .sort((a, b) => new Date(b.request_date) - new Date(a.request_date))[0];
    }
    const status = (latestApp.status || latestApp.Status || latestApp.request_status || "").toLowerCase();
    if (status === "accepted") {
      btn = {
        label: "Accepted",
        disabled: true,
        className: "bg-green-500 cursor-not-allowed"
      };
    } else if (status === "in-progress" || status === "pending") {
      btn = {
        label: "Pending",
        disabled: true,
        className: "bg-gray-400 cursor-not-allowed"
      };
    } else if (status === "rejected") {
      btn = {
        label: "Apply",
        disabled: false,
        className: "bg-green-600 hover:bg-green-700"
      };
    }
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex flex-col md:flex-row md:items-center justify-between p-4 border border-[var(--border-color)] rounded-lg bg-[var(--background)] animate-pulse">
        <div className="mb-3 md:mb-0 md:w-1/3 space-y-2">
          <div className="h-5 bg-gray-200 rounded w-2/3"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          <div className="h-4 bg-gray-100 rounded w-1/3"></div>
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:w-1/3 space-y-2 md:space-y-0 md:space-x-4">
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
          <div className="h-4 bg-gray-200 rounded w-20"></div>
        </div>
        <div className="mt-3 md:mt-0 md:w-1/3 flex justify-end space-x-2">
          <div className="h-8 bg-gray-200 rounded w-20"></div>
          <div className="h-8 bg-gray-200 rounded w-20"></div>
          <div className="h-8 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    );
  }

  // Handle apply button click
  const handleApplyClick = () => {
    setShowApplyModal(true);
    setCoverLetter('');
    setApplySuccess('');
    setApplyError('');
  };

  // Handle submit application
  const handleSubmitApplication = async () => {
    setApplyLoading(true);
    setApplyError('');
    setApplySuccess('');
    try {
      const accountId = localStorage.getItem('accountId');
      if (!accountId) {
        setApplyError('You must be logged in to apply.');
        setApplyLoading(false);
        return;
      }
      const response = await fetch(`/api/jobseeker/applications`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          jobId: job.id,
          accountId,
          coverLetter: coverLetter || 'I am interested in this position and would like to apply.'
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setApplySuccess('Your application has been submitted successfully!');
        setShowApplyModal(false);
        if (typeof onApplySuccess === 'function') {
          onApplySuccess(job.id);
        }
      } else {
        setApplyError(data.error || 'Failed to submit application');
      }
    } catch (error) {
      setApplyError('Failed to submit application. Please try again.');
    } finally {
      setApplyLoading(false);
    }
  };

  return (
    <div
      className={`flex flex-col md:flex-row md:items-center justify-between p-4 border border-[var(--border-color)] rounded-lg bg-[var(--background)] hover:shadow-md transition-shadow`}
    >
      <div className="mb-3 md:mb-0 md:w-1/3">
        <h4 className="text-lg font-semibold text-[var(--foreground)] flex items-center gap-2 min-w-[200px]">
          {job.title || job.job_name}
          {job.experienceLevel && (
            <ExperienceLevelBadge level={job.experienceLevel} />
          )}
        </h4>
        {/* Field and Categories */}
        <div className="flex flex-wrap gap-2 mb-1">
          {job.field && (
            <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full">{job.field}</span>
          )}
          {Array.isArray(job.categories) && job.categories.map((cat, idx) => (
            <span key={job.id + '-' + cat} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">{cat}</span>
          ))}
        </div>
        <p className="text-sm text-[var(--text-light)]">
          {job.company} • {job.location} {job.rating > 0 && <span>• ⭐ {job.rating.toFixed(1)}/5.0</span>}
        </p>
        <p className="text-sm text-[var(--text-light)] mt-1">{job.posted}</p>
        {/* Closing Date and Job Time */}
        {(job.closingDate || job.jobTime) && (
          <div className="flex flex-wrap gap-2 mt-1">
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
      <div className="flex flex-col md:flex-row md:items-center md:w-1/3 space-y-2 md:space-y-0 md:space-x-4">
        <div className="flex items-center text-[var(--text-light)] text-sm">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          {job.type}
        </div>
        <div className="flex items-center text-[var(--text-light)] text-sm">
          <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {job.salary}
        </div>
        {(job.matchPercentage || job.match) > 0 && (
          <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
            job.match >= 80 ? 'bg-green-100 text-green-800' : 
            job.match >= 60 ? 'bg-yellow-100 text-yellow-800' : 
            'bg-red-100 text-red-800'
          }`}>
            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {job.match}% Match
          </div>
        )}
      </div>
      <div className="mt-3 md:mt-0 md:w-1/3 flex justify-end space-x-2">
        {showSave && (
          <button
            onClick={() => onSave && onSave(job.id)}
            disabled={loadingSaved}
            className={`px-4 py-2 border border-[var(--primary-color)] text-[var(--primary-color)] rounded-md text-sm font-medium ${
              loadingSaved ? 'opacity-50 cursor-not-allowed' : 'hover:bg-[var(--primary-color)] hover:text-white'
            } transition-all`}
          >
            {loadingSaved ? 'Loading...' : saved ? 'Unsave' : 'Save'}
          </button>
        )}
        {showApply && (
          <>
            <button
              onClick={handleApplyClick}
              disabled={btn.disabled}
              className={`px-4 py-2 rounded-md text-sm font-medium text-white ${btn.className}`}
            >
              {btn.label}
            </button>
            {showApplyModal && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-[var(--card-background)] p-6 rounded-lg shadow-lg max-w-lg w-full mx-4">
                  <h2 className="text-xl font-bold mb-4 text-[var(--foreground)]">Apply for {job.title}</h2>
                  <p className="text-[var(--text-light)] mb-4">at {job.company}</p>
                  <textarea 
                    value={coverLetter} 
                    onChange={(e) => setCoverLetter(e.target.value)} 
                    placeholder="Enter your cover letter or a brief message (optional). A default message will be sent if left empty." 
                    className="form-input mb-4 h-32 resize-none"
                  ></textarea>
                  {applyError && (
                    <div className="text-red-600 text-sm mb-2">{applyError}</div>
                  )}
                  {applySuccess && (
                    <div className="text-green-600 text-sm mb-2">{applySuccess}</div>
                  )}
                  <div className="flex justify-end space-x-3">
                    <button 
                      onClick={() => {
                        setShowApplyModal(false);
                        setCoverLetter('');
                        setApplyError('');
                        setApplySuccess('');
                      }} 
                      className="btn btn-secondary"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={handleSubmitApplication} 
                      className="btn btn-primary"
                      disabled={applyLoading}
                    >
                      {applyLoading ? "Submitting..." : "Submit Application"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
        {showView && (
          <button
            onClick={() => onView && onView(job.id)}
            className="btn btn-primary text-sm"
          >
            View Job
          </button>
        )}
      </div>
    </div>
  );
}
