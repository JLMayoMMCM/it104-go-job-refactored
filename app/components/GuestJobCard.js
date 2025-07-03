"use client";
import React from "react";

function ExperienceLevelBadge({ level }) {
  const map = {
    "Entry Level": {
      className: "bg-blue-100 text-blue-800 border border-blue-300 rounded-full px-2 py-0.5 text-xs font-normal flex items-center gap-1 min-w-[100px] justify-center",
      icon: "🟦",
      style: { fontStyle: "italic" }
    },
    "Mid Level": {
      className: "bg-green-50 text-green-800 border border-green-400 rounded-full px-2 py-0.5 text-xs font-normal flex items-center gap-1 min-w-[100px] justify-center",
      icon: "🟩",
      style: {}
    },
    "Senior Level": {
      className: "bg-gradient-to-r from-orange-100 to-orange-200 text-orange-900 border border-orange-300 rounded-lg px-2 py-0.5 text-xs font-bold flex items-center gap-1 shadow-sm min-w-[100px] justify-center",
      icon: "🟧",
      style: { fontWeight: "bold" }
    },
    "Managerial Level": {
      className: "bg-purple-100 text-purple-800 border border-purple-300 rounded-full px-2 py-0.5 text-xs font-semibold flex items-center gap-1 min-w-[100px] justify-center",
      icon: "👔",
      style: {}
    },
    "Executive Level": {
      className: "bg-red-100 text-red-800 border-2 border-red-400 rounded-full px-2 py-0.5 text-xs font-extrabold flex items-center gap-1 shadow-lg min-w-[100px] justify-center",
      icon: "👑",
      style: { textShadow: "0 1px 2px #fff" }
    },
    "Not specified": {
      className: "bg-gray-100 text-gray-800 border border-gray-300 rounded px-2 py-0.5 text-xs font-normal flex items-center gap-1 min-w-[100px] justify-center",
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

export default function GuestJobCard({
  job,
  onView,
  loading = false,
}) {
  // Loading skeleton
  if (loading) {
    return (
      <div className="flex flex-col md:flex-row md:items-center justify-between p-3 border border-[var(--border-color)] rounded-lg bg-[var(--background)] animate-pulse">
        <div className="mb-2 md:mb-0 md:w-1/3 space-y-1">
          <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          <div className="h-3 bg-gray-200 rounded w-1/2"></div>
          <div className="h-3 bg-gray-100 rounded w-1/3"></div>
        </div>
        <div className="flex flex-col md:flex-row md:items-center md:w-1/3 space-y-1 md:space-y-0 md:space-x-3">
          <div className="h-3 bg-gray-200 rounded w-16"></div>
          <div className="h-3 bg-gray-200 rounded w-16"></div>
        </div>
        <div className="mt-2 md:mt-0 md:w-1/3 flex justify-end">
          <div className="h-7 bg-gray-200 rounded w-20"></div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`flex flex-col md:flex-row md:items-center justify-between p-3 border border-[var(--border-color)] rounded-lg bg-[var(--background)] hover:shadow-md transition-shadow`}
    >
      <div className="mb-2 md:mb-0 md:w-1/3">
        <h4 className="text-base font-semibold text-[var(--foreground)] flex items-center gap-2 min-w-[200px]">
          {job.title || job.job_name}
          {job.experienceLevel && (
            <ExperienceLevelBadge level={job.experienceLevel} />
          )}
        </h4>
        {/* Field and Categories */}
        <div className="flex flex-wrap gap-1 mb-1">
          {job.field && (
            <span className="inline-block bg-green-100 text-green-800 text-xs px-2 py-0 rounded-full">{job.field}</span>
          )}
          {Array.isArray(job.categories) && job.categories.slice(0, 2).map((cat, idx) => (
            <span key={job.id + '-' + cat} className="inline-block bg-blue-100 text-blue-800 text-xs px-2 py-0 rounded-full">{cat}</span>
          ))}
          {Array.isArray(job.categories) && job.categories.length > 2 && (
            <span className="inline-block bg-gray-100 text-gray-800 text-xs px-2 py-0 rounded-full">+{job.categories.length - 2} more</span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <p className="text-xs text-[var(--text-light)]">
            {job.company} • {job.location} {job.rating > 0 && <span>• ⭐ {job.rating.toFixed(1)}</span>}
          </p>
          {job.closingDate && (
            <span className="inline-block bg-yellow-50 text-yellow-700 text-xs px-1.5 py-0 rounded-full">
              Due: {new Date(job.closingDate).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
            </span>
          )}
        </div>
      </div>
      <div className="flex flex-col md:flex-row md:items-center md:w-1/3 space-y-1 md:space-y-0 md:space-x-3">
        <div className="flex items-center text-[var(--text-light)] text-xs">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          {job.type}
        </div>
        <div className="flex items-center text-[var(--text-light)] text-xs">
          <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {job.salary}
        </div>
      </div>
      <div className="mt-2 md:mt-0 md:w-1/3 flex justify-end">
        <button
          onClick={() => onView && onView(job.id)}
          className="px-3 py-1 bg-[var(--primary-color)] text-white rounded-md text-xs font-medium hover:bg-[var(--primary-hover)] transition-colors"
        >
          View Details
        </button>
      </div>
    </div>
  );
}
