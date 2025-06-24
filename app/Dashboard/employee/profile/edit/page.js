'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function EditProfilePage() {
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    date_of_birth: '',
    gender_id: '',
    nationality_id: '',
    phone: '',
    position_name: '',
    premise_name: '',
    street_name: '',
    barangay_name: '',
    city_name: '',
    password: '',
    profile_photo: ''
  });
  const [nationalities, setNationalities] = useState([]);
  const [genders, setGenders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [photoPreview, setPhotoPreview] = useState('');
  const [error, setError] = useState('');
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch profile data
      const accountId = localStorage.getItem('accountId') || '1';
      const profileRes = await fetch(`/api/employee/profile?accountId=${accountId}`);
      const profileData = await profileRes.json();
      if (profileRes.ok && profileData.success) {
        console.log('Profile data received:', profileData.data);
        console.log('Person data:', profileData.data.person);
        console.log('Nationality data:', profileData.data.person?.nationality);
        
        setFormData({
          first_name: profileData.data.person?.first_name || '',
          last_name: profileData.data.person?.last_name || '',
          middle_name: profileData.data.person?.middle_name || '',
          date_of_birth: profileData.data.person?.date_of_birth || '',
          gender_id: profileData.data.person?.gender?.gender_id || '',
          nationality_id: profileData.data.person?.nationality?.nationality_id || '',
          phone: profileData.data.account?.account_phone || '',
          position_name: profileData.data.position_name || '',
          premise_name: profileData.data.person?.address?.premise_name || '',
          street_name: profileData.data.person?.address?.street_name || '',
          barangay_name: profileData.data.person?.address?.barangay_name || '',
          city_name: profileData.data.person?.address?.city_name || '',
          password: '',
          profile_photo: profileData.data.account?.account_profile_photo || ''
        });
      }

      // Fetch nationalities
      const nationalitiesRes = await fetch('/api/data/nationalities');
      const nationalitiesData = await nationalitiesRes.json();
      if (nationalitiesRes.ok && nationalitiesData.success) {
        setNationalities(nationalitiesData.data);
      }

      // Fetch genders
      const gendersRes = await fetch('/api/data/genders');
      const gendersData = await gendersRes.json();
      if (gendersRes.ok && gendersData.success) {
        setGenders(gendersData.data);
      }
    } catch (error) {
      console.error('Error fetching data:', error);
      setError('Failed to load profile data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: null }));
    }
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      setError('Invalid file type. Only JPEG, PNG, and WebP are allowed.');
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
    setFormData(prev => ({
      ...prev,
      profile_photo: file
    }));

    // No separate upload needed, photo will be saved with form submission
    setPhotoUploading(false);
  };

  const handleRemovePhoto = async () => {
    setFormData(prev => ({
      ...prev,
      profile_photo: ''
    }));
    setPhotoPreview('');
    
    // If there was an existing photo, send request to delete it
    if (formData.profile_photo && typeof formData.profile_photo === 'string') {
      try {
        const accountId = localStorage.getItem('accountId') || '1';
        const response = await fetch(`/api/employee/profile/photo?accountId=${accountId}`, {
          method: 'DELETE'
        });
        
        if (!response.ok) {
          console.error('Failed to delete profile photo');
        }
      } catch (error) {
        console.error('Error deleting profile photo:', error);
      }
    }
  };

  const validateForm = () => {
    const newErrors = {};
    if (!formData.first_name) newErrors.first_name = 'First name is required';
    if (!formData.last_name) newErrors.last_name = 'Last name is required';

    if (formData.phone && !/^[+]*[(]{0,1}[0-9]{1,4}[)]{0,1}[-\s\./0-9]*$/.test(formData.phone)) {
        newErrors.phone = 'Invalid phone number format';
    }

    if (formData.password && formData.password.length > 0 && formData.password.length < 8) {
      newErrors.password = 'Password must be at least 8 characters long';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) {
      return;
    }
    setSubmitting(true);
    setError(''); // Clear general error

    try {
      const accountId = localStorage.getItem('accountId') || '1';
      
      // First update profile data
      const profileResponse = await fetch('/api/employee/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          first_name: formData.first_name,
          last_name: formData.last_name,
          middle_name: formData.middle_name,
          date_of_birth: formData.date_of_birth,
          gender_id: formData.gender_id,
          nationality_id: formData.nationality_id,
          phone: formData.phone,
          position_name: formData.position_name,
          premise_name: formData.premise_name,
          street_name: formData.street_name,
          barangay_name: formData.barangay_name,
          city_name: formData.city_name,
          password: formData.password
        }),
      });

      const profileData = await profileResponse.json();

      if (!profileResponse.ok) {
        throw new Error(profileData.error || 'Failed to update profile');
      }

      // If there's a new profile photo, upload it separately
      if (formData.profile_photo && typeof formData.profile_photo !== 'string') {
        const photoFormData = new FormData();
        photoFormData.append('photo', formData.profile_photo);
        photoFormData.append('accountId', accountId);

        const photoResponse = await fetch('/api/employee/profile/photo', {
          method: 'POST',
          body: photoFormData,
        });

        const photoData = await photoResponse.json();

        if (!photoResponse.ok) {
          throw new Error(photoData.error || 'Failed to upload profile photo');
        }
      }

      if (profileData.success) {
        setSuccessMessage('Profile updated successfully!');
        setTimeout(() => {
          setSuccessMessage('');
          router.push('/Dashboard/employee/profile');
        }, 2000);
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)]"></div>
      </div>
    );
  }

  return (
    <div className="page-fill">
      <div className="content-container">
        <div className="max-w-5xl mx-auto space-y-4 sm:space-y-6 py-4 sm:py-6 px-4 sm:px-6">
          {/* Header */}
          <div className="profile-header">
            <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold mb-1 sm:mb-2">Edit Profile</h1>
            <p className="text-white text-opacity-90 text-sm sm:text-base lg:text-lg">Update your personal information</p>
          </div>

          {/* Success Message */}
          {successMessage && (
            <div className="bg-green-600 text-white rounded-md p-4 mb-6">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-white" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <div className="text-sm font-medium">
                    <p>{successMessage}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <div className="card">
            <div className="panel-header flex justify-between items-center">
              <h3 className="text-lg font-medium">Personal Information</h3>
            </div>
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 sm:space-y-6">
              {error && (
                <div className="error-message p-3 sm:p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-[var(--error-color)]" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-2 sm:ml-3">
                      <h3 className="text-sm font-medium text-[var(--error-color)]">Error</h3>
                      <div className="mt-1 sm:mt-2 text-sm text-[var(--error-color)]">
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Profile Photo */}
              <div className="bg-[var(--background)] p-3 sm:p-4 rounded-md border border-[var(--border-color)]">
                <h4 className="text-lg font-medium text-[var(--foreground)] mb-2">Profile Photo</h4>
                <div className="flex flex-col sm:flex-row items-center space-y-3 sm:space-y-0 sm:space-x-4">
                  <div className="flex-shrink-0 h-20 w-20 rounded-full overflow-hidden border-2 border-[var(--border-color)]">
                    {photoPreview ? (
                      <img
                        src={photoPreview}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    ) : formData.profile_photo && typeof formData.profile_photo === 'string' ? (
                      <img
                        src={formData.profile_photo}
                        alt="Current Profile"
                        className="h-full w-full object-cover"
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = '/Assets/Logo.png'; // Fallback image if loading fails
                        }}
                      />
                    ) : (
                      <div className="h-full w-full bg-[var(--border-color)] flex items-center justify-center">
                        <svg className="h-8 w-8 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      id="photo"
                      accept="image/jpeg,image/png,image/webp"
                      onChange={handlePhotoChange}
                      className="hidden"
                    />
                    <div className="flex justify-start space-x-2 sm:space-x-3">
                      <label
                        htmlFor="photo"
                        className="cursor-pointer btn btn-primary text-sm px-4 py-2 min-w-[100px] text-center"
                      >
                        {photoUploading ? 'Uploading...' : formData.profile_photo ? 'Change Photo' : 'Upload Photo'}
                      </label>
                      {formData.profile_photo && (
                        <button
                          type="button"
                          onClick={handleRemovePhoto}
                          className="btn text-sm px-4 py-2 min-w-[100px] bg-[var(--error-color)] text-white"
                        >
                          Remove Photo
                        </button>
                      )}
                    </div>
                    <p className="mt-2 text-xs text-[var(--text-light)]">Accepted formats: JPG, PNG, WebP. Max size: 5MB</p>
                  </div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                <div>
                  <label htmlFor="first_name" className="form-label">First Name</label>
                  <input
                    type="text"
                    id="first_name"
                    name="first_name"
                    value={formData.first_name}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                  />
                  {errors.first_name && <p className="text-red-500 text-sm mt-1">{errors.first_name}</p>}
                </div>
                <div>
                  <label htmlFor="last_name" className="form-label">Last Name</label>
                  <input
                    type="text"
                    id="last_name"
                    name="last_name"
                    value={formData.last_name}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                  />
                  {errors.last_name && <p className="text-red-500 text-sm mt-1">{errors.last_name}</p>}
                </div>
                <div>
                  <label htmlFor="middle_name" className="form-label">Middle Name (Optional)</label>
                  <input
                    type="text"
                    id="middle_name"
                    name="middle_name"
                    value={formData.middle_name}
                    onChange={handleInputChange}
                    className="form-input"
                  />
                </div>
                <div>
                  <label htmlFor="date_of_birth" className="form-label">Date of Birth</label>
                  <input
                    type="date"
                    id="date_of_birth"
                    name="date_of_birth"
                    value={formData.date_of_birth}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                  />
                </div>
                <div>
                  <label htmlFor="gender_id" className="form-label">Gender</label>
                  <select
                    id="gender_id"
                    name="gender_id"
                    value={formData.gender_id}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                  >
                    <option value="">Select Gender</option>
                    {genders.map(gender => (
                      <option key={gender.gender_id} value={gender.gender_id}>{gender.gender_name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="nationality_id" className="form-label">Nationality</label>
                  <select
                    id="nationality_id"
                    name="nationality_id"
                    value={formData.nationality_id}
                    onChange={handleInputChange}
                    required
                    className="form-input"
                  >
                    <option value="">Select Nationality</option>
                    {nationalities.map(nat => (
                      <option key={nat.nationality_id} value={nat.nationality_id}>{nat.nationality_name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Contact Information */}
              <div className="border-t border-[var(--border-color)] pt-3 sm:pt-4">
                <h4 className="text-lg font-medium text-[var(--foreground)] mb-2">Contact Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                  <div>
                    <label htmlFor="phone" className="form-label">Phone Number (Optional)</label>
                    <input
                      type="tel"
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="e.g., +63 912 345 6789"
                    />
                    {errors.phone && <p className="text-red-500 text-sm mt-1">{errors.phone}</p>}
                  </div>
                </div>
              </div>

              {/* Address Information */}
              <div className="border-t border-[var(--border-color)] pt-3 sm:pt-4">
                <h4 className="text-lg font-medium text-[var(--foreground)] mb-2">Address</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                  <div>
                    <label htmlFor="premise_name" className="form-label">Premise Name (Optional)</label>
                    <input
                      type="text"
                      id="premise_name"
                      name="premise_name"
                      value={formData.premise_name}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="e.g., Apartment 123"
                    />
                  </div>
                  <div>
                    <label htmlFor="street_name" className="form-label">Street Name (Optional)</label>
                    <input
                      type="text"
                      id="street_name"
                      name="street_name"
                      value={formData.street_name}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="e.g., Rizal Street"
                    />
                  </div>
                  <div>
                    <label htmlFor="barangay_name" className="form-label">Barangay (Optional)</label>
                    <input
                      type="text"
                      id="barangay_name"
                      name="barangay_name"
                      value={formData.barangay_name}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="e.g., Barangay Poblacion"
                    />
                  </div>
                  <div>
                    <label htmlFor="city_name" className="form-label">City (Optional)</label>
                    <input
                      type="text"
                      id="city_name"
                      name="city_name"
                      value={formData.city_name}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="e.g., Davao City"
                    />
                  </div>
                </div>
              </div>

              {/* Employment Information */}
              <div className="border-t border-[var(--border-color)] pt-3 sm:pt-4">
                <h4 className="text-lg font-medium text-[var(--foreground)] mb-2">Employment Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                  <div>
                    <label htmlFor="position_name" className="form-label">Position (Optional)</label>
                    <input
                      type="text"
                      id="position_name"
                      name="position_name"
                      value={formData.position_name}
                      onChange={handleInputChange}
                      className="form-input"
                      placeholder="e.g., HR Manager"
                    />
                  </div>
                </div>
              </div>

              {/* Password Verification */}
              <div className="border-t border-[var(--border-color)] pt-3 sm:pt-4">
                <h4 className="text-lg font-medium text-[var(--foreground)] mb-2">Verify Identity</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4 lg:gap-6">
                  <div>
                    <label htmlFor="password" className="form-label">Password (Required to update profile)</label>
                    <input
                      type="password"
                      id="password"
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      required
                      className="form-input"
                      placeholder="Enter your password"
                    />
                    {errors.password && <p className="text-red-500 text-sm mt-1">{errors.password}</p>}
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <div className="flex justify-end items-center mt-6 space-x-3">
                {successMessage && <div className="text-green-600 mr-4">{successMessage}</div>}
                <button
                  type="button"
                  onClick={() => router.push('/Dashboard/employee/profile')}
                  className="btn btn-secondary px-4 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary px-4 py-2"
                  disabled={submitting}
                >
                  {submitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
