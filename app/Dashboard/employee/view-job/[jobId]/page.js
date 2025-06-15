'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ViewJobPage() {
  const [job, setJob] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId;

  useEffect(() => {
    fetchJobDetails();
  }, [jobId]);

  const fetchJobDetails = async () => {
    try {
      const accountId = localStorage.getItem('accountId') || '1';
      const response = await fetch(`/api/employee/jobs/${jobId}?accountId=${accountId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch job details');
      }

      if (data.success) {
        setJob(data.data);
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
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
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Error loading job details</h3>
        <p className="text-gray-600">{error || 'Job not found'}</p>
        <button
          onClick={() => router.push('/Dashboard/employee/all-postings')}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Back to All Postings
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Details</h1>
          <p className="text-gray-600">View details of {job.job_name}</p>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={() => router.push('/Dashboard/employee/all-postings')}
            className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Back to All Postings
          </button>
          <button
            onClick={() => router.push(`/Dashboard/employee/edit-job/${job.job_id}`)}
            className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
          >
            Edit Job
          </button>
        </div>
      </div>

      {/* Job Details */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">{job.job_name}</h3>
          <div className="flex items-center space-x-3 mt-1">
            <span className={`px-2 py-1 ${job.job_is_active ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'} text-xs font-medium rounded-full`}>{job.job_is_active ? 'Active' : 'Inactive'}</span>
            <span className="text-sm text-gray-500">Posted {formatDate(job.job_posted_date)}</span>
          </div>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
              <p className="text-gray-900 font-semibold">{job.job_name}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <p className="text-gray-900 font-semibold">{job.job_location}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
              <p className="text-gray-900 font-semibold">{job.job_type?.job_type_name || 'Not specified'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
              <p className="text-gray-900 font-semibold">{job.experience_level?.experience_level_name || 'Not specified'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Number of Openings</label>
              <p className="text-gray-900 font-semibold">{job.job_quantity}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Salary (PHP)</label>
              <p className="text-gray-900 font-semibold">{job.job_salary || 'Not specified'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Work Schedule</label>
              <p className="text-gray-900 font-semibold">{job.job_time || 'Not specified'}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Application Closing Date</label>
              <p className="text-gray-900 font-semibold">{job.job_closing_date ? formatDate(job.job_closing_date) : 'Not specified'}</p>
            </div>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-lg font-medium text-gray-900 mb-2">Job Description</h4>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsibilities and Duties</label>
              <p className="text-gray-900 whitespace-pre-line">{job.job_description}</p>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Requirements and Qualifications</label>
            <p className="text-gray-900 whitespace-pre-line">{job.job_requirements}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Benefits</label>
            <p className="text-gray-900 whitespace-pre-line">{job.job_benefits || 'Not specified'}</p>
          </div>
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-lg font-medium text-gray-900 mb-2">Job Categories</h4>
            <div className="space-y-6">
              {job.job_category_list?.map(cat => (
                <div key={cat.job_category?.job_category_id || cat.job_category_id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h5 className="text-base font-medium text-gray-900 mb-2">{cat.job_category?.category_field?.category_field_name || 'Unknown Field'}</h5>
                  <p className="text-gray-700">{cat.job_category?.job_category_name || 'Unknown Category'}</p>
                </div>
              )) || <p className="text-gray-500">No categories assigned</p>}
            </div>
          </div>
          {job.applicant_count !== undefined && (
            <div className="border-t border-gray-200 pt-4">
              <h4 className="text-lg font-medium text-gray-900 mb-2">Application Statistics</h4>
              <div className="flex items-center space-x-2 text-sm">
                <span className="text-gray-600">Applications:</span>
                <span className="font-semibold text-blue-600">{job.applicant_count}</span>
                {job.pending_count > 0 && (
                  <span className="text-yellow-600">({job.pending_count} pending)</span>
                )}
                {job.accepted_count > 0 && (
                  <span className="text-green-600">({job.accepted_count} accepted)</span>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
