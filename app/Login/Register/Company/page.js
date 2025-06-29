'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';

export default function CompanyRegistrationPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [darkMode, setDarkMode] = useState(false);
  const [nationalities, setNationalities] = useState([]);

  // Nationality to country code mapping (add more as needed)
  const nationalityPhonePrefixes = {
    'Philippines': '+63',
    'United States': '+1',
    'India': '+91',
    'Singapore': '+65',
    'Malaysia': '+60',
    'Indonesia': '+62',
    'Vietnam': '+84',
    'Thailand': '+66',
    'China': '+86',
    'Japan': '+81'
    // Add more as needed
  };

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
    const loadNationalities = async () => {
      try {
        const response = await fetch('/api/data/nationalities');
        if (response.ok) {
          const data = await response.json();
          if (data.success) {
            setNationalities(data.data);
          }
        }
      } catch (error) {
        // ignore
      }
    };
    loadNationalities();
  }, []);

  const [formData, setFormData] = useState({
    // Company Details
    companyName: '',
    companyEmail: '',
    companyPhone: '',
    companyWebsite: '',
    companyDescription: '',
    company_nationality_id: '',
    // Company Address
    premiseName: '',
    streetName: '',
    barangayName: '',
    cityName: ''
  });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name === 'company_nationality_id') {
      // Find selected nationality name
      const selectedNationality = nationalities.find(n => n.nationality_id === value);
      const prefix = selectedNationality ? nationalityPhonePrefixes[selectedNationality.nationality_name] : '';
      setFormData(prev => {
        let newPhone = prev.companyPhone;
        if (prefix) {
          Object.values(nationalityPhonePrefixes).forEach(p => {
            if (newPhone.startsWith(p)) {
              newPhone = newPhone.replace(p, '');
            }
          });
          newPhone = prefix + (newPhone.startsWith('0') ? newPhone.slice(1) : newPhone);
        }
        return { ...prev, [name]: value, companyPhone: prefix ? newPhone : prev.companyPhone };
      });
    } else if (name === 'companyPhone') {
      setFormData(prev => {
        let newPhone = value;
        const selectedNationality = nationalities.find(n => n.nationality_id === prev.company_nationality_id);
        const prefix = selectedNationality ? nationalityPhonePrefixes[selectedNationality.nationality_name] : '';
        if (prefix && !newPhone.startsWith(prefix)) {
          Object.values(nationalityPhonePrefixes).forEach(p => {
            if (newPhone.startsWith(p)) {
              newPhone = newPhone.replace(p, '');
            }
          });
          newPhone = prefix + (newPhone.startsWith('0') ? newPhone.slice(1) : newPhone);
        }
        return { ...prev, [name]: newPhone };
      });
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    const requiredFields = ['companyName', 'companyEmail', 'companyPhone', 'streetName', 'barangayName', 'cityName', 'company_nationality_id'];
    requiredFields.forEach(field => {
      if (!formData[field]) newErrors[field] = 'This field is required';
    });

    if (formData.companyEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.companyEmail)) {
      newErrors.companyEmail = 'Please enter a valid email address';
    }

    if (formData.companyWebsite) {
      try {
        new URL(formData.companyWebsite);
      } catch (_) {
        newErrors.companyWebsite = 'Please enter a valid website URL';
      }
    }

    if (formData.companyPhone && !/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/.test(formData.companyPhone)) {
      newErrors.companyPhone = 'Invalid phone number format. Use numbers, +, and -.';
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
      const response = await fetch('/api/auth/register/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (response.ok) {
        router.push(`/Login/Verification/Registration?companyId=${data.companyId}&type=company`);
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
      data-theme="logo"
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
          <h1 className="text-3xl font-bold text-[var(--foreground)]">Company Registration</h1>
          <p className="mt-2 text-[var(--text-light)]">Register your organization to start hiring</p>
        </div>

        {/* Registration Form */}
        <div className="bg-[var(--card-background)] rounded-xl shadow-lg p-8 border border-[var(--border-color)]">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Error Message */}
            {errors.form && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-200 rounded-md p-4">
                <p>{errors.form}</p>
              </div>
            )}

            {/* Company Details Section */}
            <div className="border-b border-[var(--border-color)] pb-6">
              <h3 className="text-lg font-medium text-[var(--foreground)] mb-4">Company Information</h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="companyName" className="block text-sm font-medium text-[var(--text-dark)]">
                    Company Name *
                  </label>
                  <input
                    type="text"
                    id="companyName"
                    name="companyName"
                    required
                    value={formData.companyName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-[var(--border-color)] bg-[var(--input-background)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] transition-colors duration-200 placeholder-[var(--text-light)]"
                    placeholder="Enter your company name"
                  />
                  {errors.companyName && (
                    <p className="text-red-500 text-sm mt-1">{errors.companyName}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="companyEmail" className="block text-sm font-medium text-[var(--text-dark)]">
                      Company Email *
                    </label>
                    <input
                      type="email"
                      id="companyEmail"
                      name="companyEmail"
                      required
                      value={formData.companyEmail}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-[var(--border-color)] bg-[var(--input-background)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] transition-colors duration-200 placeholder-[var(--text-light)]"
                      placeholder="company@example.com"
                    />
                    {errors.companyEmail && (
                      <p className="text-red-500 text-sm mt-1">{errors.companyEmail}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="companyPhone" className="block text-sm font-medium text-[var(--text-dark)]">
                      Company Phone *
                    </label>
                    <input
                      type="tel"
                      id="companyPhone"
                      name="companyPhone"
                      required
                      value={formData.companyPhone}
                      onChange={handleInputChange}
                      className="mt-1 block w-full rounded-md border-[var(--border-color)] bg-[var(--input-background)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] transition-colors duration-200 placeholder-[var(--text-light)]"
                      placeholder="+63 2 XXX XXXX"
                    />
                    {errors.companyPhone && (
                      <p className="text-red-500 text-sm mt-1">{errors.companyPhone}</p>
                    )}
                  </div>
                </div>
                <div>
                  <label htmlFor="company_nationality_id" className="block text-sm font-medium text-[var(--text-dark)]">
                    Company Nationality *
                  </label>
                  <select
                    id="company_nationality_id"
                    name="company_nationality_id"
                    required
                    value={formData.company_nationality_id}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-[var(--border-color)] bg-[var(--input-background)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] transition-colors duration-200"
                  >
                    <option value="">Select Nationality</option>
                    {nationalities.map((nat) => (
                      <option key={nat.nationality_id} value={nat.nationality_id}>
                        {nat.nationality_name}
                      </option>
                    ))}
                  </select>
                  {errors.company_nationality_id && (
                    <p className="text-red-500 text-sm mt-1">{errors.company_nationality_id}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="companyWebsite" className="block text-sm font-medium text-[var(--text-dark)]">
                    Company Website (Optional)
                  </label>
                  <input
                    type="url"
                    id="companyWebsite"
                    name="companyWebsite"
                    value={formData.companyWebsite}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-[var(--border-color)] bg-[var(--input-background)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] transition-colors duration-200 placeholder-[var(--text-light)]"
                    placeholder="https://www.yourcompany.com"
                  />
                  {errors.companyWebsite && (
                    <p className="text-red-500 text-sm mt-1">{errors.companyWebsite}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="companyDescription" className="block text-sm font-medium text-[var(--text-dark)]">
                    Company Description (Optional)
                  </label>
                  <textarea
                    id="companyDescription"
                    name="companyDescription"
                    rows={4}
                    value={formData.companyDescription}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-[var(--border-color)] bg-[var(--input-background)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] transition-colors duration-200 placeholder-[var(--text-light)]"
                    placeholder="Tell us about your company..."
                  />
                </div>
              </div>
            </div>

            {/* Company Address Section */}
            <div className="border-b border-[var(--border-color)] pb-6">
              <h3 className="text-lg font-medium text-[var(--foreground)] mb-4">Company Address</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="premiseName" className="block text-sm font-medium text-[var(--text-dark)]">
                    Building/Premise Name (Optional)
                  </label>
                  <input
                    type="text"
                    id="premiseName"
                    name="premiseName"
                    value={formData.premiseName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-[var(--border-color)] bg-[var(--input-background)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] transition-colors duration-200 placeholder-[var(--text-light)]"
                    placeholder="e.g., ABC Building"
                  />
                </div>

                <div>
                  <label htmlFor="streetName" className="block text-sm font-medium text-[var(--text-dark)]">
                    Street Name *
                  </label>
                  <input
                    type="text"
                    id="streetName"
                    name="streetName"
                    required
                    value={formData.streetName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-[var(--border-color)] bg-[var(--input-background)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] transition-colors duration-200 placeholder-[var(--text-light)]"
                    placeholder="e.g., 123 Main Street"
                  />
                  {errors.streetName && (
                    <p className="text-red-500 text-sm mt-1">{errors.streetName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="barangayName" className="block text-sm font-medium text-[var(--text-dark)]">
                    Barangay *
                  </label>
                  <input
                    type="text"
                    id="barangayName"
                    name="barangayName"
                    required
                    value={formData.barangayName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-[var(--border-color)] bg-[var(--input-background)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] transition-colors duration-200 placeholder-[var(--text-light)]"
                    placeholder="Enter barangay name"
                  />
                  {errors.barangayName && (
                    <p className="text-red-500 text-sm mt-1">{errors.barangayName}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="cityName" className="block text-sm font-medium text-[var(--text-dark)]">
                    City *
                  </label>
                  <input
                    type="text"
                    id="cityName"
                    name="cityName"
                    required
                    value={formData.cityName}
                    onChange={handleInputChange}
                    className="mt-1 block w-full rounded-md border-[var(--border-color)] bg-[var(--input-background)] text-[var(--foreground)] shadow-sm focus:border-[var(--primary-color)] focus:ring-[var(--primary-color)] transition-colors duration-200 placeholder-[var(--text-light)]"
                    placeholder="Enter city name"
                  />
                  {errors.cityName && (
                    <p className="text-red-500 text-sm mt-1">{errors.cityName}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Submit Button */}
            <div className="flex items-center justify-end space-x-4 mt-6">
              <button
                type="submit"
                disabled={isLoading}
                className="flex justify-center items-center px-6 py-2 border border-transparent rounded-md shadow-sm text-base font-medium text-[var(--card-background)] bg-[var(--primary-color)] hover:bg-[var(--primary-color-hover)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--primary-color)] transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <svg className="animate-spin h-5 w-5 text-[var(--card-background)]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
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
