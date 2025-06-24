'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function JobseekerRegistrationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [darkMode, setDarkMode] = useState(false);
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

  // Detect dark mode preference
  useEffect(() => {
    // Check system preference
    const darkModeQuery = window.matchMedia('(prefers-color-scheme: dark)');
    setDarkMode(darkModeQuery.matches);

    // Listen for changes
    const updateDarkMode = (e) => setDarkMode(e.matches);
    darkModeQuery.addEventListener('change', updateDarkMode);

    return () => darkModeQuery.removeEventListener('change', updateDarkMode);
  }, []);

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
    // Clear error for the field being edited
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Required fields
    const requiredFields = [
      'firstName', 'lastName', 'dateOfBirth', 'gender', 'nationalityId',
      'email', 'username', 'phone', 'password', 'confirmPassword',
      'educationLevelId', 'experienceLevelId'
    ];
    requiredFields.forEach(field => {
      if (!formData[field]) {
        newErrors[field] = 'This field is required';
      }
    });

    // Email format
    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    // Phone number format
    if (formData.phone && !/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/.test(formData.phone)) {
        newErrors.phone = 'Invalid phone number format. Use numbers, +, and -.';
    }

    // Password match
    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    // Password strength
    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }

    // Age validation
    if (formData.dateOfBirth) {
        const birthDate = new Date(formData.dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        if (age < 16) {
            newErrors.dateOfBirth = 'You must be at least 16 years old';
        }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setErrors({});

    try {
      const response = await fetch('/api/auth/register/jobseeker', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await response.json();
      if (response.ok) {
        router.push(`/Login/Verification/Registration?accountId=${data.accountId}&type=jobseeker`);
      } else {
        setErrors({ form: data.message || 'Registration failed' });
      }
    } catch (error) {
      setErrors({ form: 'Network error. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div 
      className="min-h-screen bg-[var(--background)] py-8 px-4 transition-colors duration-300" 
      data-theme="jobseeker"
      data-mode={darkMode ? 'dark' : 'light'}
    >
      <div className="max-w-2xl mx-auto">
        {/* Header with Back Button */}
        <div className="flex items-center justify-between mb-8">
          <button
            onClick={() => router.push('/Login/Register')}
            className="flex items-center text-[var(--text-dark)] hover:text-[var(--primary-color)] transition-colors duration-200"
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Back to Registration
          </button>
        </div>

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
        <div className="bg-[var(--card-background)] rounded-xl shadow-lg p-8 border border-[var(--border-color)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Form-wide Error Message */}
            {errors.form && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 rounded-md p-4">
                <p>{errors.form}</p>
              </div>
            )}

            {/* Personal Details Section */}
            <div className="border-b border-[var(--border-color)] pb-6">
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
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                  {errors.firstName && <p className="text-red-500 text-xs mt-1">{errors.firstName}</p>}
                </div>

                <div>
                  <label htmlFor="lastName" className="block text-sm font-medium text-[var(--text-dark)]">
                    Last Name *
                  </label>
                  <input
                    type="text"
                    id="lastName"
                    name="lastName"
                    value={formData.lastName}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                  {errors.lastName && <p className="text-red-500 text-xs mt-1">{errors.lastName}</p>}
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
                    className="form-input"
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
                    value={formData.dateOfBirth}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                  {errors.dateOfBirth && <p className="text-red-500 text-xs mt-1">{errors.dateOfBirth}</p>}
                </div>

                <div>
                  <label htmlFor="gender" className="block text-sm font-medium text-[var(--text-dark)]">
                    Gender *
                  </label>
                  <select
                    id="gender"
                    name="gender"
                    value={formData.gender}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  >
                    <option value="">Select Gender</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                  {errors.gender && <p className="text-red-500 text-xs mt-1">{errors.gender}</p>}
                </div>
                
                <div>
                  <label htmlFor="nationalityId" className="block text-sm font-medium text-[var(--text-dark)]">
                    Nationality *
                  </label>
                  <select
                    id="nationalityId"
                    name="nationalityId"
                    value={formData.nationalityId}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  >
                    <option value="">Select Nationality</option>
                    {nationalities.map(nat => (
                      <option key={nat.nationality_id} value={nat.nationality_id}>
                        {nat.nationality_name}
                      </option>
                    ))}
                  </select>
                  {errors.nationalityId && <p className="text-red-500 text-xs mt-1">{errors.nationalityId}</p>}
                </div>
              </div>
            </div>

            {/* Account Details Section */}
            <div className="border-b border-[var(--border-color)] pb-6">
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
                    value={formData.email}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                  {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email}</p>}
                </div>

                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-[var(--text-dark)]">
                    Username *
                  </label>
                  <input
                    type="text"
                    id="username"
                    name="username"
                    value={formData.username}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                  {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username}</p>}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-[var(--text-dark)]">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                  {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone}</p>}
                </div>
              </div>
            </div>

            {/* Password Section */}
            <div className="border-b border-[var(--border-color)] pb-6">
              <h3 className="text-lg font-medium text-[var(--foreground)] mb-4">Set Your Password</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="relative">
                  <label htmlFor="password" name="password" className="block text-sm font-medium text-[var(--text-dark)]">
                    Password *
                  </label>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    {showPassword ? (
                      <svg className="h-5 w-5 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7A9.97 9.97 0 014.02 8.971m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                  {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password}</p>}
                </div>
                
                <div className="relative">
                  <label htmlFor="confirmPassword" name="confirmPassword" className="block text-sm font-medium text-[var(--text-dark)]">
                    Confirm Password *
                  </label>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute inset-y-0 right-0 flex items-center pr-3"
                  >
                    {showConfirmPassword ? (
                      <svg className="h-5 w-5 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7A9.97 9.97 0 014.02 8.971m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="h-5 w-5 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                  {errors.confirmPassword && <p className="text-red-500 text-xs mt-1">{errors.confirmPassword}</p>}
                </div>
              </div>
            </div>

            {/* Job Preferences Section */}
            <div>
              <h3 className="text-lg font-medium text-[var(--foreground)] mb-4">Job Preferences</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="educationLevelId" className="block text-sm font-medium text-[var(--text-dark)]">
                    Highest Education Level *
                  </label>
                  <select
                    id="educationLevelId"
                    name="educationLevelId"
                    value={formData.educationLevelId}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  >
                    <option value="">Select Education Level</option>
                    {educationLevels.map(level => (
                      <option key={level.job_seeker_education_level_id} value={level.job_seeker_education_level_id}>
                        {level.education_level_name}
                      </option>
                    ))}
                  </select>
                  {errors.educationLevelId && <p className="text-red-500 text-xs mt-1">{errors.educationLevelId}</p>}
                </div>

                <div>
                  <label htmlFor="experienceLevelId" className="block text-sm font-medium text-[var(--text-dark)]">
                    Experience Level *
                  </label>
                  <select
                    id="experienceLevelId"
                    name="experienceLevelId"
                    value={formData.experienceLevelId}
                    onChange={handleInputChange}
                    className="form-input"
                    required
                  >
                    <option value="">Select Experience Level</option>
                    {experienceLevels.map(level => (
                      <option key={level.job_seeker_experience_level_id} value={level.job_seeker_experience_level_id}>
                        {level.experience_level_name}
                      </option>
                    ))}
                  </select>
                  {errors.experienceLevelId && <p className="text-red-500 text-xs mt-1">{errors.experienceLevelId}</p>}
                </div>
              </div>

              <div className="mt-4">
                <label htmlFor="description" className="block text-sm font-medium text-[var(--text-dark)]">
                  Briefly describe yourself (Optional)
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows="4"
                  value={formData.description}
                  onChange={handleInputChange}
                  className="form-input"
                  placeholder="E.g., A passionate software developer with 3 years of experience in React and Node.js..."
                ></textarea>
              </div>
            </div>
            
            {/* Submit Button */}
            <div className="flex items-center justify-end space-x-4 mt-6">
              <button
                type="submit"
                disabled={isLoading}
                className="flex justify-center items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-color)] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  'Register'
                )}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
