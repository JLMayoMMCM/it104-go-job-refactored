'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EditJobPreferences() {
  const [jobFields, setJobFields] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [expandedFields, setExpandedFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    const accountId = localStorage.getItem('accountId');
    const accountType = localStorage.getItem('accountType');
    
    if (!accountId || accountType !== '2') {
      router.push('/Login');
      return;
    }
    
    loadJobFieldsAndPreferences(accountId);
  }, [router]);

  // Update selected fields when categories change
  useEffect(() => {
    const fieldsFromCategories = jobFields.filter(field => 
      field.job_categories && field.job_categories.some(cat => 
        selectedCategories.includes(cat.job_category_id)
      )
    ).map(field => field.category_field_id);
    
    setSelectedFields([...new Set(fieldsFromCategories)]);
  }, [selectedCategories, jobFields]);

  const loadJobFieldsAndPreferences = async (accountId) => {
    try {
      setError(null);
      
      // Load job fields
      const jobFieldsRes = await fetch('/api/data/job-fields');
      if (jobFieldsRes.ok) {
        const jobFieldsData = await jobFieldsRes.json();
        if (jobFieldsData.success && jobFieldsData.data) {
          setJobFields(jobFieldsData.data);
        }
      }
      
      // TODO: Load user's current preferences when API is available
      // For now, we'll start with empty preferences
      
    } catch (error) {
      console.error('Error loading data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

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

  const handleSavePreferences = async () => {
    if (selectedCategories.length === 0) {
      setError('Please select at least one job category.');
      return;
    }
    
    setSaving(true);
    setError('');
    
    try {
      // TODO: Implement API call to update preferences
      // For now, simulate saving
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      setSuccessMessage('Your job preferences have been updated successfully!');
      
      setTimeout(() => {
        router.push('/Dashboard/jobseeker');
      }, 2000);
    } catch (error) {
      setError('Failed to save preferences. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)]"></div>
      </div>
    );
  }

  if (error && !successMessage) {
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
              <h3 className="text-sm font-medium text-[var(--error-color)]">Error</h3>
              <div className="mt-2 text-sm text-[var(--error-color)]">
                <p>{error}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    const accountId = localStorage.getItem('accountId');
                    if (accountId) loadJobFieldsAndPreferences(accountId);
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
      {/* Header */}
      <div className="profile-header">
        <h1 className="text-3xl font-bold mb-2">Edit Your Job Preferences</h1>
        <p className="text-[var(--light-color)] text-lg">Update the job categories you're interested in to receive personalized job recommendations.</p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-[var(--error-color)]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-[var(--error-color)]">Error</h3>
              <div className="mt-2 text-sm text-[var(--error-color)]">
                <p>{error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Message */}
      {successMessage && (
        <div className="success-message">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-[var(--success-color)]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
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

      {/* Job Preferences Section */}
      <div className="card overflow-hidden">
        <div className="panel-header">
          <h3 className="text-lg font-semibold text-white">Job Preferences</h3>
          <p className="text-sm text-white text-opacity-80 mt-1">
            Select the job categories you're interested in. You can expand each field to see specific categories.
          </p>
        </div>
        <div className="p-6">
          {/* Selected Categories Summary */}
          {selectedCategories.length > 0 && (
            <div className="mb-4 p-3 bg-[var(--light-color)] bg-opacity-20 rounded-lg">
              <p className="text-sm font-medium text-[var(--foreground)] mb-2">
                Selected Categories ({selectedCategories.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {jobFields.map(field => 
                  field.job_categories?.filter(cat => selectedCategories.includes(cat.job_category_id)).map(cat => (
                    <span key={cat.job_category_id} className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[var(--primary-color)] bg-opacity-20 text-[var(--foreground)]">
                      {cat.job_category_name}
                      <button
                        type="button"
                        onClick={() => handleCategoryToggle(cat.job_category_id)}
                        className="ml-1 text-[var(--foreground)] hover:text-[var(--accent-color)]"
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
              <div key={field.category_field_id} className="border border-[var(--border-color)] rounded-lg">
                <button
                  type="button"
                  onClick={() => handleFieldToggle(field.category_field_id)}
                  className={`w-full px-4 py-3 text-left flex items-center justify-between ${
                    selectedFields.includes(field.category_field_id)
                      ? 'bg-[var(--primary-color)] bg-opacity-10 border-[var(--primary-color)]'
                      : 'bg-[var(--background)]'
                  } rounded-t-lg hover:bg-[var(--border-color)]`}
                >
                  <div className="flex items-center">
                    <span className={`text-lg font-semibold ${
                      selectedFields.includes(field.category_field_id) ? 'text-[var(--primary-color)]' : 'text-[var(--foreground)]'
                    }`}>
                      {field.category_field_name}
                    </span>
                    {selectedFields.includes(field.category_field_id) && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[var(--primary-color)] bg-opacity-20 text-[var(--primary-color)]">
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
                  <div className="p-4 border-t border-[var(--border-color)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {field.job_categories?.map(category => (
                        <button
                          key={category.job_category_id}
                          type="button"
                          onClick={() => handleCategoryToggle(category.job_category_id)}
                          className={`p-3 text-left rounded-lg border-2 transition-all ${
                            selectedCategories.includes(category.job_category_id)
                              ? 'border-[var(--primary-color)] bg-[var(--primary-color)] bg-opacity-10 text-[var(--primary-color)]'
                              : 'border-[var(--border-color)] bg-[var(--background)] text-[var(--foreground)] hover:border-[var(--hover-color)] hover:bg-[var(--border-color)]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{category.job_category_name}</span>
                            {selectedCategories.includes(category.job_category_id) && (
                              <svg className="w-5 h-5 text-[var(--primary-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between">
        <button
          onClick={() => router.push('/Dashboard/jobseeker')}
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          onClick={handleSavePreferences}
          disabled={saving || selectedCategories.length === 0}
          className={`btn btn-primary ${
            saving || selectedCategories.length === 0
              ? 'opacity-50 cursor-not-allowed'
              : ''
          }`}
        >
          {saving ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            'Save Preferences'
          )}
        </button>
      </div>
    </div>
  );
}
