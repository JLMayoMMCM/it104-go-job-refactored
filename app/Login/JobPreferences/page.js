'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Image from 'next/image';

export default function JobPreferencesPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountId = searchParams.get('accountId');
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [jobFields, setJobFields] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [expandedFields, setExpandedFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);

  // Load job fields data on component mount
  useEffect(() => {
    if (!accountId) {
      setError('Invalid session. Please register again.');
      return;
    }

    const loadJobFields = async () => {
      try {
        const jobFieldsRes = await fetch('/api/data/job-fields');
        if (jobFieldsRes.ok) {
          const jobFieldsData = await jobFieldsRes.json();
          if (jobFieldsData.success && jobFieldsData.data) {
            setJobFields(jobFieldsData.data);
          }
        }
      } catch (error) {
        console.error('Failed to load job fields:', error);
        setError('Failed to load job categories. Please try again.');
      }
    };

    loadJobFields();
  }, [accountId]);

  // Update selected fields when categories change
  useEffect(() => {
    const fieldsFromCategories = jobFields.filter(field => 
      field.job_categories && field.job_categories.some(cat => 
        selectedCategories.includes(cat.job_category_id)
      )
    ).map(field => field.category_field_id);
    
    setSelectedFields([...new Set(fieldsFromCategories)]);
  }, [selectedCategories, jobFields]);

  const handleFieldToggle = (fieldId) => {
    setExpandedFields(prev => {
      if (prev.includes(fieldId)) {
        return prev.filter(id => id !== fieldId);
      } else {
        return [...prev, fieldId];
      }
    });
  };

  const handleCategoryToggle = (categoryId) => {
    setSelectedCategories(prev => {
      if (prev.includes(categoryId)) {
        return prev.filter(id => id !== categoryId);
      } else {
        return [...prev, categoryId];
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (selectedCategories.length === 0) {
      setError('Please select at least one job category preference');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/jobseeker/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId: accountId,
          selectedJobCategories: selectedCategories,
          selectedJobFields: selectedFields
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('Job preferences saved successfully! Redirecting to dashboard...');
        
        // Store preferences flag
        localStorage.setItem('hasJobPreferences', 'true');
        localStorage.setItem('accountId', accountId);
        localStorage.setItem('accountType', '2');
        
        setTimeout(() => {
          router.push('/Dashboard/jobseeker');
        }, 2000);
      } else {
        setError(data.message || 'Failed to save preferences');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSkip = () => {
    // Allow skipping for now, but mark as no preferences
    localStorage.setItem('hasJobPreferences', 'false');
    localStorage.setItem('accountId', accountId);
    localStorage.setItem('accountType', '2');
    router.push('/Dashboard/jobseeker');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="mx-auto h-20 w-auto mb-4">
            <Image
              src="/Assets/Title.png"
              alt="GoJob Logo"
              width={160}
              height={80}
              className="mx-auto"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">Set Your Job Preferences</h1>
          <p className="mt-2 text-gray-600">Help us recommend the best jobs for you by selecting your preferred categories</p>
        </div>

        {/* Form */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
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

            {/* Success Message */}
            {successMessage && (
              <div className="bg-green-50 border border-green-200 rounded-md p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
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

            {/* Job Preferences Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Job Categories</h3>
              <p className="text-sm text-gray-600 mb-6">
                Select the job categories you're interested in. You can expand each field to see specific categories.
              </p>
              
              {/* Selected Categories Summary */}
              {selectedCategories.length > 0 && (
                <div className="mb-6 p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm font-medium text-blue-900 mb-2">
                    Selected Categories ({selectedCategories.length}):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {jobFields.map(field => 
                      field.job_categories?.filter(cat => selectedCategories.includes(cat.job_category_id)).map(cat => (
                        <span key={cat.job_category_id} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                          {cat.job_category_name}
                          <button
                            type="button"
                            onClick={() => handleCategoryToggle(cat.job_category_id)}
                            className="ml-2 text-blue-600 hover:text-blue-800"
                          >
                            ×
                          </button>
                        </span>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Job Fields and Categories */}
              <div className="space-y-4">
                {jobFields.map(field => (
                  <div key={field.category_field_id} className="border border-gray-200 rounded-lg">
                    <button
                      type="button"
                      onClick={() => handleFieldToggle(field.category_field_id)}
                      className={`w-full px-4 py-3 text-left flex items-center justify-between ${
                        selectedFields.includes(field.category_field_id)
                          ? 'bg-blue-50 border-blue-200'
                          : 'bg-gray-50'
                      } rounded-t-lg hover:bg-gray-100`}
                    >
                      <div className="flex items-center">
                        <span className={`text-lg font-semibold ${
                          selectedFields.includes(field.category_field_id) ? 'text-blue-900' : 'text-gray-900'
                        }`}>
                          {field.category_field_name}
                        </span>
                        {selectedFields.includes(field.category_field_id) && (
                          <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                            {field.job_categories?.filter(cat => selectedCategories.includes(cat.job_category_id)).length} selected
                          </span>
                        )}
                      </div>
                      <svg
                        className={`w-5 h-5 transition-transform ${
                          expandedFields.includes(field.category_field_id) ? 'rotate-180' : ''
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                    
                    {expandedFields.includes(field.category_field_id) && (
                      <div className="p-4 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                          {field.job_categories?.map(category => (
                            <button
                              key={category.job_category_id}
                              type="button"
                              onClick={() => handleCategoryToggle(category.job_category_id)}
                              className={`p-3 text-left rounded-lg border-2 transition-all ${
                                selectedCategories.includes(category.job_category_id)
                                  ? 'border-blue-500 bg-blue-50 text-blue-900'
                                  : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <span className="font-medium">{category.job_category_name}</span>
                                {selectedCategories.includes(category.job_category_id) && (
                                  <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </div>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex justify-between pt-6">
              <button
                type="button"
                onClick={handleSkip}
                className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
              >
                Skip for Now
              </button>
              <button
                type="submit"
                disabled={isLoading || selectedCategories.length === 0}
                className={`inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                  isLoading || selectedCategories.length === 0
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500'
                }`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Saving...
                  </>
                ) : (
                  'Save Preferences & Continue'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
