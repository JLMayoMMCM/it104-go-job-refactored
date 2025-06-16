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
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [resumePreview, setResumePreview] = useState(null);
  const [resumeUploading, setResumeUploading] = useState(false);
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);
  const router = useRouter();

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

  const fetchProfileData = async (accountId) => {
    try {
      setError(null);
      
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
      setError(error.message);
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
      setError(error.message);
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
      setError(error.message);
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
      setError(error.message);
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
      setError(error.message);
    }
  };

  const handleResumeChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setResumeFile(file);
      setResumePreview(URL.createObjectURL(file));
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only JPEG, PNG, WebP, and GIF are allowed.');
      return;
    }

    // Validate file size (5MB max)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      setError('File size too large. Maximum 5MB allowed.');
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
      setError(null);
      const accountId = localStorage.getItem('accountId');
      
      if (!accountId) {
        setError('Account ID not found. Please log in again.');
        return;
      }
      
      if (selectedCategories.length === 0) {
        setError('Please select at least one job category.');
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
          throw new Error(errorData.error || 'Failed to upload profile photo');
        }
        
        const photoData = await photoResponse.json();
        if (!photoData.success) {
          throw new Error(photoData.error || 'Failed to upload profile photo');
        }
        
        // Update profile with new photo URL
        setProfile(prev => ({
          ...prev,
          profilePhoto: photoData.data.profile_photo_url
        }));
        
        setPhotoUploading(false);
      }

      // Handle resume upload if a new file is selected
      if (resumeFile) {
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
          throw new Error(errorData.error || 'Failed to upload resume');
        }
        
        const resumeData = await resumeResponse.json();
        if (!resumeData.success) {
          throw new Error(resumeData.error || 'Failed to upload resume');
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
        throw new Error(errorData.message || 'Failed to save job preferences');
      }
      
      setSuccessMessage('Your profile has been updated successfully!');
      
      setTimeout(() => {
        router.push('/Dashboard/jobseeker/profile');
      }, 2000);
      
    } catch (error) {
      console.error('Error saving profile:', error);
      setError(error.message);
      setResumeUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
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
              <div className="mt-4">
                <button
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    const accountId = localStorage.getItem('accountId');
                    if (accountId) fetchProfileData(accountId);
                  }}
                  className="bg-red-100 px-4 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
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
      <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-lg shadow-lg p-8 text-white">
        <h1 className="text-3xl font-bold mb-2">Edit Your Profile</h1>
        <p className="text-purple-100 text-lg">Update your personal information and upload your resume.</p>
      </div>

      {/* Success Message */}
      {successMessage && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
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

      {/* Profile Picture */}
      <div className="bg-white shadow-lg rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Profile Picture</h3>
          <p className="text-sm text-gray-600 mt-1">Upload your profile photo</p>
        </div>
        <div className="p-6">
          <div className="flex items-center space-x-6">
            <div className="flex-shrink-0 h-24 w-24 rounded-full overflow-hidden border-4 border-gray-200">
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
                <div className="h-full w-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
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
                <label
                  htmlFor="photo-upload"
                  className="cursor-pointer inline-flex items-center justify-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                >
                  {photoUploading ? 'Uploading...' : profile.profilePhoto || photoPreview ? 'Change Photo' : 'Upload Photo'}
                </label>
                {(profile.profilePhoto || photoPreview) && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="inline-flex items-center justify-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
                  >
                    Remove Photo
                  </button>
                )}
                <p className="text-xs text-gray-500">Accepted formats: JPG, PNG, WebP, GIF. Max size: 5MB</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Personal Information */}
      <div className="bg-white shadow-lg rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
          <p className="text-sm text-gray-600 mt-1">Update your basic profile details</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="firstName" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                id="firstName"
                name="firstName"
                value={profile.firstName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="lastName" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                id="lastName"
                name="lastName"
                value={profile.lastName}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                id="email"
                name="email"
                value={profile.email}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
              <input
                type="tel"
                id="phone"
                name="phone"
                value={profile.phone}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="premise" className="block text-sm font-medium text-gray-700 mb-1">Premise/Building</label>
              <input
                type="text"
                id="premise"
                name="premise"
                value={profile.premise}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="street" className="block text-sm font-medium text-gray-700 mb-1">Street</label>
              <input
                type="text"
                id="street"
                name="street"
                value={profile.street}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="barangay" className="block text-sm font-medium text-gray-700 mb-1">Barangay</label>
              <input
                type="text"
                id="barangay"
                name="barangay"
                value={profile.barangay}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-1">City</label>
              <input
                type="text"
                id="city"
                name="city"
                value={profile.city}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="nationality" className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
              <input
                type="text"
                id="nationality"
                name="nationality"
                value={profile.nationality}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              />
            </div>
            <div>
              <label htmlFor="gender" className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                id="gender"
                name="gender"
                value={profile.gender}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select Gender</option>
                {genders.map(gender => (
                  <option key={gender.gender_id} value={gender.gender_name}>
                    {gender.gender_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="educationLevel" className="block text-sm font-medium text-gray-700 mb-1">Education Level</label>
              <select
                id="educationLevel"
                name="educationLevel"
                value={profile.educationLevel}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select Education Level</option>
                {educationLevels.map(level => (
                  <option key={level.job_seeker_education_level_id} value={level.education_level_name}>
                    {level.education_level_name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="experienceLevel" className="block text-sm font-medium text-gray-700 mb-1">Experience Level</label>
              <select
                id="experienceLevel"
                name="experienceLevel"
                value={profile.experienceLevel}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
              >
                <option value="">Select Experience Level</option>
                {experienceLevels.map(level => (
                  <option key={level.job_seeker_experience_level_id} value={level.experience_level_name}>
                    {level.experience_level_name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Resume Upload */}
      <div className="bg-white shadow-lg rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Resume</h3>
          <p className="text-sm text-gray-600 mt-1">Upload your latest resume</p>
        </div>
        <div className="p-6">
          {profile.resume && !resumeFile && (
            <div className="border border-gray-200 rounded-lg p-4 bg-gray-50 mb-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-blue-600 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-gray-900">{profile.resume.name}</p>
                    <p className="text-xs text-gray-500">{profile.resume.size}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setProfile(prev => ({ ...prev, resume: null }));
                  }}
                  className="text-red-600 hover:text-red-800"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
          )}
          
          {(resumeFile || !profile.resume) && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                <input
                  type="file"
                  id="resume-upload"
                  accept=".pdf,.doc,.docx"
                  onChange={handleResumeChange}
                  className="hidden"
                />
                <label htmlFor="resume-upload" className="cursor-pointer">
                  <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span className="mt-2 block text-sm font-medium text-gray-900">
                    {resumeFile ? resumeFile.name : 'Drag and drop your resume here or click to upload'}
                  </span>
                  <span className="mt-1 block text-xs text-gray-500">
                    PDF, DOC, DOCX (up to 15MB)
                  </span>
                </label>
              </div>

              {/* Resume Preview */}
              {resumeFile && (
                <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="text-sm font-medium text-gray-900">Resume Preview</h4>
                    <button
                      onClick={() => {
                        setResumeFile(null);
                        setResumePreview(null);
                        // Reset the file input
                        const fileInput = document.getElementById('resume-upload');
                        if (fileInput) fileInput.value = '';
                      }}
                      className="text-red-600 hover:text-red-800 text-sm font-medium"
                    >
                      Remove
                    </button>
                  </div>
                  
                  <div className="space-y-3">
                    {/* File Information */}
                    <div className="flex items-center space-x-3 p-3 bg-white rounded-md border">
                      <div className="flex-shrink-0">
                        <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{resumeFile.name}</p>
                        <p className="text-sm text-gray-500">
                          {(resumeFile.size / 1024 / 1024).toFixed(2)} MB • {resumeFile.type.split('/')[1].toUpperCase()}
                        </p>
                      </div>
                    </div>

                    {/* PDF Preview */}
                    {resumeFile.type === 'application/pdf' && resumePreview && (
                      <div className="border border-gray-300 rounded-md overflow-hidden">
                        <div className="bg-gray-100 px-3 py-2 text-sm font-medium text-gray-700">
                          PDF Preview
                        </div>
                        <div className="relative" style={{ height: '400px' }}>
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
                      <div className="border border-gray-300 rounded-md p-6 text-center bg-white">
                        <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="mt-2 text-sm text-gray-600">
                          Preview not available for {resumeFile.type.split('/')[1].toUpperCase()} files
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
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

      {/* Job Preferences */}
      <div className="bg-white shadow-lg rounded-xl overflow-hidden">
        <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Job Preferences</h3>
          <p className="text-sm text-gray-600 mt-1">Select the job categories you're interested in</p>
        </div>
        <div className="p-6">
          {/* Selected Categories Summary */}
          {selectedCategories.length > 0 && (
            <div className="mb-6 p-4 bg-blue-50 rounded-lg">
              <p className="text-sm font-medium text-blue-900 mb-2">
                Selected Categories ({selectedCategories.length}):
              </p>
              <div className="flex flex-wrap gap-2">
                {jobFields.map(field => 
                  field.categories.filter(cat => selectedCategories.includes(cat.id)).map(cat => (
                    <span key={cat.id} className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                      {cat.name}
                      <button
                        onClick={() => handleCategoryToggle(cat.id)}
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
              <div key={field.id} className="border border-gray-200 rounded-lg">
                <button
                  onClick={() => handleFieldToggle(field.id)}
                  className={`w-full px-4 py-3 text-left flex items-center justify-between ${
                    selectedFields.includes(field.id)
                      ? 'bg-blue-50 border-blue-200'
                      : 'bg-gray-50'
                  } rounded-t-lg hover:bg-gray-100`}
                >
                  <div className="flex items-center">
                    <span className={`text-lg font-semibold ${
                      selectedFields.includes(field.id) ? 'text-blue-900' : 'text-gray-900'
                    }`}>
                      {field.name}
                    </span>
                    {selectedFields.includes(field.id) && (
                      <span className="ml-2 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
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
                  <div className="p-4 border-t border-gray-200">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                      {field.categories.map(category => (
                        <button
                          key={category.id}
                          onClick={() => handleCategoryToggle(category.id)}
                          className={`p-3 text-left rounded-lg border-2 transition-all ${
                            selectedCategories.includes(category.id)
                              ? 'border-blue-500 bg-blue-50 text-blue-900'
                              : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium">{category.name}</span>
                            {selectedCategories.includes(category.id) && (
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
      </div>

      {/* Save Button */}
      <div className="flex justify-end space-x-3">
        <button
          onClick={() => router.push('/Dashboard/jobseeker/profile')}
          className="inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          Cancel
        </button>
        <button
          onClick={handleSaveProfile}
          className="inline-flex items-center px-6 py-3 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-purple-600 hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
