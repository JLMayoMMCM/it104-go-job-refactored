'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function EditJobPage() {
  const router = useRouter();
  const params = useParams();
  const jobId = params.jobId;

  // Get current date in YYYY-MM-DD format
  const getCurrentDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Get date 6 months from now in YYYY-MM-DD format
  const getMaxClosingDate = () => {
    const date = new Date();
    date.setMonth(date.getMonth() + 6);
    return date.toISOString().split('T')[0];
  };

  const [formData, setFormData] = useState({
    job_name: '',
    job_description: '',
    job_location: '',
    job_quantity: 1,
    job_requirements: '',
    job_benefits: '',
    job_type_id: '',
    job_experience_level_id: '',
    job_salary: '',
    job_time: '',
    job_closing_date: '',
    selected_categories: []
  });
  const [maxClosingDate, setMaxClosingDate] = useState(getMaxClosingDate());
  const [jobTypes, setJobTypes] = useState([]);
  const [experienceLevels, setExperienceLevels] = useState([]);
  const [jobFields, setJobFields] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchData();
    fetchJobDetails();
  }, [jobId]);

  const fetchData = async () => {
    try {
      // Fetch job types
      const jobTypesRes = await fetch('/api/data/job-types');
      const jobTypesData = await jobTypesRes.json();
      if (jobTypesRes.ok && jobTypesData.success) {
        setJobTypes(jobTypesData.data);
      }

      // Fetch experience levels
      const expLevelsRes = await fetch('/api/data/experience-levels');
      const expLevelsData = await expLevelsRes.json();
      if (expLevelsRes.ok && expLevelsData.success) {
        setExperienceLevels(expLevelsData.data);
      }

      // Fetch job fields and categories
      const fieldsRes = await fetch('/api/data/job-fields');
      const fieldsData = await fieldsRes.json();
      if (fieldsRes.ok && fieldsData.success) {
        setJobFields(fieldsData.data);
        // Extract categories from fields
        const allCategories = fieldsData.data.flatMap(field => 
          field.job_categories.map(cat => ({
            ...cat,
            category_field_name: field.category_field_name
          }))
        );
        setCategories(allCategories);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load form data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobDetails = async () => {
    try {
      const accountId = localStorage.getItem('accountId') || '1';
      const response = await fetch(`/api/employee/jobs/${jobId}?accountId=${accountId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch job details');
      }

      if (data.success && data.data) {
        const job = data.data;
        setFormData({
          job_name: job.job_name || '',
          job_description: job.job_description || '',
          job_location: job.job_location || '',
          job_quantity: job.job_quantity || 1,
          job_requirements: job.job_requirements || '',
          job_benefits: job.job_benefits || '',
          job_type_id: job.job_type?.job_type_id || '',
          job_experience_level_id: job.experience_level?.job_seeker_experience_level_id || '',
          job_salary: job.job_salary || '',
          job_time: job.job_time || '',
          job_closing_date: job.job_closing_date ? new Date(job.job_closing_date).toISOString().split('T')[0] : '',
          selected_categories: job.job_category_list?.map(cat => String(cat.job_category?.job_category_id || cat.job_category_id)) || []
        });
      }
    } catch (error) {
      console.error('Error fetching job details:', error);
      setError(error.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    if (type === 'checkbox') {
      setFormData(prev => ({
        ...prev,
        selected_categories: checked
          ? [...prev.selected_categories, value]
          : prev.selected_categories.filter(id => id !== value)
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    // Validate closing date
    if (!formData.job_closing_date) {
      setError('Closing date is required');
      setSubmitting(false);
      return;
    }

    const closingDate = new Date(formData.job_closing_date);
    const today = new Date(getCurrentDate());
    const maxDate = new Date(maxClosingDate);

    if (closingDate < today) {
      setError('Closing date cannot be in the past');
      setSubmitting(false);
      return;
    }

    if (closingDate > maxDate) {
      setError('Closing date cannot be more than 6 months from today');
      setSubmitting(false);
      return;
    }

    try {
      const accountId = localStorage.getItem('accountId') || '1';
      // Create a new object without any potential job_hiring_date field
      const { job_hiring_date, ...payloadData } = formData;
      const response = await fetch(`/api/employee/jobs/${jobId}?accountId=${accountId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...payloadData
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update job posting');
      }

      if (data.success) {
        router.push('/Dashboard/employee/all-postings');
      }
    } catch (error) {
      console.error('Error updating job posting:', error);
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Job Posting</h1>
        <p className="text-gray-600">Update details for this job listing</p>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Job Details</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <h3 className="text-sm font-medium text-red-800">Error</h3>
                  <div className="mt-2 text-sm text-red-700">
                    <p>{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="job_name" className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
              <input
                type="text"
                id="job_name"
                name="job_name"
                value={formData.job_name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Software Engineer"
              />
            </div>
            <div>
              <label htmlFor="job_location" className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                id="job_location"
                name="job_location"
                value={formData.job_location}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., Manila, Remote"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="job_type_id" className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
              <select
                id="job_type_id"
                name="job_type_id"
                value={formData.job_type_id}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Job Type</option>
                {jobTypes?.map(type => (
                  <option key={type.job_type_id} value={type.job_type_id}>{type.job_type_name}</option>
                )) || null}
              </select>
            </div>
            <div>
              <label htmlFor="job_experience_level_id" className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
              <select
                id="job_experience_level_id"
                name="job_experience_level_id"
                value={formData.job_experience_level_id}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Experience Level</option>
                {experienceLevels?.map(level => (
                  <option key={level.job_seeker_experience_level_id} value={level.job_seeker_experience_level_id}>{level.experience_level_name}</option>
                )) || null}
              </select>
            </div>
            <div>
              <label htmlFor="job_quantity" className="block text-sm font-medium text-gray-700 mb-1">Number of Openings</label>
              <input
                type="number"
                id="job_quantity"
                name="job_quantity"
                value={formData.job_quantity}
                onChange={handleInputChange}
                min="1"
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="job_salary" className="block text-sm font-medium text-gray-700 mb-1">Salary (PHP)</label>
              <input
                type="number"
                id="job_salary"
                name="job_salary"
                value={formData.job_salary}
                onChange={handleInputChange}
                required
                min="1"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 30000"
              />
            </div>
            <div>
              <label htmlFor="job_time" className="block text-sm font-medium text-gray-700 mb-1">Work Schedule</label>
              <input
                type="text"
                id="job_time"
                name="job_time"
                value={formData.job_time}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="e.g., 9 AM - 5 PM"
              />
            </div>
          </div>

          <div>
            <label htmlFor="job_closing_date" className="block text-sm font-medium text-gray-700 mb-1">Application Closing Date</label>
            <input
              type="date"
              id="job_closing_date"
              name="job_closing_date"
              value={formData.job_closing_date}
              onChange={handleInputChange}
              required
              min={getCurrentDate()}
              max={maxClosingDate}
              className="w-full md:w-1/3 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">Must be within 6 months from today</p>
          </div>

          {/* Description */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-lg font-medium text-gray-900 mb-2">Job Description</h4>
            <div>
              <label htmlFor="job_description" className="block text-sm font-medium text-gray-700 mb-1">Responsibilities and Duties</label>
              <textarea
                id="job_description"
                name="job_description"
                value={formData.job_description}
                onChange={handleInputChange}
                required
                rows="5"
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Describe the role, responsibilities, and duties of this position"
              ></textarea>
            </div>
          </div>

          {/* Requirements */}
          <div>
            <label htmlFor="job_requirements" className="block text-sm font-medium text-gray-700 mb-1">Requirements and Qualifications</label>
            <textarea
              id="job_requirements"
              name="job_requirements"
              value={formData.job_requirements}
              onChange={handleInputChange}
              rows="5"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="List the required skills, qualifications, and experience for this position"
            ></textarea>
          </div>

          {/* Benefits */}
          <div>
            <label htmlFor="job_benefits" className="block text-sm font-medium text-gray-700 mb-1">Benefits (Optional)</label>
            <textarea
              id="job_benefits"
              name="job_benefits"
              value={formData.job_benefits}
              onChange={handleInputChange}
              rows="3"
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="List any benefits offered with this position (e.g., health insurance, paid leave)"
            ></textarea>
          </div>

          {/* Categories */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-lg font-medium text-gray-900 mb-2">Job Categories</h4>
            <p className="text-sm text-gray-600 mb-4">Select all relevant categories for this job (minimum 1)</p>
            <div className="space-y-6">
              {jobFields?.map(field => (
                <div key={field.category_field_id} className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <h5 className="text-base font-medium text-gray-900 mb-2">{field.category_field_name}</h5>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {field.job_categories?.map(category => (
                      <div key={category.job_category_id} className="flex items-center">
                        <input
                          type="checkbox"
                          id={`category-${category.job_category_id}`}
                          name="category"
                          value={category.job_category_id}
                          checked={formData.selected_categories.includes(String(category.job_category_id))}
                          onChange={handleInputChange}
                          className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                        />
                        <label htmlFor={`category-${category.job_category_id}`} className="ml-2 text-sm text-gray-700">
                          {category.job_category_name}
                        </label>
                      </div>
                    )) || null}
                  </div>
                </div>
              )) || null}
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.push('/Dashboard/employee/all-postings')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || formData.selected_categories.length === 0}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
