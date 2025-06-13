'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [profilePhoto, setProfilePhoto] = useState(null);
  const [resume, setResume] = useState(null);
  const [pendingResume, setPendingResume] = useState(null);
  const [showResumeConfirm, setShowResumeConfirm] = useState(false);
  const [profilePhotoPreview, setProfilePhotoPreview] = useState(null);
  const [resumePreviewUrl, setResumePreviewUrl] = useState(null);
  const [removeResume, setRemoveResume] = useState(false);  const [jobCategories, setJobCategories] = useState([]);
  const [selectedPreferences, setSelectedPreferences] = useState([]);
  const [hasPreferences, setHasPreferences] = useState(false);
  const [nationalities, setNationalities] = useState([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    middleName: '',
    phone: '',
    premiseName: '',
    streetName: '',
    barangayName: '',
    cityName: '',
    nationality: 'Filipino'
  });
  useEffect(() => {
    loadUserProfile();
    loadNationalities();
  }, []);

  const loadNationalities = async () => {
    try {
      const response = await fetch('/api/nationalities');
      if (response.ok) {
        const data = await response.json();
        setNationalities(data);
      }
    } catch (error) {
      console.error('Error loading nationalities:', error);
    }
  };

  const loadUserProfile = async () => {
    const token = localStorage.getItem('authToken');
    if (!token) {
      router.push('/Login');
      return;
    }

    try {
      const response = await fetch('/api/auth/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        
        // Populate form with existing data
        setFormData({
          firstName: userData.firstName || '',
          lastName: userData.lastName || '',
          middleName: userData.middleName || '',
          phone: userData.phone || '',
          premiseName: userData.premiseName || '',
          streetName: userData.streetName || '',
          barangayName: userData.barangayName || '',
          cityName: userData.cityName || '',
          nationality: userData.nationality || 'Filipino'
        });

        // Set profile photo preview if exists
        if (userData.profilePhoto) {
          setProfilePhotoPreview(userData.profilePhoto);
        }

        // Load resume preview if exists
        if (userData.hasResume) {
          loadResumePreview(token);
        }

        // Load job categories and preferences for job seekers
        if (userData.isJobSeeker) {
          await Promise.all([
            loadJobCategories(token),
            loadUserPreferences(token)
          ]);
        }
      } else {
        router.push('/Login');
      }
    } catch (error) {
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const loadJobCategories = async (token) => {
    try {
      const response = await fetch('/api/job-categories', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setJobCategories(data);
      }
    } catch (error) {
      console.error('Error loading job categories:', error);
    }
  };

  const loadUserPreferences = async (token) => {
    try {
      const response = await fetch('/api/job-preferences', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSelectedPreferences(data.map(pref => pref.job_category_id));
        setHasPreferences(data.length > 0);
      }
    } catch (error) {
      console.error('Error loading preferences:', error);
    }
  };

  const loadResumePreview = async (token) => {
    try {
      const response = await fetch('/api/profile/resume', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        setResumePreviewUrl(url);
      }
    } catch (error) {
      console.error('Error loading resume preview:', error);
    }
  };

  const handleInputChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handlePreferenceChange = (categoryId) => {
    setSelectedPreferences(prev => 
      prev.includes(categoryId) 
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handlePhotoChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        setError('Profile photo must be less than 5MB');
        return;
      }
      
      if (!file.type.startsWith('image/')) {
        setError('Please select a valid image file');
        return;
      }

      setProfilePhoto(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setProfilePhotoPreview(e.target.result);
      };
      reader.readAsDataURL(file);
      setError('');
    }
  };

  const handleResumeChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        setError('Resume must be less than 10MB');
        return;
      }
      
      if (file.type !== 'application/pdf') {
        setError('Please select a PDF file only for your resume');
        return;
      }

      setPendingResume(file);
      setShowResumeConfirm(true);
      setError('');
    }
  };

  const confirmResumeUpload = () => {
    setResume(pendingResume);
    setPendingResume(null);
    setShowResumeConfirm(false);
    setRemoveResume(false);
    setSuccess('Resume selected successfully! Remember to save your profile to upload.');
    
    // Create preview URL for new resume
    if (pendingResume) {
      // Clean up old URL
      if (resumePreviewUrl) {
        URL.revokeObjectURL(resumePreviewUrl);
      }
      const url = URL.createObjectURL(pendingResume);
      setResumePreviewUrl(url);
    }
  };

  const cancelResumeUpload = () => {
    setPendingResume(null);
    setShowResumeConfirm(false);
    const fileInput = document.querySelector('input[type="file"][accept=".pdf"]');
    if (fileInput) {
      fileInput.value = '';
    }
  };

  const previewPendingResume = () => {
    if (pendingResume) {
      const url = URL.createObjectURL(pendingResume);
      window.open(url, '_blank');
    }
  };

  const handleRemoveResume = () => {
    setRemoveResume(true);
    setResume(null);
    setResumePreviewUrl(null);
    setSuccess('Resume will be removed when you save your profile');
  };

  const handleRemovePhoto = () => {
    setProfilePhoto(null);
    setProfilePhotoPreview(null);
  };

  const savePreferences = async () => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/job-preferences', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ categoryIds: selectedPreferences })
      });

      if (response.ok) {
        setHasPreferences(selectedPreferences.length > 0);
        setSuccess('Job preferences updated successfully!');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError('Failed to update preferences');
      }
    } catch (error) {
      setError('Error updating preferences');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('authToken');
      const submitFormData = new FormData();
      
      // Add text fields
      Object.keys(formData).forEach(key => {
        submitFormData.append(key, formData[key]);
      });

      // Add remove resume flag
      if (removeResume) {
        submitFormData.append('removeResume', 'true');
      }

      // Add files
      if (profilePhoto) {
        submitFormData.append('profilePhoto', profilePhoto);
      }
      
      if (resume) {
        submitFormData.append('resume', resume);
      }

      const response = await fetch('/api/profile/update', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: submitFormData
      });

      if (response.ok) {
        const result = await response.json();
        
        // Save job preferences for job seekers
        if (user?.isJobSeeker && selectedPreferences.length > 0) {
          await savePreferences();
        }
        
        setSuccess(result.message);
        
        // Reset states after successful upload
        setResume(null);
        setRemoveResume(false);
        setProfilePhoto(null);
        
        // Trigger profile update event
        window.dispatchEvent(new Event('profileUpdated'));
        
        // Reload user data to get updated info
        await loadUserProfile();
        
        // Switch back to view mode after successful update
        setIsEditMode(false);
        
        // Show success message for a few seconds
        setTimeout(() => {
          setSuccess('');
        }, 3000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to update profile');
      }
    } catch (error) {
      setError('Network error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      if (resumePreviewUrl) {
        URL.revokeObjectURL(resumePreviewUrl);
      }
    };
  }, []);

  const toggleEditMode = () => {
    setIsEditMode(!isEditMode);
    setError('');
    setSuccess('');
    if (!isEditMode) {
      // Reset any pending changes when entering edit mode
      setResume(null);
      setRemoveResume(false);
      setProfilePhoto(null);
    }
  };

  const cancelEdit = () => {
    setIsEditMode(false);
    setError('');
    setSuccess('');
    setResume(null);
    setRemoveResume(false);
    setProfilePhoto(null);
    // Reset form data to original user data
    setFormData({
      firstName: user?.firstName || '',
      lastName: user?.lastName || '',
      middleName: user?.middleName || '',
      phone: user?.phone || '',
      premiseName: user?.premiseName || '',
      streetName: user?.streetName || '',
      barangayName: user?.barangayName || '',
      cityName: user?.cityName || '',
      nationality: user?.nationality || 'Filipino'
    });
    setProfilePhotoPreview(user?.profilePhoto || null);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen text-lg">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={user} />
      
      <main className="p-8 max-w-6xl mx-auto">
        {/* Header with Toggle Button */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex justify-between items-center">
            <h1 className="text-3xl font-bold text-gray-800">
              {isEditMode ? 'Edit Profile' : 'My Profile'}
            </h1>
            <div className="flex gap-3">
              {isEditMode ? (
                <>
                  <button
                    onClick={cancelEdit}
                    className="bg-gray-600 text-white px-6 py-2 rounded-lg hover:bg-gray-700 transition-colors"
                  >
                    Cancel
                  </button>
                </>
              ) : (
                <button
                  onClick={toggleEditMode}
                  className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Edit Profile
                </button>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-100 text-red-800 p-3 rounded-md mb-5 border border-red-200">
            {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-100 text-green-800 p-3 rounded-md mb-5 border border-green-200">
            {success}
          </div>
        )}

        {/* Job Preferences Prompt for Job Seekers without preferences */}
        {user?.isJobSeeker && !hasPreferences && !isEditMode && (
          <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200 mb-6">
            <div className="flex items-start">
              <div className="text-yellow-600 mr-3 text-2xl">⚠️</div>
              <div>
                <h4 className="font-semibold text-yellow-800 mb-2">Set Your Job Preferences</h4>
                <p className="text-yellow-700 text-sm mb-3">
                  To get personalized job recommendations, please set your job preferences by editing your profile.
                </p>
                <button
                  onClick={toggleEditMode}
                  className="bg-yellow-600 text-white px-4 py-2 rounded hover:bg-yellow-700 transition-colors text-sm"
                >
                  Set Preferences Now
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Profile Information Section */}
          <div className="bg-white rounded-lg shadow-md p-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">Profile Information</h2>
            
            {/* Resume Confirmation Modal */}
            {showResumeConfirm && (
              <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
                  <div className="p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Confirm PDF Resume Upload</h3>
                    
                    <div className="bg-gray-50 p-4 rounded-lg mb-4">
                      <div className="flex items-center">
                        <div className="text-4xl mr-3">📄</div>
                        <div>
                          <p className="font-medium text-gray-900">{pendingResume?.name}</p>
                          <p className="text-sm text-gray-600">
                            Size: {(pendingResume?.size / 1024 / 1024).toFixed(2)} MB
                          </p>
                          <p className="text-xs text-blue-600">PDF Format ✓</p>
                        </div>
                      </div>
                    </div>

                    <p className="text-gray-600 mb-6">
                      Are you sure you want to select this PDF as your resume?
                    </p>

                    <div className="flex gap-3">
                      <button
                        onClick={previewPendingResume}
                        className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 transition-colors"
                      >
                        Preview
                      </button>
                      <button
                        onClick={confirmResumeUpload}
                        className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 transition-colors"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={cancelResumeUpload}
                        className="flex-1 bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {isEditMode ? (
              /* Edit Mode Form */
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Profile Photo Section */}
                <div className="text-center mb-8">
                  <div className="mb-4">
                    {profilePhotoPreview ? (
                      <div className="relative inline-block">
                        <img 
                          src={profilePhotoPreview} 
                          alt="Profile" 
                          className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 mx-auto"
                        />
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="absolute top-0 right-0 bg-red-500 text-white rounded-full w-8 h-8 flex items-center justify-center hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center mx-auto text-gray-500">
                        <span className="text-4xl">👤</span>
                      </div>
                    )}
                  </div>
                  <label className="cursor-pointer bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Change Profile Photo
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                  </label>
                  <p className="text-sm text-gray-500 mt-2">JPG, PNG or GIF (max 5MB)</p>
                </div>

                {/* Personal Information Fields */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
                    <input
                      type="text"
                      name="firstName"
                      value={formData.firstName}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
                    <input
                      type="text"
                      name="lastName"
                      value={formData.lastName}
                      onChange={handleInputChange}
                      required
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Middle Name</label>
                    <input
                      type="text"
                      name="middleName"
                      value={formData.middleName}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                    <input
                      type="tel"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                    <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
                    <select
                      name="nationality"
                      value={formData.nationality}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      {nationalities.map((nationality) => (
                        <option key={nationality.nationality_id} value={nationality.nationality_name}>
                          {nationality.nationality_name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Address Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">House/Building</label>
                    <input
                      type="text"
                      name="premiseName"
                      value={formData.premiseName}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Street</label>
                    <input
                      type="text"
                      name="streetName"
                      value={formData.streetName}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Barangay</label>
                    <input
                      type="text"
                      name="barangayName"
                      value={formData.barangayName}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                    <input
                      type="text"
                      name="cityName"
                      value={formData.cityName}
                      onChange={handleInputChange}
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Job Preferences Section - Only for Job Seekers in Edit Mode */}
                {user?.isJobSeeker && (
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Job Preferences</h3>
                    <p className="text-sm text-gray-600 mb-4">Select job categories you're interested in (this helps us recommend relevant jobs)</p>
                    
                    {/* Group categories by field */}
                    {Object.entries(
                      jobCategories.reduce((acc, category) => {
                        const fieldName = category.category_field_name;
                        if (!acc[fieldName]) acc[fieldName] = [];
                        acc[fieldName].push(category);
                        return acc;
                      }, {})
                    ).map(([fieldName, categories]) => (
                      <div key={fieldName} className="mb-4">
                        <h4 className="font-medium text-gray-700 mb-2">{fieldName}</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                          {categories.map(category => (
                            <label key={category.job_category_id} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={selectedPreferences.includes(category.job_category_id)}
                                onChange={() => handlePreferenceChange(category.job_category_id)}
                                className="mr-2"
                              />
                              <span className="text-sm">{category.job_category_name}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Resume Section - Only for Job Seekers in Edit Mode */}
                {user?.isJobSeeker && (
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-4">Resume (PDF Only)</h3>
                    
                    {(user?.hasResume || resume) && !removeResume ? (
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center">
                            <div className="text-4xl mr-3">📄</div>
                            <div>
                              <p className="font-medium">
                                {resume ? 'New Resume Selected' : 'Resume Uploaded'}
                              </p>
                              <p className="text-sm text-gray-600">
                                {resume ? resume.name : 'Current resume on file'}
                              </p>
                              {resume && (
                                <p className="text-xs text-green-600 mt-1">
                                  ✓ Ready to upload when you save profile
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={handleRemoveResume}
                              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700 transition-colors"
                            >
                              Remove
                            </button>
                            {resumePreviewUrl && (
                              <a
                                href={resumePreviewUrl}
                                download="resume.pdf"
                                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition-colors"
                              >
                                Download
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
                        <div className="text-4xl mb-2">📄</div>
                        <p className="text-gray-600 mb-4">Upload your resume (PDF only)</p>
                        <label className="cursor-pointer bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition-colors">
                          Choose PDF Resume File
                          <input
                            type="file"
                            accept=".pdf"
                            onChange={handleResumeChange}
                            className="hidden"
                          />
                        </label>
                        <p className="text-sm text-gray-500 mt-2">PDF files only (max 10MB)</p>
                      </div>
                    )}

                    {/* Upload/Remove Instructions */}
                    {resume && (
                      <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div className="flex items-start">
                          <div className="text-blue-600 mr-2">💡</div>
                          <div>
                            <p className="text-blue-800 font-medium">Ready to Upload</p>
                            <p className="text-blue-700 text-sm">
                              Your new PDF resume is selected. Click "Save Changes" below to upload it to your account.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}

                    {removeResume && (
                      <div className="mt-4 p-4 bg-red-50 rounded-lg border border-red-200">
                        <div className="flex items-start">
                          <div className="text-red-600 mr-2">🗑️</div>
                          <div>
                            <p className="text-red-800 font-medium">Resume Will Be Removed</p>
                            <p className="text-red-700 text-sm">
                              Your resume will be permanently removed when you save your profile.
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex justify-center pt-6">
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-green-600 text-white px-8 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-lg font-medium"
                  >
                    {isSubmitting ? 'Saving Changes...' : 'Save Changes'}
                  </button>
                </div>
              </form>
            ) : (
              /* View Mode Display */
              <div className="space-y-6">
                {/* Profile Photo Display */}
                <div className="text-center mb-8">
                  {user?.profilePhoto ? (
                    <img 
                      src={user.profilePhoto} 
                      alt="Profile" 
                      className="w-32 h-32 rounded-full object-cover border-4 border-gray-200 mx-auto"
                    />
                  ) : (
                    <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center mx-auto text-gray-500">
                      <span className="text-4xl">👤</span>
                    </div>
                  )}
                  <h3 className="text-xl font-semibold mt-4 text-gray-800">
                    {user?.firstName} {user?.lastName}
                  </h3>
                  <p className="text-gray-600">{user?.email}</p>
                  {!user?.isVerified && (
                    <span className="inline-block bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm mt-2">
                      Email Not Verified
                    </span>
                  )}
                </div>

                {/* Personal Information Display */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-2">Personal Information</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">Full Name:</span> {user?.firstName || 'Not provided'} {user?.middleName} {user?.lastName || 'Not provided'}</p>
                      <p><span className="font-medium">Phone:</span> {user?.phone || 'Not provided'}</p>
                      <p><span className="font-medium">Nationality:</span> {user?.nationality || 'Not provided'}</p>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-2">Address</h4>
                    <div className="space-y-2 text-sm">
                      <p><span className="font-medium">House/Building:</span> {user?.premiseName || 'Not provided'}</p>
                      <p><span className="font-medium">Street:</span> {user?.streetName || 'Not provided'}</p>
                      <p><span className="font-medium">Barangay:</span> {user?.barangayName || 'Not provided'}</p>
                      <p><span className="font-medium">City:</span> {user?.cityName || 'Not provided'}</p>
                    </div>
                  </div>
                </div>

                {/* Account Information */}
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-700 mb-2">Account Information</h4>
                  <div className="space-y-2 text-sm">
                    <p><span className="font-medium">Username:</span> {user?.username}</p>
                    <p><span className="font-medium">Account Type:</span> {user?.isJobSeeker ? 'Job Seeker' : 'Company Employee'}</p>
                    {user?.companyName && (
                      <p><span className="font-medium">Company:</span> {user.companyName}</p>
                    )}
                    {user?.position && (
                      <p><span className="font-medium">Position:</span> {user.position}</p>
                    )}
                  </div>
                </div>

                {/* Resume Information for Job Seekers */}
                {user?.isJobSeeker && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-gray-700 mb-2">Resume</h4>
                    {user?.hasResume ? (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="text-2xl mr-2">📄</div>
                          <span className="text-sm">Resume uploaded</span>
                        </div>
                        {resumePreviewUrl && (
                          <a
                            href={resumePreviewUrl}
                            download="resume.pdf"
                            className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700 transition-colors"
                          >
                            Download
                          </a>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-600">No resume uploaded</p>
                    )}
                  </div>
                )}

                {/* Job Preferences Display for Job Seekers */}
                {user?.isJobSeeker && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex justify-between items-center mb-2">
                      <h4 className="font-semibold text-gray-700">Job Preferences</h4>
                      <button
                        onClick={() => router.push('/job-preferences')}
                        className="text-blue-600 hover:text-blue-800 text-sm"
                      >
                        Update
                      </button>
                    </div>
                    {selectedPreferences.length === 0 ? (
                      <p className="text-sm text-gray-600">No preferences set. Click "Edit Profile" to add your job preferences.</p>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {jobCategories
                          .filter(cat => selectedPreferences.includes(cat.job_category_id))
                          .map(category => (
                            <span
                              key={category.job_category_id}
                              className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs"
                            >
                              {category.job_category_name}
                            </span>
                          ))
                        }
                      </div>
                    )}
                  </div>
                )}

                {/* Profile Completion Status */}
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-800 mb-2">Profile Status</h4>
                  <div className="space-y-1 text-sm text-blue-700">
                    <div className="flex items-center">
                      <span className={`mr-2 ${user?.firstName && user?.lastName ? 'text-green-600' : 'text-red-600'}`}>
                        {user?.firstName && user?.lastName ? '✓' : '✗'}
                      </span>
                      Basic Information
                    </div>
                    <div className="flex items-center">
                      <span className={`mr-2 ${user?.phone ? 'text-green-600' : 'text-red-600'}`}>
                        {user?.phone ? '✓' : '✗'}
                      </span>
                      Contact Information
                    </div>
                    <div className="flex items-center">
                      <span className={`mr-2 ${user?.cityName ? 'text-green-600' : 'text-red-600'}`}>
                        {user?.cityName ? '✓' : '✗'}
                      </span>
                      Address Information
                    </div>
                    {user?.isJobSeeker && (
                      <>
                        <div className="flex items-center">
                          <span className={`mr-2 ${user?.hasResume ? 'text-green-600' : 'text-red-600'}`}>
                            {user?.hasResume ? '✓' : '✗'}
                          </span>
                          Resume Upload
                        </div>
                        <div className="flex items-center">
                          <span className={`mr-2 ${hasPreferences ? 'text-green-600' : 'text-red-600'}`}>
                            {hasPreferences ? '✓' : '✗'}
                          </span>
                          Job Preferences
                        </div>
                      </>
                    )}
                    <div className="flex items-center">
                      <span className={`mr-2 ${user?.isVerified ? 'text-green-600' : 'text-red-600'}`}>
                        {user?.isVerified ? '✓' : '✗'}
                      </span>
                      Email Verification
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Resume Viewer Section */}
          {user?.isJobSeeker && (
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Resume Preview</h3>
              
              {resumePreviewUrl && !removeResume ? (
                <div className="border rounded-lg overflow-hidden">
                  <iframe
                    src={`${resumePreviewUrl}#toolbar=0`}
                    className="w-full h-96 border-0"
                    title="Resume Preview"
                    onError={() => setError('Failed to load resume preview')}
                  />
                  <div className="p-2 bg-gray-50 text-center">
                    <p className="text-sm text-gray-600">
                      {resume ? 'New resume preview' : 'Current resume'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <div className="text-gray-400 text-6xl mb-4">📄</div>
                  <p className="text-gray-600">
                    {removeResume ? 'Resume will be removed' : 'No resume uploaded yet'}
                  </p>
                  <p className="text-gray-500 text-sm mt-2">
                    {removeResume ? 'Upload a new resume to replace it' : 'Upload a PDF resume to see it displayed here'}
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
