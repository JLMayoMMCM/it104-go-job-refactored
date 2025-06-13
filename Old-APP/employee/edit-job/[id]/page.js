'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';

export default function EditJobPage({ params }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [jobTypes, setJobTypes] = useState([]);
  const [jobCategories, setJobCategories] = useState([]);
  const [formData, setFormData] = useState({
    jobName: '',
    jobDescription: '',
    jobLocation: '',
    jobTypeId: '',
    jobSalary: '',
    jobQuantity: 1,
    jobTime: '',
    jobRequirements: '',
    jobBenefits: '',
    jobClosingDate: '',
    jobCategories: [],
    jobIsActive: true
  });

  useEffect(() => {
    checkAuthAndLoadData();
  }, [params.id]);

  const checkAuthAndLoadData = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/Login');
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const userData = await response.json();
        if (!userData.isEmployee) {
          router.push('/jobseeker/dashboard');
          return;
        }
        setUser(userData);
        await Promise.all([
          loadJobDetails(token),
          loadJobTypes(token), 
          loadJobCategories(token)
        ]);
      } else {
        router.push('/Login');
      }
    } catch (error) {
      router.push('/Login');
    } finally {
      setIsLoading(false);
    }
  };

  const loadJobDetails = async (token) => {
    try {
      const response = await fetch(`/api/employee/jobs/${params.id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const jobData = await response.json();
        setFormData({
          jobName: jobData.job_name || '',
          jobDescription: jobData.job_description || '',
          jobLocation: jobData.job_location || '',
          jobTypeId: jobData.job_type_id?.toString() || '',
          jobSalary: jobData.job_salary || '',
          jobQuantity: jobData.job_quantity || 1,
          jobTime: jobData.job_time || '',
          jobRequirements: jobData.job_requirements || '',
          jobBenefits: jobData.job_benefits || '',
          jobClosingDate: jobData.job_closing_date ? new Date(jobData.job_closing_date).toISOString().split('T')[0] : '',
          jobCategories: jobData.categories?.map(cat => cat.job_category_id) || [],
          jobIsActive: jobData.job_is_active
        });
      } else {
        setError('Job not found or unauthorized');
      }
    } catch (error) {
      setError('Error loading job details');
    }
  };

  const loadJobTypes = async (token) => {
    try {
      const response = await fetch('/api/jobs/types', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setJobTypes(data);
      }
    } catch (error) {
      console.error('Error loading job types:', error);
    }
  };

  const loadJobCategories = async (token) => {
    try {
      const response = await fetch('/api/jobs/categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setJobCategories(data);
      }
    } catch (error) {
      console.error('Error loading job categories:', error);
    }
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
  };

  const handleCategoryChange = (e) => {
    const categoryId = parseInt(e.target.value);
    const isChecked = e.target.checked;
    
    setFormData(prev => {
      let updatedCategories = [...prev.jobCategories];
      
      if (isChecked) {
        updatedCategories.push(categoryId);
      } else {
        updatedCategories = updatedCategories.filter(id => id !== categoryId);
      }
      
      return { ...prev, jobCategories: updatedCategories };
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    if (!formData.jobTypeId) {
      setError('Please select a job type');
      setIsSubmitting(false);
      return;
    }

    if (formData.jobCategories.length === 0) {
      setError('Please select at least one job category');
      setIsSubmitting(false);
      return;
    }

    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch(`/api/employee/jobs/${params.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          ...formData,
          jobTypeId: parseInt(formData.jobTypeId)
        })
      });

      if (response.ok) {
        setSuccess('Job updated successfully!');
        setTimeout(() => {
          router.push('/employee/posting-history');
        }, 2000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update job');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen text-lg">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={user} />
      
      <main className="p-8 max-w-4xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800">Edit Job</h2>
          <p className="text-gray-600 mt-2">Update job posting details</p>
        </div>
        
        {error && (
          <div className="bg-red-100 text-red-800 p-3 rounded-md mb-5 border border-red-200">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 text-green-800 p-3 rounded-md mb-5 border border-green-200">
            {success}
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-md p-6">
          {/* Job Status */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Job Status</h3>
            <label className="flex items-center">
              <input
                type="checkbox"
                name="jobIsActive"
                checked={formData.jobIsActive}
                onChange={handleInputChange}
                className="mr-2"
              />
              <span className="text-sm">Job is active (accepting applications)</span>
            </label>
          </div>

          {/* Basic Information */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Title</label>
                <input
                  type="text"
                  name="jobName"
                  value={formData.jobName}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Type</label>
                <select
                  name="jobTypeId"
                  value={formData.jobTypeId}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a job type</option>
                  {jobTypes.map(type => (
                    <option key={type.job_type_id} value={type.job_type_id}>
                      {type.job_type_name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input
                  type="text"
                  name="jobLocation"
                  value={formData.jobLocation}
                  onChange={handleInputChange}
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Job Time</label>
                <input
                  type="text"
                  name="jobTime"
                  value={formData.jobTime}
                  onChange={handleInputChange}
                  placeholder="e.g., 9:00 AM - 5:00 PM, Flexible, Night Shift"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salary (PHP)</label>
                <input
                  type="number"
                  name="jobSalary"
                  value={formData.jobSalary}
                  onChange={handleInputChange}
                  placeholder="Optional"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Number of Positions</label>
                <input
                  type="number"
                  name="jobQuantity"
                  value={formData.jobQuantity}
                  onChange={handleInputChange}
                  min="1"
                  required
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Closing Date</label>
                <input
                  type="date"
                  name="jobClosingDate"
                  value={formData.jobClosingDate}
                  onChange={handleInputChange}
                  min={new Date().toISOString().split('T')[0]}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
          
          {/* Job Description */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Job Description</h3>
            <textarea
              name="jobDescription"
              value={formData.jobDescription}
              onChange={handleInputChange}
              rows="5"
              required
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            ></textarea>
          </div>
          
          {/* Requirements and Benefits */}
          <div className="mb-8 pb-6 border-b border-gray-200">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Requirements</h3>
                <textarea
                  name="jobRequirements"
                  value={formData.jobRequirements}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="List the job requirements"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                ></textarea>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Benefits</h3>
                <textarea
                  name="jobBenefits"
                  value={formData.jobBenefits}
                  onChange={handleInputChange}
                  rows="4"
                  placeholder="List the job benefits"
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                ></textarea>
              </div>
            </div>
          </div>
          
          {/* Job Categories */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Job Categories</h3>
            <p className="text-sm text-gray-600 mb-4">Select all that apply</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {jobCategories.map(category => (
                <label key={category.job_category_id} className="flex items-center">
                  <input
                    type="checkbox"
                    value={category.job_category_id}
                    onChange={handleCategoryChange}
                    checked={formData.jobCategories.includes(category.job_category_id)}
                    className="mr-2"
                  />
                  <span className="text-sm">{category.job_category_name}</span>
                </label>
              ))}
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => router.push('/employee/posting-history')}
              className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              {isSubmitting ? 'Updating...' : 'Update Job'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
