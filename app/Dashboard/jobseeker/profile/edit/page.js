'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EditProfile() {
  const [profile, setProfile] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    premise: '',
    street: '',
    barangay: '',
    city: '',
    nationality: '',
    gender: '',
    educationLevel: '',
    experienceLevel: '',
    resume: null
  });
  const [jobFields, setJobFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [expandedFields, setExpandedFields] = useState([]);
  const [jobPreferencesData, setJobPreferencesData] = useState([]);
  const [genders, setGenders] = useState([]);
  const [experienceLevels, setExperienceLevels] = useState([]);
  const [educationLevels, setEducationLevels] = useState([]);
  const [loading, setLoading] = useState(true);
  const [generalError, setGeneralError] = useState(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [resumePreview, setResumePreview] = useState(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [resumeAction, setResumeAction] = useState(null);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const router = useRouter();
  const [fieldErrors, setFieldErrors] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    premise: '',
    street: '',
    barangay: '',
    city: '',
    nationality: '',
    gender: '',
    educationLevel: '',
    experienceLevel: '',
    jobCategories: ''
  });

  const [nationalities, setNationalities] = useState([]);

  useEffect(() => {
    const accountId = localStorage.getItem('accountId');
    const accountType = localStorage.getItem('accountType');
    
    if (!accountId || accountType !== '2') {
      router.push('/Login');
      return;
    }
    
    fetchProfileData(accountId);
    fetchGenders();
    fetchExperienceLevels();
    fetchEducationLevels();
    fetchNationalities();
  }, [router]);

  // Update selected fields when categories change
  useEffect(() => {
    const fieldsFromCategories = jobFields.filter(field => 
      field.categories && field.categories.some(cat => 
        selectedCategories.includes(cat.id)
      )
    ).map(field => field.id);
    
    setSelectedFields([...new Set(fieldsFromCategories)]);
  }, [selectedCategories, jobFields]);

  // Clear errors when component mounts or profile data is reloaded
  useEffect(() => {
    setGeneralError(null);
    setPasswordError('');
    setFieldErrors({
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      premise: '',
      street: '',
      barangay: '',
      city: '',
      nationality: '',
      gender: '',
      educationLevel: '',
      experienceLevel: '',
      jobCategories: ''
    });
  }, []);

  const fetchProfileData = async (accountId) => {
    try {
      setGeneralError(null);
      
      const response = await fetch(`/api/jobseeker/profile?accountId=${accountId}`);
      if (!response.ok) {
        throw new Error(`Server error (${response.status})`);
      }
      
      const data = await response.json();
      if (data.success) {
        // Parse address if it's a string, otherwise set empty values
        let premise = '', street = '', barangay = '', city = '';
        if (data.data.person.address) {
          const addressParts = data.data.person.address.split(',').map(part => part.trim());
          if (addressParts.length === 4) {
            [premise, street, barangay, city] = addressParts;
          } else if (addressParts.length === 3) {
            [street, barangay, city] = addressParts;
            premise = '';
          } else if (addressParts.length === 2) {
            [barangay, city] = addressParts;
            premise = '';
            street = '';
          } else {
            city = addressParts[addressParts.length - 1];
          }
        }
        
        setProfile({
          firstName: data.data.person.first_name,
          lastName: data.data.person.last_name,
          email: data.data.person.email,
          phone: data.data.person.phone,
          premise: premise,
          street: street,
          barangay: barangay,
          city: city,
          nationality: data.data.person.nationality,
          gender: data.data.person.gender || '',
          educationLevel: data.data.person.education_level,
          experienceLevel: data.data.person.experience_level || '',
          resume: data.data.account.resume,
          profilePhoto: data.data.account.profile_photo || ''
        });
        
        // Store preferences data temporarily to match with job fields
        setJobPreferencesData(data.data.job_preferences || []);
        // Fetch job fields with the preferences data
        fetchJobFields(data.data.job_preferences || []);
      } else {
        throw new Error(data.error || 'Failed to fetch profile data');
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
      setGeneralError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchJobFields = async (preferences = []) => {
    try {
      const response = await fetch('/api/data/job-fields');
      if (!response.ok) {
        throw new Error(`Failed to fetch job fields (${response.status})`);
      }
      
      const data = await response.json();
      if (data.success) {
        // Transform the API data to match the expected format
        const transformedFields = data.data.map(field => ({
          id: field.category_field_id,
          name: field.category_field_name,
          categories: field.job_categories?.map(cat => ({
            id: cat.job_category_id,
            name: cat.job_category_name
          })) || []
        }));
        
        setJobFields(transformedFields);
        
        // Now match the job preferences with the fetched fields and categories using IDs
        if (preferences.length > 0) {
          const matchedFieldIds = [];
          const matchedCategoryIds = [];
          
          preferences.forEach(pref => {
            if (pref.category_id && pref.category_id !== 0) {
              // Find matching field for this category
              const matchedField = transformedFields.find(field => 
                field.id === pref.field_id
              );
              if (matchedField) {
                if (!matchedFieldIds.includes(matchedField.id)) {
                  matchedFieldIds.push(matchedField.id);
                }
                if (!matchedCategoryIds.includes(pref.category_id)) {
                  matchedCategoryIds.push(pref.category_id);
                }
              }
            }
          });
          
          setSelectedFields(matchedFieldIds);
          setSelectedCategories(matchedCategoryIds);
          setExpandedFields(matchedFieldIds); // Expand fields with selected categories
        }
      } else {
        throw new Error('Failed to fetch job fields data');
      }
    } catch (error) {
      console.error('Error fetching job fields:', error);
      setGeneralError(error.message);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setProfile(prev => ({ ...prev, [name]: value }));
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

  const handleFieldToggle = (fieldId) => {
    setExpandedFields(prev => {
      if (prev.includes(fieldId)) {
        return prev.filter(id => id !== fieldId);
      } else {
        return [...prev, fieldId];
      }
    });
  };

  const fetchGenders = async () => {
    try {
      const response = await fetch('/api/data/genders');
      if (!response.ok) {
        throw new Error(`Failed to fetch genders (${response.status})`);
      }
      
      const data = await response.json();
      if (data.success) {
        setGenders(data.data);
      } else {
        throw new Error('Failed to fetch genders data');
      }
    } catch (error) {
      console.error('Error fetching genders:', error);
      setGeneralError(error.message);
    }
  };

  const fetchExperienceLevels = async () => {
    try {
      const response = await fetch('/api/data/experience-levels');
      if (!response.ok) {
        throw new Error(`Failed to fetch experience levels (${response.status})`);
      }
      
      const data = await response.json();
      if (data.success) {
        setExperienceLevels(data.data);
      } else {
        throw new Error('Failed to fetch experience levels data');
      }
    } catch (error) {
      console.error('Error fetching experience levels:', error);
      setGeneralError(error.message);
    }
  };

  const fetchEducationLevels = async () => {
    try {
      const response = await fetch('/api/data/education-levels');
      if (!response.ok) {
        throw new Error(`Failed to fetch education levels (${response.status})`);
      }
      
      const data = await response.json();
      if (data.success) {
        setEducationLevels(data.data);
      } else {
        throw new Error('Failed to fetch education levels data');
      }
    } catch (error) {
      console.error('Error fetching education levels:', error);
      setGeneralError(error.message);
    }
  };

  const fetchNationalities = async () => {
    try {
      const response = await fetch('/api/data/nationalities');
      if (!response.ok) {
        throw new Error(`Failed to fetch nationalities (${response.status})`);
      }
      
      const data = await response.json();
      if (data.success) {
        setNationalities(data.data);
      } else {
        throw new Error('Failed to fetch nationalities data');
      }
    } catch (error) {
      console.error('Error fetching nationalities:', error);
      setGeneralError(error.message);
    }
  };

  const handleResumeChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setResumeFile(file);
      setResumePreview(URL.createObjectURL(file));
    }
  };

  const handleRemoveResume = () => {
    setShowRemoveModal(true);
  };

  const handleConfirmRemoveResume = () => {
    setResumeAction('remove');
    setResumeFile(null);
    setResumePreview(null);
    setShowRemoveModal(false);
  };

  const handleCancelRemoveResume = () => {
    setShowRemoveModal(false);
  };

  const handleUpdateResume = () => {
    setResumeAction('update');
    const fileInput = document.getElementById('resume-upload');
    if (fileInput) fileInput.click();
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setGeneralError('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setGeneralError('File size too large. Maximum 5MB allowed.');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPhotoPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Store the file object for upload
    setPhotoFile(file);
  };

  const handleRemovePhoto = async () => {
    setPhotoFile(null);
    setPhotoPreview('');
    
    // If there was an existing photo, send request to delete it
    if (profile.profilePhoto && typeof profile.profilePhoto === 'string') {
      try {
        const accountId = localStorage.getItem('accountId');
        const response = await fetch(`/api/jobseeker/profile/photo?accountId=${accountId}`, {
          method: 'DELETE'
        });
        
        if (response.ok) {
          setProfile(prev => ({
            ...prev,
            profilePhoto: ''
          }));
        } else {
          console.error('Failed to delete profile photo');
        }
      } catch (error) {
        console.error('Error deleting profile photo:', error);
      }
    }
  };

  const handleSaveProfile = async () => {
    try {
      // Clear previous errors
      setGeneralError(null);
      setPasswordError('');
      setFieldErrors({
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        premise: '',
        street: '',
        barangay: '',
        city: '',
        nationality: '',
        gender: '',
        educationLevel: '',
        experienceLevel: '',
        jobCategories: ''
      });
      
      const accountId = localStorage.getItem('accountId');
      
      if (!accountId) {
        setGeneralError('Account ID not found. Please log in again.');
        return;
      }
      
      if (selectedCategories.length === 0) {
        setFieldErrors(prev => ({ ...prev, jobCategories: 'Please select at least one job category.' }));
        // Scroll to job preferences section
        document.querySelector('.card:nth-last-child(2)').scrollIntoView({ behavior: 'smooth' });
        return;
      }
      
      if (!password) {
        setPasswordError('Please enter your password to save changes.');
        // Scroll to password field
        document.querySelector('#password').scrollIntoView({ behavior: 'smooth' });
        return;
      }
      
      // Handle photo upload if a new file is selected
      if (photoFile) {
        setPhotoUploading(true);
        
        const photoFormData = new FormData();
        photoFormData.append('photo', photoFile);
        photoFormData.append('accountId', accountId);
        
        const photoResponse = await fetch('/api/jobseeker/profile/photo', {
          method: 'POST',
          body: photoFormData
        });
        
        if (!photoResponse.ok) {
          const errorData = await photoResponse.json();
          setGeneralError(errorData.error || 'Failed to upload profile photo');
          setPhotoUploading(false);
          return;
        }
        
        const photoData = await photoResponse.json();
        if (!photoData.success) {
          setGeneralError(photoData.error || 'Failed to upload profile photo');
          setPhotoUploading(false);
          return;
        }
        
        // Update profile with new photo URL
        setProfile(prev => ({
          ...prev,
          profilePhoto: photoData.data.profile_photo_url
        }));
        
        setPhotoUploading(false);
      }

      // Handle resume removal if requested
      if (resumeAction === 'remove') {
        await fetch(`/api/jobseeker/profile/resume?accountId=${accountId}`, {
          method: 'DELETE'
        });
        setProfile(prev => ({ ...prev, resume: null }));
      }
      // Handle resume upload or update
      if (resumeFile) {
        if (resumeAction === 'update' && profile.resume) {
          await fetch(`/api/jobseeker/profile/resume?accountId=${accountId}`, {
            method: 'DELETE'
          });
        }
        setResumeUploading(true);
        
        const formData = new FormData();
        formData.append('resume', resumeFile);
        formData.append('accountId', accountId);
        
        const resumeResponse = await fetch('/api/jobseeker/profile/resume', {
          method: 'POST',
          body: formData
        });
        
        if (!resumeResponse.ok) {
          const errorData = await resumeResponse.json();
          setGeneralError(errorData.error || 'Failed to upload resume');
          setResumeUploading(false);
          return;
        }
        
        const resumeData = await resumeResponse.json();
        if (!resumeData.success) {
          setGeneralError(resumeData.error || 'Failed to upload resume');
          setResumeUploading(false);
          return;
        }
        
        // Update profile with new resume data
        setProfile(prev => ({
          ...prev,
          resume: {
            name: resumeData.data.file_name,
            size: (resumeData.data.file_size / 1024 / 1024).toFixed(1) + ' MB',
            url: resumeData.data.resume_url
          }
        }));
        
        setResumeUploading(false);
      }
      
      // Save profile data
      const profileResponse = await fetch('/api/jobseeker/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId: accountId,
          password: password,
          firstName: profile.firstName,
          lastName: profile.lastName,
          email: profile.email,
          phone: profile.phone,
          premise: profile.premise,
          street: profile.street,
          barangay: profile.barangay,
          city: profile.city,
          nationality: profile.nationality,
          gender: profile.gender,
          educationLevel: profile.educationLevel,
          experienceLevel: profile.experienceLevel
        })
      });
      
      if (!profileResponse.ok) {
        const errorData = await profileResponse.json();
        const errorMessage = errorData.error || 'Failed to save profile data';
        
        // Check if the error is related to password
        if (errorMessage.toLowerCase().includes('password')) {
          setPasswordError(errorMessage);
          // Scroll to password field
          document.querySelector('#password').scrollIntoView({ behavior: 'smooth' });
        } else if (errorMessage.toLowerCase().includes('email')) {
          setFieldErrors(prev => ({ ...prev, email: errorMessage }));
          // Scroll to email field
          document.querySelector('#email').scrollIntoView({ behavior: 'smooth' });
        } else {
          setGeneralError(errorMessage);
        }
        return;
      }
      
      // Save job preferences
      const preferencesResponse = await fetch('/api/jobseeker/preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          accountId: accountId,
          selectedJobCategories: selectedCategories,
          selectedJobFields: selectedFields
        })
      });
      
      if (!preferencesResponse.ok) {
        const errorData = await preferencesResponse.json();
        setGeneralError(errorData.message || 'Failed to save job preferences');
        return;
      }
      
      setSuccessMessage('Your profile has been updated successfully!');
      
      // Trigger profile update event
      window.dispatchEvent(new Event('profileUpdated'));
      
      setTimeout(() => {
        router.push('/Dashboard/jobseeker/profile');
      }, 2000);
      
    } catch (error) {
      console.error('Error saving profile:', error);
      setGeneralError(error.message);
      setResumeUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)]"></div>
      </div>
    );
  }

  if (generalError) {
    return (
      <div className="space-y-6">
        <div className="bg-[var(--error-color)] bg-opacity-10 border border-[var(--error-color)] border-opacity-20 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-[var(--error-color)]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-[var(--error-color)]">Error</h3>
              <div className="mt-2 text-sm text-[var(--error-color)]">
                <p>{generalError}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => {
                    setGeneralError(null);
                    setLoading(true);
                    const accountId = localStorage.getItem('accountId');
                    if (accountId) fetchProfileData(accountId);
                  }}
                  className="bg-[var(--error-color)] bg-opacity-10 px-4 py-2 rounded-md text-sm font-medium text-[var(--error-color)] hover:bg-opacity-20"
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
        <h1 className="text-3xl font-bold mb-2">Edit Your Profile</h1>
        <p className="text-[var(--light-color)] text-lg">Update your personal information and upload your resume.</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-[var(--success-color)] bg-opacity-10 border border-[var(--success-color)] border-opacity-20 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-[var(--success-color)]" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
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

      {/* Profile Picture */}
      <div className="card">
        <div className="panel-header">
          <h3 className="text-lg font-semibold text-white">Profile Picture</h3>
          <p className="text-sm text-white text-opacity-80 mt-1">Upload your profile photo</p>
        </div>
        <div className="p-6">
          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0 h-24 w-24 rounded-full overflow-hidden border-4 border-[var(--border-color)]">
              {photoPreview ? (
                <img
                  src={photoPreview}
                  alt="Preview"
                  className="h-full w-full object-cover"
                />
              ) : profile.profilePhoto ? (
                <img
                  src={profile.profilePhoto}
                  alt="Current Profile"
                  className="h-full w-full object-cover"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src = '/Assets/Logo.png';
                  }}
                />
              ) : (
                <div className="h-full w-full bg-gradient-to-br from-[var(--primary-color)] to-[var(--secondary-color)] flex items-center justify-center">
                  <svg className="h-12 w-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="flex-1">
              <div className="flex flex-col space-y-3">
                <input
                  type="file"
                  id="photo-upload"
                  accept="image/jpeg,image/jpg,image/png,image/webp,image/gif"
                  onChange={handlePhotoChange}
                  className="hidden"
                />
                <div className="flex justify-start space-x-3">
                  <label
                    htmlFor="photo-upload"
                    className="btn-primary cursor-pointer px-4 py-2 rounded-md text-sm font-medium min-w-[120px] text-center"
                  >
                    {photoUploading ? 'Uploading...' : profile.profilePhoto || photoPreview ? 'Change Photo' : 'Upload Photo'}
                  </label>
                  {(profile.profilePhoto || photoPreview) && (
                    <button
                      type="button"
                      onClick={handleRemovePhoto}
                      className="btn-secondary px-4 py-2 rounded-md text-sm font-medium min-w-[120px] text-center"
                    >
                      Remove Photo
                    </button>
                  )}
                </div>
                <p className="text-xs text-[var(--text-light)]">Accepted formats: JPG, PNG, WebP, GIF. Max size: 5MB</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="card">
        <div className="panel-header">
          <h3 className="text-lg font-semibold text-white">Personal Information</h3>
          <p className="text-sm text-white text-opacity-80 mt-1">Update your basic profile details</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-[var(--foreground)] mb-1">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={profile.firstName}
                onChange={handleInputChange}
                className={`form-input ${fieldErrors.firstName ? 'border-[var(--error-color)]' : ''}`}
              />
              {fieldErrors.firstName && (
                <div className="mt-1 text-xs text-[var(--error-color)] flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {fieldErrors.firstName}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-[var(--foreground)] mb-1">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={profile.lastName}
                onChange={handleInputChange}
                className={`form-input ${fieldErrors.lastName ? 'border-[var(--error-color)]' : ''}`}
              />
              {fieldErrors.lastName && (
                <div className="mt-1 text-xs text-[var(--error-color)] flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {fieldErrors.lastName}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-[var(--foreground)] mb-1">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={profile.email}
                onChange={handleInputChange}
                className={`form-input ${fieldErrors.email ? 'border-[var(--error-color)]' : ''}`}
              />
              {fieldErrors.email && (
                <div className="mt-1 text-xs text-[var(--error-color)] flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {fieldErrors.email}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-[var(--foreground)] mb-1">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={profile.phone}
                onChange={handleInputChange}
                className={`form-input ${fieldErrors.phone ? 'border-[var(--error-color)]' : ''}`}
              />
              {fieldErrors.phone && (
                <div className="mt-1 text-xs text-[var(--error-color)] flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {fieldErrors.phone}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="premise" className="block text-sm font-medium text-[var(--foreground)] mb-1">Premise/Building</label>
              <input
                type="text"
                id="premise"
                name="premise"
                value={profile.premise}
                onChange={handleInputChange}
                className={`form-input ${fieldErrors.premise ? 'border-[var(--error-color)]' : ''}`}
              />
              {fieldErrors.premise && (
                <div className="mt-1 text-xs text-[var(--error-color)] flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {fieldErrors.premise}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="street" className="block text-sm font-medium text-[var(--foreground)] mb-1">Street</label>
              <input
                type="text"
                id="street"
                name="street"
                value={profile.street}
                onChange={handleInputChange}
                className={`form-input ${fieldErrors.street ? 'border-[var(--error-color)]' : ''}`}
              />
              {fieldErrors.street && (
                <div className="mt-1 text-xs text-[var(--error-color)] flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {fieldErrors.street}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="barangay" className="block text-sm font-medium text-[var(--foreground)] mb-1">Barangay</label>
              <input
                type="text"
                id="barangay"
                name="barangay"
                value={profile.barangay}
                onChange={handleInputChange}
                className={`form-input ${fieldErrors.barangay ? 'border-[var(--error-color)]' : ''}`}
              />
              {fieldErrors.barangay && (
                <div className="mt-1 text-xs text-[var(--error-color)] flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {fieldErrors.barangay}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-[var(--foreground)] mb-1">City</label>
              <input
                type="text"
                id="city"
                name="city"
                value={profile.city}
                onChange={handleInputChange}
                className={`form-input ${fieldErrors.city ? 'border-[var(--error-color)]' : ''}`}
              />
              {fieldErrors.city && (
                <div className="mt-1 text-xs text-[var(--error-color)] flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {fieldErrors.city}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="nationality" className="block text-sm font-medium text-[var(--foreground)] mb-1">Nationality</label>
              <select
                id="nationality"
                name="nationality"
                value={profile.nationality}
                onChange={handleInputChange}
                className={`form-input ${fieldErrors.nationality ? 'border-[var(--error-color)]' : ''}`}
              >
                <option value="">Select Nationality</option>
                {nationalities.map(nationality => (
                  <option key={nationality.nationality_id} value={nationality.nationality_name}>
                    {nationality.nationality_name}
                  </option>
                ))}
              </select>
              {fieldErrors.nationality && (
                <div className="mt-1 text-xs text-[var(--error-color)] flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {fieldErrors.nationality}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-[var(--foreground)] mb-1">Gender</label>
              <select
                id="gender"
                name="gender"
                value={profile.gender}
                onChange={handleInputChange}
                className={`form-input ${fieldErrors.gender ? 'border-[var(--error-color)]' : ''}`}
              >
                <option value="">Select Gender</option>
                {genders.map(gender => (
                  <option key={gender.gender_id} value={gender.gender_name}>
                    {gender.gender_name}
                  </option>
                ))}
              </select>
              {fieldErrors.gender && (
                <div className="mt-1 text-xs text-[var(--error-color)] flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {fieldErrors.gender}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="educationLevel" className="block text-sm font-medium text-[var(--foreground)] mb-1">Education Level</label>
              <select
                id="educationLevel"
                name="educationLevel"
                value={profile.educationLevel}
                onChange={handleInputChange}
                className={`form-input ${fieldErrors.educationLevel ? 'border-[var(--error-color)]' : ''}`}
              >
                <option value="">Select Education Level</option>
                {educationLevels.map(level => (
                  <option key={level.job_seeker_education_level_id} value={level.education_level_name}>
                    {level.education_level_name}
                  </option>
                ))}
              </select>
              {fieldErrors.educationLevel && (
                <div className="mt-1 text-xs text-[var(--error-color)] flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {fieldErrors.educationLevel}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="experienceLevel" className="block text-sm font-medium text-[var(--foreground)] mb-1">Experience Level</label>
              <select
                id="experienceLevel"
                name="experienceLevel"
                value={profile.experienceLevel}
                onChange={handleInputChange}
                className={`form-input ${fieldErrors.experienceLevel ? 'border-[var(--error-color)]' : ''}`}
              >
                <option value="">Select Experience Level</option>
                {experienceLevels.map(level => (
                  <option key={level.job_seeker_experience_level_id} value={level.experience_level_name}>
                    {level.experience_level_name}
                  </option>
                ))}
              </select>
              {fieldErrors.experienceLevel && (
                <div className="mt-1 text-xs text-[var(--error-color)] flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {fieldErrors.experienceLevel}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Resume Upload */}
      <div className="card">
        <div className="panel-header">
          <h3 className="text-lg font-semibold text-white">Resume</h3>
          <p className="text-sm text-white text-opacity-80 mt-1">Upload your latest resume</p>
        </div>
        <div className="p-6">
          {profile.resume && !resumeFile && resumeAction !== 'remove' && (
            <div className="border border-[var(--border-color)] rounded-lg p-4 bg-[var(--background)] mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-[var(--primary-color)] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-[var(--foreground)]">{profile.resume.name}</p>
                    <p className="text-xs text-[var(--text-light)]">{profile.resume.size}</p>
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <button
                    onClick={handleRemoveResume}
                    className="btn-secondary text-[var(--error-color)] border-[var(--error-color)] hover:bg-[var(--error-color)] hover:bg-opacity-10 px-4 py-2 rounded-md text-sm font-medium min-w-[100px] text-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5-4v1H8a1 1 0 00-1 1v3h10V4a1 1 0 00-1-1h-2a1 1 0 00-1 1zm-5 4V5a1 1 0 011-1h2a1 1 0 011 1v4M5 7h14" />
                    </svg>
                    Remove
                  </button>
                  <button
                    onClick={handleUpdateResume}
                    className="btn-primary px-4 py-2 rounded-md text-sm font-medium min-w-[100px] text-center"
                  >
                    <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Update
                  </button>
                </div>
              </div>
            </div>
          )}
          
          {(resumeFile || !profile.resume || resumeAction === 'remove' || resumeAction === 'update') && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-[var(--border-color)] rounded-lg p-6 text-center bg-[var(--background)]">
                <input
                  type="file"
                  id="resume-upload"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResumeChange}
                  className="hidden"
                />
                <label htmlFor="resume-upload" className="cursor-pointer">
                  <svg className="mx-auto h-12 w-12 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="mt-2 block text-sm font-medium text-[var(--foreground)]">
                    {resumeFile ? resumeFile.name : 'Drag and drop your resume here or click to upload'}
                  </span>
                  <span className="mt-1 block text-xs text-[var(--text-light)]">
                    PDF, DOC, DOCX (up to 15MB)
                  </span>
                </label>
              </div>

              {/* Resume Preview */}
              {resumeFile && (
                <div className="border border-[var(--border-color)] rounded-lg p-4 bg-[var(--background)]">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-[var(--foreground)]">Resume Preview</h4>
                    <button
                      onClick={() => {
                        setResumeFile(null);
                        setResumePreview(null);
                        setResumeAction(null);
                        // Reset the file input
                        const fileInput = document.getElementById('resume-upload');
                        if (fileInput) fileInput.value = '';
                      }}
                      className="text-[var(--error-color)] hover:text-[var(--error-color)] text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {/* File Information */}
                    <div className="flex items-center space-x-3 p-3 bg-[var(--card-background)] rounded-md border border-[var(--border-color)]">
                      <div className="flex-shrink-0">
                        <svg className="w-8 h-8 text-[var(--primary-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--foreground)] truncate">{resumeFile.name}</p>
                        <p className="text-sm text-[var(--text-light)]">
                          {(resumeFile.size / 1024 / 1024).toFixed(2)} MB • {resumeFile.type.split('/')[1].toUpperCase()}
                        </p>
                      </div>
                    </div>

                    {/* PDF Preview */}
                    {resumeFile.type === 'application/pdf' && resumePreview && (
                      <div className="border border-[var(--border-color)] rounded-md overflow-hidden">
                        <div className="bg-[var(--background)] px-3 py-2 text-sm font-medium text-[var(--foreground)]">
                          PDF Preview
                        </div>
                        <div className="relative" style={{ height: '200px' }}>
                          <iframe
                            src={resumePreview}
                            className="w-full h-full"
                            title="Resume Preview"
                            style={{ border: 'none' }}
                          />
                        </div>
                      </div>
                    )}

                    {/* Non-PDF File Preview */}
                    {resumeFile.type !== 'application/pdf' && (
                      <div className="border border-[var(--border-color)] rounded-md p-6 text-center bg-[var(--card-background)]">
                        <svg className="mx-auto h-12 w-12 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="mt-2 text-sm text-[var(--foreground)]">
                          Preview not available for {resumeFile.type.split('/')[1].toUpperCase()} files
                        </p>
                        <p className="text-xs text-[var(--text-light)] mt-1">
                          File will be uploaded when you save your profile
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Remove Resume Confirmation Modal */}
      {showRemoveModal && (
        <div className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center">
          <div className="modal-content p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center mb-4">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-[var(--error-color)] bg-opacity-10 flex items-center justify-center mr-3">
                <svg className="h-5 w-5 text-[var(--error-color)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-[var(--foreground)]">Remove Resume</h3>
            </div>
            <p className="text-sm text-[var(--text-light)] mb-6">
              Are you sure you want to remove your resume? This action cannot be undone and your resume will be permanently deleted when you save your profile.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={handleCancelRemoveResume}
                className="btn btn-secondary px-4 py-2 text-sm font-medium min-w-[100px] text-center"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmRemoveResume}
                className="btn btn-primary bg-[var(--error-color)] hover:bg-[var(--error-color)] hover:bg-opacity-80 px-4 py-2 text-sm font-medium min-w-[100px] text-center"
              >
                Yes, Remove
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Job Preferences */}
      <div className="card">
        <div className="panel-header">
          <h3 className="text-lg font-semibold text-white">Job Preferences</h3>
          <p className="text-sm text-white text-opacity-80 mt-1">Select the job categories you're interested in</p>
        </div>
        <div className="p-6">
          {/* Selected Categories Summary */}
          {selectedCategories.length > 0 && (
            <div className="mb-6 p-4 bg-[var(--primary-color)] bg-opacity-15 rounded-lg border border-[var(--primary-color)] border-opacity-20">
              <p className="text-sm font-medium text-[var(--foreground)] mb-2">
                Selected Categories ({selectedCategories.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {jobFields.map(field => 
                  field.categories.filter(cat => selectedCategories.includes(cat.id)).map(cat => (
                    <span key={cat.id} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-[var(--primary-color)] bg-opacity-30 text-white">
                      {cat.name}
                      <button
                        onClick={() => handleCategoryToggle(cat.id)}
                        className="ml-2 text-white hover:text-[var(--light-color)]"
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
              <div key={field.id} className="border border-[var(--border-color)] rounded-lg">
                <button
                  onClick={() => handleFieldToggle(field.id)}
                  className={`w-full px-4 py-3 text-left flex items-center justify-between ${
                    selectedFields.includes(field.id)
                      ? 'bg-[var(--primary-color)] bg-opacity-15 border-[var(--primary-color)] border-opacity-20'
                      : 'bg-[var(--background)]'
                  } rounded-t-lg hover:bg-[var(--background)]`}
                >
                  <div className="flex items-center">
                    <span className={`text-lg font-semibold ${
                      selectedFields.includes(field.id) ? 'text-white' : 'text-[var(--foreground)]'
                    }`}>
                      {field.name}
                    </span>
                    {selectedFields.includes(field.id) && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-[var(--primary-color)] bg-opacity-30 text-white">
                        {field.categories.filter(cat => selectedCategories.includes(cat.id)).length} selected
                      </span>
                    )}
                  </div>
                  <svg
                    className={`w-5 h-5 transition-transform ${
                      expandedFields.includes(field.id) ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {expandedFields.includes(field.id) && (
                  <div className="p-4 border-t border-[var(--border-color)]">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {field.categories.map(category => (
                        <button
                          key={category.id}
                          onClick={() => handleCategoryToggle(category.id)}
                          className={`p-3 text-left rounded-lg border-2 transition-all ${
                            selectedCategories.includes(category.id)
                              ? 'border-[var(--primary-color)] bg-[var(--primary-color)] bg-opacity-15 text-white'
                              : 'border-[var(--border-color)] bg-[var(--card-background)] text-[var(--foreground)] hover:border-[var(--border-color)] hover:bg-[var(--background)]'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{category.name}</span>
                            {selectedCategories.includes(category.id) && (
                              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          {fieldErrors.jobCategories && (
            <div className="mt-4 p-3 bg-[var(--error-color)] bg-opacity-10 border border-[var(--error-color)] border-opacity-20 rounded-md">
              <div className="flex items-center">
                <svg className="w-4 h-4 text-[var(--error-color)] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-sm text-[var(--error-color)]">{fieldErrors.jobCategories}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Verify Identity */}
      <div className="card">
        <div className="panel-header">
          <h3 className="text-lg font-semibold text-white">Verify Identity</h3>
          <p className="text-sm text-white text-opacity-80 mt-1">Enter your password to save changes</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-[var(--foreground)] mb-1">Password</label>
              <input
                type="password"
                id="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`form-input ${passwordError ? 'border-[var(--error-color)]' : ''}`}
                required
              />
              {passwordError && (
                <div className="mt-1 text-xs text-[var(--error-color)] flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  {passwordError}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={() => router.push('/Dashboard/jobseeker/profile')}
          className="btn btn-secondary px-4 py-2 text-sm font-medium min-w-[120px] text-center"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveProfile}
          className="btn btn-primary px-4 py-2 text-sm font-medium min-w-[120px] text-center"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
