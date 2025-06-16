'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function CompanyRegistrationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    // Company Details
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyWebsite: '',
    companyDescription: '',
    // Company Address
    premiseName: '',
    streetName: '',
    barangayName: '',
    cityName: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const validateForm = () => {
    // Check required fields
    const requiredFields = [
      'companyName', 'companyEmail', 'companyPhone',
      'streetName', 'barangayName', 'cityName'
    ];

    for (const field of requiredFields) {
      if (!formData[field]) {
        setError(`Please fill in all required fields`);
        return false;
      }
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.companyEmail)) {
      setError('Please enter a valid company email address');
      return false;
    }

    // Validate website format if provided
    if (formData.companyWebsite && formData.companyWebsite.trim()) {
      const websiteRegex = /^(https?:\/\/)?([\da-z\.-]+)\.([a-z\.]{2,6})([\/\w \.-]*)*\/?$/;
      if (!websiteRegex.test(formData.companyWebsite)) {
        setError('Please enter a valid website URL');
        return false;
      }
    }

    // Validate phone format
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{10,}$/;
    if (!phoneRegex.test(formData.companyPhone)) {
      setError('Please enter a valid phone number');
      return false;
    }

    return true;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/auth/register/company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to verification page
        router.push(`/Login/Verification/Registration?companyId=${data.companyId}&type=company`);
      } else {
        setError(data.message || 'Registration failed');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--background)] py-8 px-4">
      <div className="max-w-2xl mx-auto">
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
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Company Registration</h1>
          <p className="mt-2 text-[var(--text-light)]">Register your organization to start hiring</p>
        </div>

        {/* Registration Form */}
        <div className="bg-[var(--card-background)] rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Company Details Section */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Company Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-gray-700">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    name="companyName"
                    required
                    value={formData.companyName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Enter your company name"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="companyEmail" className="block text-sm font-medium text-gray-700">
                      Company Email *
                    </label>
                    <input
                      type="email"
                      id="companyEmail"
                      name="companyEmail"
                      required
                      value={formData.companyEmail}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="company@example.com"
                    />
                  </div>

                  <div>
                    <label htmlFor="companyPhone" className="block text-sm font-medium text-gray-700">
                      Company Phone *
                    </label>
                    <input
                      type="tel"
                      id="companyPhone"
                      name="companyPhone"
                      required
                      value={formData.companyPhone}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="+63 2 XXX XXXX"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="companyWebsite" className="block text-sm font-medium text-gray-700">
                    Company Website (Optional)
                  </label>
                  <input
                    type="url"
                    id="companyWebsite"
                    name="companyWebsite"
                    value={formData.companyWebsite}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="https://www.yourcompany.com"
                  />
                </div>

                <div>
                  <label htmlFor="companyDescription" className="block text-sm font-medium text-gray-700">
                    Company Description (Optional)
                  </label>
                  <textarea
                    id="companyDescription"
                    name="companyDescription"
                    rows={4}
                    value={formData.companyDescription}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Brief description of your company, what you do, your mission, etc."
                  />
                </div>
              </div>
            </div>

            {/* Company Address Section */}
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Company Address</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="premiseName" className="block text-sm font-medium text-gray-700">
                    Building/Premise Name (Optional)
                  </label>
                  <input
                    type="text"
                    id="premiseName"
                    name="premiseName"
                    value={formData.premiseName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="e.g., ABC Building, Tower 1"
                  />
                </div>

                <div>
                  <label htmlFor="streetName" className="block text-sm font-medium text-gray-700">
                    Street Address *
                  </label>
                  <input
                    type="text"
                    id="streetName"
                    name="streetName"
                    required
                    value={formData.streetName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                    placeholder="e.g., 123 Main Street"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="barangayName" className="block text-sm font-medium text-gray-700">
                      Barangay *
                    </label>
                    <input
                      type="text"
                      id="barangayName"
                      name="barangayName"
                      required
                      value={formData.barangayName}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="e.g., Poblacion"
                    />
                  </div>

                  <div>
                    <label htmlFor="cityName" className="block text-sm font-medium text-gray-700">
                      City *
                    </label>
                    <input
                      type="text"
                      id="cityName"
                      name="cityName"
                      required
                      value={formData.cityName}
                      onChange={handleInputChange}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-purple-500 focus:border-purple-500"
                      placeholder="e.g., Manila"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Terms and Conditions */}
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4">
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <svg className="h-4 w-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3 text-sm">
                  <p className="text-gray-700">
                    <strong>Important:</strong> After submitting this form, a verification email will be sent to your company email address. 
                    Your company registration will only be completed after email verification is confirmed.
                  </p>
                </div>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="text-[var(--error-color)] text-sm bg-[rgba(231, 76, 60, 0.1)] border border-[var(--error-color)] rounded-md p-3">
                {error}
              </div>
            )}

            {/* Submit Button */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => router.back()}
                className="text-gray-600 hover:text-gray-800 font-medium"
              >
                ← Back
              </button>
              
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Registering Company...' : 'Register Company'}
              </button>
            </div>
          </form>
        </div>

        {/* Additional Information */}
        <div className="mt-6 text-center text-sm text-gray-600">
          <p>
            Need help? Contact our support team at{' '}
            <a href="mailto:support@gojob.com" className="text-purple-600 hover:text-purple-500">
              support@gojob.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
