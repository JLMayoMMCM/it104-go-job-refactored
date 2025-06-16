'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function EmployeeRegistrationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [nationalities, setNationalities] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [companyVerification, setCompanyVerification] = useState(null);

  const [formData, setFormData] = useState({
    // Personal Details
    firstName: '',
    lastName: '',
    middleName: '',
    dateOfBirth: '',
    gender: '',
    nationalityId: '',
    // Account Details
    email: '',
    username: '',
    phone: '',
    password: '',
    confirmPassword: '',
    // Employee Specific
    companyId: '',
    positionName: ''
  });

  // Load nationalities on component mount
  useEffect(() => {
    const loadNationalities = async () => {
      try {
        const response = await fetch('/api/data/nationalities');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setNationalities(data.data);
          } else {
            console.error('Nationalities API error:', data.message);
          }
        } else {
          console.error('Failed to fetch nationalities:', response.status);
        }
      } catch (error) {
        console.error('Failed to load nationalities:', error);
      }
    };

    loadNationalities();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
    
    // Clear company verification when company ID changes
    if (name === 'companyId') {
      setCompanyVerification(null);
    }
  };

  const verifyCompany = async () => {
    if (!formData.companyId) {
      setError('Please enter a Company ID');
      return;
    }

    try {
      const response = await fetch(`/api/data/verify-company?companyId=${formData.companyId}`);
      const data = await response.json();

      if (response.ok) {
        setCompanyVerification(data.company);
        setError('');
      } else {
        setCompanyVerification(null);
        setError(data.message || 'Company not found');
      }
    } catch (error) {
      setCompanyVerification(null);
      setError('Failed to verify company. Please try again.');
    }
  };

  const validateForm = () => {
    // Check required fields
    const requiredFields = [
      'firstName', 'lastName', 'dateOfBirth', 'gender', 'nationalityId',
      'email', 'username', 'phone', 'password', 'confirmPassword',
      'companyId', 'positionName'
    ];

    for (const field of requiredFields) {
      if (!formData[field]) {
        setError(`Please fill in all required fields`);
        return false;
      }
    }

    // Validate company verification
    if (!companyVerification) {
      setError('Please verify your Company ID before proceeding');
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      setError('Please enter a valid email address');
      return false;
    }

    // Validate password match
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return false;
    }

    // Validate password strength
    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters long');
      return false;
    }

    // Validate age (must be at least 18 for employees)
    const birthDate = new Date(formData.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 18) {
      setError('You must be at least 18 years old to register as an employee');
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
      const response = await fetch('/api/auth/register/employee', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          companyEmail: companyVerification.company_email
        }),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to verification page
        router.push(`/Login/Verification/Registration?accountId=${data.accountId}&type=employee`);
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
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Employee Registration</h1>
          <p className="mt-2 text-[var(--text-light)]">Join your company's hiring team</p>
        </div>

        {/* Registration Form */}
        <div className="bg-[var(--card-background)] rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Personal Details Section */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-[var(--foreground)] mb-4">Personal Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="firstName" className="block text-sm font-medium text-[var(--text-dark)]">
                    First Name *
                  </label>
                  <input
                    type="text"
                    id="firstName"
                    name="firstName"
                    required
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-[var(--text-dark)]">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    required
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label htmlFor="middleName" className="block text-sm font-medium text-[var(--text-dark)]">
                    Middle Name
                  </label>
                  <input
                    type="text"
                    id="middleName"
                    name="middleName"
                    value={formData.middleName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label htmlFor="dateOfBirth" className="block text-sm font-medium text-[var(--text-dark)]">
                    Date of Birth *
                  </label>
                  <input
                    type="date"
                    id="dateOfBirth"
                    name="dateOfBirth"
                    required
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-[var(--text-dark)]">
                    Gender *
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    required
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select Gender</option>
                    <option value="1">Male</option>
                    <option value="2">Female</option>
                    <option value="3">Other</option>
                    <option value="4">Prefer not to say</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="nationalityId" className="block text-sm font-medium text-[var(--text-dark)]">
                    Nationality *
                  </label>
                  <select
                    id="nationalityId"
                    name="nationalityId"
                    required
                    value={formData.nationalityId}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Select Nationality</option>
                    {nationalities.map((nationality) => (
                      <option key={nationality.nationality_id} value={nationality.nationality_id}>
                        {nationality.nationality_name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Account Details Section */}
            <div className="border-b border-gray-200 pb-6">
              <h3 className="text-lg font-medium text-[var(--foreground)] mb-4">Account Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[var(--text-dark)]">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    id="email"
                    name="email"
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-[var(--text-dark)]">
                    Username *
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    required
                    value={formData.username}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                  />
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-[var(--text-dark)]">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    placeholder="+63 9XX XXX XXXX"
                  />
                </div>

                <div></div>

                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-[var(--text-dark)]">
                    Password *
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      name="password"
                      required
                      value={formData.password}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="Min. 8 characters"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-light)] hover:text-[var(--text-dark)]"
                    >
                      {showPassword ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-[var(--text-dark)]">
                    Confirm Password *
                  </label>
                  <div className="mt-1 relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      name="confirmPassword"
                      required
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--text-light)] hover:text-[var(--text-dark)]"
                    >
                      {showConfirmPassword ? (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.878 9.878L3 3m6.878 6.878L21 21" />
                        </svg>
                      ) : (
                        <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Company Details Section */}
            <div>
              <h3 className="text-lg font-medium text-[var(--foreground)] mb-4">Company Details</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="companyId" className="block text-sm font-medium text-[var(--text-dark)]">
                    Company ID *
                  </label>
                  <div className="mt-1 flex space-x-2">
                    <input
                      type="text"
                      id="companyId"
                      name="companyId"
                      required
                      value={formData.companyId}
                      onChange={handleInputChange}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="Enter your company's ID"
                    />
                    <button
                      type="button"
                      onClick={verifyCompany}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      Verify
                    </button>
                  </div>
                  
                  {companyVerification && (
                    <div className="mt-2 p-3 bg-[rgba(83, 168, 182, 0.1)] border border-[var(--success-color)] rounded-md">
                      <div className="flex items-center">
                        <svg className="h-5 w-5 text-[var(--success-color)] mr-2" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                        </svg>
                        <div>
                          <p className="text-sm font-medium text-[var(--success-color)]">Company Verified</p>
                          <p className="text-sm text-[var(--success-color)]">{companyVerification.company_name}</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div>
                  <label htmlFor="positionName" className="block text-sm font-medium text-[var(--text-dark)]">
                    Position/Role *
                  </label>
                  <input
                    type="text"
                    id="positionName"
                    name="positionName"
                    required
                    value={formData.positionName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    placeholder="e.g., HR Manager, Recruiter, Team Lead"
                  />
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
                className="text-[var(--text-light)] hover:text-[var(--text-dark)] font-medium"
              >
                ← Back
              </button>
              
              <button
                type="submit"
                disabled={isLoading}
                className="px-6 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Creating Account...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
