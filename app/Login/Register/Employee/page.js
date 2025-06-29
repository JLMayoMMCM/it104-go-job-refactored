'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function EmployeeRegistrationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [darkMode, setDarkMode] = useState(false);
  const [nationalities, setNationalities] = useState([]);
  const [genders, setGenders] = useState([]);
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

  // Load nationalities on component mount
  useEffect(() => {
    const loadDropdownData = async () => {
      try {
        const [gendersRes, nationalitiesRes] = await Promise.all([
          fetch('/api/data/genders'),
          fetch('/api/data/nationalities')
        ]);

        if (gendersRes.ok) {
          const gendersData = await gendersRes.json();
          if (gendersData.success) {
            setGenders(gendersData.data);
          } else {
            console.error('Genders API error:', gendersData.message);
          }
        } else {
          console.error('Failed to fetch genders:', gendersRes.status);
        }

        if (nationalitiesRes.ok) {
          const data = await nationalitiesRes.json();
          if (data.success) {
            setNationalities(data.data);
          } else {
            console.error('Nationalities API error:', data.message);
          }
        } else {
          console.error('Failed to fetch nationalities:', nationalitiesRes.status);
        }
      } catch (error) {
        console.error('Failed to load dropdown data:', error);
      }
    };

    loadDropdownData();
  }, []);

  // Format phone number for display with spaces
  function formatPHNumberForDisplay(number) {
    if (!number) return '';
    const digits = number.replace(/\D/g, '');
    if (digits.length === 10) return `${digits.slice(0,3)} ${digits.slice(3,6)} ${digits.slice(6,10)}`;
    if (digits.length === 8) return `${digits.slice(0,4)} ${digits.slice(4,8)}`;
    if (digits.length === 7) return `${digits.slice(0,3)} ${digits.slice(3,7)}`;
    return digits;
  }
  // Clean phone number for storage (remove spaces, prefix)
  function cleanPHNumberForStorage(number) {
    return number.replace(/\D/g, '');
  }

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'phone') {
      // Only allow digits, format with spaces
      let digits = value.replace(/\D/g, '');
      // Limit to 10 digits (PH mobile max)
      if (digits.length > 10) digits = digits.slice(0, 10);
      setFormData(prev => ({
        ...prev,
        phone: digits
      }));
      if (errors.phone) {
        setErrors(prev => ({ ...prev, phone: null }));
      }
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));

    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
    if (name === 'companyId') {
      setCompanyVerification(null);
    }
  };

  const verifyCompany = async () => {
    if (!formData.companyId) {
      setErrors(prev => ({ ...prev, companyId: 'Please enter a Company ID' }));
      return;
    }

    try {
      const response = await fetch(`/api/data/verify-company?companyId=${formData.companyId}`);
      const data = await response.json();

      if (response.ok) {
        setCompanyVerification(data.company);
        setErrors(prev => ({ ...prev, companyId: null }));
      } else {
        setCompanyVerification(null);
        setErrors(prev => ({ ...prev, companyId: data.message || 'Company not found' }));
      }
    } catch (error) {
      setCompanyVerification(null);
      setErrors(prev => ({ ...prev, companyId: 'Failed to verify company. Please try again.' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = [
      'firstName', 'lastName', 'dateOfBirth', 'gender', 'nationalityId',
      'email', 'username', 'phone', 'password', 'confirmPassword',
      'companyId', 'positionName'
    ];
    requiredFields.forEach(field => {
      if (!formData[field]) newErrors[field] = 'This field is required';
    });

    if (!companyVerification) {
      newErrors.companyId = 'Please verify your Company ID before proceeding';
    }

    if (formData.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (formData.phone && !/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/.test(formData.phone)) {
      newErrors.phone = 'Invalid phone number format. Use numbers, +, and -.';
    }

    if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    if (formData.password && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }
    
    if (formData.dateOfBirth) {
        const birthDate = new Date(formData.dateOfBirth);
        const today = new Date();
        let age = today.getFullYear() - birthDate.getFullYear();
        const m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        if (age < 18) {
            newErrors.dateOfBirth = 'You must be at least 18 years old';
        }
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    setIsLoading(true);
    setErrors({});
    try {
      // Clean phone number before submit
      const cleanedPhone = cleanPHNumberForStorage(formData.phone);
      const response = await fetch('/api/auth/register/employee', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...formData, phone: cleanedPhone, companyEmail: companyVerification.company_email }),
      });
      const data = await response.json();
      if (response.ok) {
        router.push(`/Login/Verification/Registration?accountId=${data.accountId}&type=employee`);
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
      data-theme="employee"
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
              className="mx-auto filter-none dark:brightness-90"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Employee Registration</h1>
          <p className="mt-2 text-[var(--text-light)]">Join your company to start managing jobs</p>
        </div>

        {/* Registration Form */}
        <div className="bg-[var(--card-background)] rounded-xl shadow-lg p-8 border border-[var(--border-color)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {Object.values(errors).some(error => error && error.length > 0) && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 rounded-md p-4">
                {Object.entries(errors).map(([field, error]) =>
                  error && error.length > 0 ? <p key={field}>{error}</p> : null
                )}
              </div>
            )}

            {/* Company Verification Section */}
            <div className="border-b border-[var(--border-color)] pb-6">
              <h3 className="text-lg font-medium text-[var(--foreground)] mb-4">Company Verification</h3>
              <div className="flex gap-4 items-end">
                <div className="flex-1">
                  <label htmlFor="companyId" className="block text-sm font-medium text-[var(--text-dark)]">
                    Company ID *
                  </label>
<input
  type="text"
  id="companyId"
  name="companyId"
  required
  value={formData.companyId}
  onChange={handleInputChange}
  className={`mt-1 block w-full rounded-md border-[var(--border-color)] bg-[var(--input-background)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] transition-colors duration-200 ${errors.companyId ? 'border-red-500' : ''}`}
  placeholder="Enter Company ID"
/>
                  {errors.companyId && <p className="mt-1 text-xs text-red-500">{errors.companyId}</p>}
                </div>
                <button
                  type="button"
                  onClick={verifyCompany}
                  className="px-4 py-2 border border-[var(--primary-color)] text-[var(--primary-color)] rounded-md hover:bg-[var(--primary-color)] hover:text-white transition-colors duration-200"
                >
                  Verify
                </button>
              </div>
              {companyVerification && (
                <div className="mt-4 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-md">
                  <p className="text-green-700 dark:text-green-200">
                    Company verified: {companyVerification.company_name}
                  </p>
                </div>
              )}
            </div>

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
                    required
                    value={formData.firstName}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full rounded-md border-[var(--border-color)] bg-[var(--input-background)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] transition-colors duration-200 ${errors.firstName ? 'border-red-500' : ''}`}
                  />
                  {errors.firstName && <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>}
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
                    className={`mt-1 block w-full rounded-md border-[var(--border-color)] bg-[var(--input-background)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] transition-colors duration-200 ${errors.lastName ? 'border-red-500' : ''}`}
                  />
                  {errors.lastName && <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>}
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
                    className={`mt-1 block w-full rounded-md border-[var(--border-color)] bg-[var(--input-background)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] transition-colors duration-200 ${errors.middleName ? 'border-red-500' : ''}`}
                  />
                  {errors.middleName && <p className="mt-1 text-xs text-red-500">{errors.middleName}</p>}
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
                    className={`mt-1 block w-full rounded-md border-[var(--border-color)] bg-[var(--input-background)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] transition-colors duration-200 ${errors.dateOfBirth ? 'border-red-500' : ''}`}
                  />
                  {errors.dateOfBirth && <p className="mt-1 text-xs text-red-500">{errors.dateOfBirth}</p>}
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
                    className={`mt-1 block w-full rounded-md border-[var(--border-color)] bg-[var(--input-background)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] transition-colors duration-200 ${errors.gender ? 'border-red-500' : ''}`}
                  >
                    <option value="">Select Gender</option>
                    {genders.map(gender => (
                      <option key={gender.gender_id} value={gender.gender_id}>
                        {gender.gender_name}
                      </option>
                    ))}
                  </select>
                  {errors.gender && <p className="mt-1 text-xs text-red-500">{errors.gender}</p>}
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
                    className={`mt-1 block w-full rounded-md border-[var(--border-color)] bg-[var(--input-background)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] transition-colors duration-200 ${errors.nationalityId ? 'border-red-500' : ''}`}
                  >
                    <option value="">Select Nationality</option>
                    {nationalities.map((nationality) => (
                      <option key={nationality.nationality_id} value={nationality.nationality_id}>
                        {nationality.nationality_name}
                      </option>
                    ))}
                  </select>
                  {errors.nationalityId && <p className="mt-1 text-xs text-red-500">{errors.nationalityId}</p>}
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
                    required
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`mt-1 block w-full rounded-md border-[var(--border-color)] bg-[var(--input-background)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] transition-colors duration-200 ${errors.email ? 'border-red-500' : ''}`}
                  />
                  {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email}</p>}
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
                    className={`mt-1 block w-full rounded-md border-[var(--border-color)] bg-[var(--input-background)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] transition-colors duration-200 ${errors.username ? 'border-red-500' : ''}`}
                  />
                  {errors.username && <p className="mt-1 text-xs text-red-500">{errors.username}</p>}
                </div>

                <div>
                  <label htmlFor="phone" className="block text-sm font-medium text-[var(--text-dark)]">
                    Phone Number *
                  </label>
                  <div className="flex items-center">
                    <span className="mr-2 select-none text-base font-medium">+63</span>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      required
                      value={formatPHNumberForDisplay(formData.phone)}
                      onChange={handleInputChange}
                      className={`form-input flex-1 ${errors.phone ? 'border-red-500' : ''}`}
                      maxLength={13}
                      placeholder="912 345 6789"
                    />
                  </div>
                  {errors.phone && <p className="mt-1 text-xs text-red-500">{errors.phone}</p>}
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
                      className={`block w-full rounded-md border-[var(--border-color)] bg-[var(--input-background)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] transition-colors duration-200 ${errors.password ? 'border-red-500' : ''}`}
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
                  {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password}</p>}
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
                      className={`block w-full rounded-md border-[var(--border-color)] bg-[var(--input-background)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] transition-colors duration-200 ${errors.confirmPassword ? 'border-red-500' : ''}`}
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
                  {errors.confirmPassword && <p className="mt-1 text-xs text-red-500">{errors.confirmPassword}</p>}
                </div>
              </div>
            </div>

            {/* Company Details Section */}
            <div>
              <h3 className="text-lg font-medium text-[var(--foreground)] mb-4">Company Details</h3>
              
              <div className="space-y-4">
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
                    className={`mt-1 block w-full rounded-md border-[var(--border-color)] bg-[var(--input-background)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] transition-colors duration-200 ${errors.positionName ? 'border-red-500' : ''}`}
                    placeholder="e.g., HR Manager, Recruiter, Team Lead"
                  />
                  {errors.positionName && <p className="mt-1 text-xs text-red-500">{errors.positionName}</p>}
                </div>
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
