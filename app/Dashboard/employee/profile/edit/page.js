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
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
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

    // Upload photo
    setPhotoUploading(true);
    try {
      const accountId = localStorage.getItem('accountId') || '1';
      const formData = new FormData();
      formData.append('photo', file);
      formData.append('accountId', accountId);

      const response = await fetch('/api/employee/profile/photo', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload photo');
      }

      if (data.success) {
        setFormData(prev => ({
          ...prev,
          profile_photo: photoPreview
        }));
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      setError(error.message);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleRemovePhoto = async () => {
    try {
      const accountId = localStorage.getItem('accountId') || '1';
      const response = await fetch(`/api/employee/profile/photo?accountId=${accountId}`, {
        method: 'DELETE'
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to remove photo');
      }

      if (data.success) {
        setFormData(prev => ({
          ...prev,
          profile_photo: ''
        }));
        setPhotoPreview('');
      }
    } catch (error) {
      console.error('Error removing photo:', error);
      setError(error.message);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');

    try {
      const accountId = localStorage.getItem('accountId') || '1';
      const response = await fetch('/api/employee/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          ...formData
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update profile');
      }

      if (data.success) {
        router.push('/Dashboard/employee/profile');
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edit Profile</h1>
        <p className="text-gray-600">Update your personal information</p>
      </div>

      {/* Form */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
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
                </div>
              </div>
            </div>
          )}

          {/* Profile Photo */}
          <div className="bg-gray-50 p-4 rounded-md">
            <h4 className="text-lg font-medium text-gray-900 mb-2">Profile Photo</h4>
            <div className="flex items-center space-x-4">
              <div className="flex-shrink-0 h-20 w-20 rounded-full overflow-hidden border-2 border-gray-200">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Preview"
                    className="h-full w-full object-cover"
                  />
                ) : formData.profile_photo ? (
                  <img
                    src={formData.profile_photo}
                    alt="Current Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                    <svg className="h-8 w-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                <label
                  htmlFor="photo"
                  className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  {photoUploading ? 'Uploading...' : formData.profile_photo ? 'Change Photo' : 'Upload Photo'}
                </label>
                {formData.profile_photo && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="mt-2 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Remove Photo
                  </button>
                )}
                <p className="mt-2 text-xs text-gray-500">Accepted formats: JPG, PNG, WebP. Max size: 5MB</p>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-1">First Name</label>
              <input
                type="text"
                id="first_name"
                name="first_name"
                value={formData.first_name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-1">Last Name</label>
              <input
                type="text"
                id="last_name"
                name="last_name"
                value={formData.last_name}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="middle_name" className="block text-sm font-medium text-gray-700 mb-1">Middle Name (Optional)</label>
              <input
                type="text"
                id="middle_name"
                name="middle_name"
                value={formData.middle_name}
                onChange={handleInputChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="date_of_birth" className="block text-sm font-medium text-gray-700 mb-1">Date of Birth</label>
              <input
                type="date"
                id="date_of_birth"
                name="date_of_birth"
                value={formData.date_of_birth}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            <div>
              <label htmlFor="gender_id" className="block text-sm font-medium text-gray-700 mb-1">Gender</label>
              <select
                id="gender_id"
                name="gender_id"
                value={formData.gender_id}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Gender</option>
                {genders.map(gender => (
                  <option key={gender.gender_id} value={gender.gender_id}>{gender.gender_name}</option>
                ))}
              </select>
            </div>
            <div>
              <label htmlFor="nationality_id" className="block text-sm font-medium text-gray-700 mb-1">Nationality</label>
              <select
                id="nationality_id"
                name="nationality_id"
                value={formData.nationality_id}
                onChange={handleInputChange}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select Nationality</option>
                {nationalities.map(nat => (
                  <option key={nat.nationality_id} value={nat.nationality_id}>{nat.nationality_name}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Contact Information */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-lg font-medium text-gray-900 mb-2">Contact Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">Phone Number (Optional)</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., +63 912 345 6789"
                />
              </div>
            </div>
          </div>

          {/* Address Information */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-lg font-medium text-gray-900 mb-2">Address</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="premise_name" className="block text-sm font-medium text-gray-700 mb-1">Premise Name (Optional)</label>
                <input
                  type="text"
                  id="premise_name"
                  name="premise_name"
                  value={formData.premise_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Apartment 123"
                />
              </div>
              <div>
                <label htmlFor="street_name" className="block text-sm font-medium text-gray-700 mb-1">Street Name (Optional)</label>
                <input
                  type="text"
                  id="street_name"
                  name="street_name"
                  value={formData.street_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Rizal Street"
                />
              </div>
              <div>
                <label htmlFor="barangay_name" className="block text-sm font-medium text-gray-700 mb-1">Barangay (Optional)</label>
                <input
                  type="text"
                  id="barangay_name"
                  name="barangay_name"
                  value={formData.barangay_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Barangay Poblacion"
                />
              </div>
              <div>
                <label htmlFor="city_name" className="block text-sm font-medium text-gray-700 mb-1">City (Optional)</label>
                <input
                  type="text"
                  id="city_name"
                  name="city_name"
                  value={formData.city_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., Davao City"
                />
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-lg font-medium text-gray-900 mb-2">Employment Information</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="position_name" className="block text-sm font-medium text-gray-700 mb-1">Position (Optional)</label>
                <input
                  type="text"
                  id="position_name"
                  name="position_name"
                  value={formData.position_name}
                  onChange={handleInputChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="e.g., HR Manager"
                />
              </div>
            </div>
          </div>

          {/* Password Verification */}
          <div className="border-t border-gray-200 pt-4">
            <h4 className="text-lg font-medium text-gray-900 mb-2">Verify Identity</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Password (Required to update profile)</label>
                <input
                  type="password"
                  id="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your password"
                />
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3">
            <button
              type="button"
              onClick={() => router.push('/Dashboard/employee/profile')}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
