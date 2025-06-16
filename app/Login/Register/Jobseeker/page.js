'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function JobseekerRegistrationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [nationalities, setNationalities] = useState([]);
  const [educationLevels, setEducationLevels] = useState([]);
  const [experienceLevels, setExperienceLevels] = useState([]);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

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
    // Jobseeker Specific
    educationLevelId: '',
    experienceLevelId: '',
    description: ''
  });

  // Load dropdown data on component mount
    useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [nationalitiesRes, educationRes, experienceRes] = await Promise.all([
          fetch('/api/data/nationalities'),
          fetch('/api/data/education-levels'),
          fetch('/api/data/experience-levels')
        ]);

        if (nationalitiesRes.ok) {
          const nationalitiesData = await nationalitiesRes.json();
          if (nationalitiesData.success) {
            setNationalities(nationalitiesData.data);
          } else {
            console.error('Nationalities API error:', nationalitiesData.message);
          }
        } else {
          console.error('Failed to fetch nationalities:', nationalitiesRes.status);
        }

        if (educationRes.ok) {
          const educationData = await educationRes.json();
          if (educationData.success) {
            setEducationLevels(educationData.data);
          } else {
            console.error('Education Levels API error:', educationData.message);
          }
        } else {
          console.error('Failed to fetch education levels:', educationRes.status);
        }

        if (experienceRes.ok) {
          const experienceData = await experienceRes.json();
          if (experienceData.success) {
            setExperienceLevels(experienceData.data);
          } else {
            console.error('Experience Levels API error:', experienceData.message);
          }
        } else {
          console.error('Failed to fetch experience levels:', experienceRes.status);
        }
      } catch (error) {
        console.error('Failed to load dropdown data:', error);
      }
    };

    loadDropdownData();
  }, []);

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
      'firstName', 'lastName', 'dateOfBirth', 'gender', 'nationalityId',
      'email', 'username', 'phone', 'password', 'confirmPassword',
      'educationLevelId', 'experienceLevelId'
    ];

    for (const field of requiredFields) {
      if (!formData[field]) {
        setError(`Please fill in all required fields`);
        return false;
      }
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

    // Validate age (must be at least 16)
    const birthDate = new Date(formData.dateOfBirth);
    const today = new Date();
    const age = today.getFullYear() - birthDate.getFullYear();
    if (age < 16) {
      setError('You must be at least 16 years old to register');
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
      const response = await fetch('/api/auth/register/jobseeker', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (response.ok) {
        // Redirect to verification page
        router.push(`/Login/Verification/Registration?accountId=${data.accountId}&type=jobseeker`);
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
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Jobseeker Registration</h1>
          <p className="mt-2 text-[var(--text-light)]">Create your account to start your job search</p>
        </div>

        {/* Registration Form */}
        <div className="bg-[var(--card-background)] rounded-xl shadow-lg p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-md p-4">
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                      className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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
                      className="block w-full px-3 py-2 pr-10 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
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

            {/* Professional Details Section */}
            <div className="pb-6">
              <h3 className="text-lg font-medium text-[var(--foreground)] mb-4">Professional Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="educationLevelId" className="block text-sm font-medium text-[var(--text-dark)]">
                    Education Level *
                  </label>
                  <select
                    id="educationLevelId"
                    name="educationLevelId"
                    required
                    value={formData.educationLevelId}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Education Level</option>
                    {educationLevels.map((level) => (
                      <option key={level.job_seeker_education_level_id} value={level.job_seeker_education_level_id}>
                        {level.education_level_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="experienceLevelId" className="block text-sm font-medium text-[var(--text-dark)]">
                    Experience Level *
                  </label>
                  <select
                    id="experienceLevelId"
                    name="experienceLevelId"
                    required
                    value={formData.experienceLevelId}
                    onChange={handleInputChange}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select Experience Level</option>
                    {experienceLevels.map((level) => (
                      <option key={level.job_seeker_experience_level_id} value={level.job_seeker_experience_level_id}>
                        {level.experience_level_name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="md:col-span-2">
                  <label htmlFor="description" className="block text-sm font-medium text-[var(--text-dark)]">
                    Description
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    rows={3}
                    value={formData.description}
                    onChange={handleInputChange}
                    placeholder="Tell us about yourself, your skills, and what you're looking for..."
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={isLoading}
                className={`inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-sm font-medium rounded-md text-white ${
                  isLoading
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[var(--primary-color)] hover:bg-[var(--secondary-color)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-color)]'
                }`}
              >
                {isLoading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
