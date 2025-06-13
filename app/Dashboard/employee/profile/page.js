'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function ProfilePage() {
  const [profile, setProfile] = useState({
    first_name: '',
    last_name: '',
    middle_name: '',
    date_of_birth: '',
    gender: '',
    nationality: '',
    email: '',
    phone: '',
    company_name: '',
    position_name: '',
    address: {
      premise_name: '',
      street_name: '',
      barangay_name: '',
      city_name: ''
    },
    profile_photo: ''
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const accountId = localStorage.getItem('accountId') || '1';
      const response = await fetch(`/api/employee/profile?accountId=${accountId}`);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch profile data');
      }

      if (data.success) {
        setProfile({
          first_name: data.data.person?.first_name || '',
          last_name: data.data.person?.last_name || '',
          middle_name: data.data.person?.middle_name || '',
          date_of_birth: data.data.person?.date_of_birth || '',
          gender: data.data.person?.gender?.gender_name || 'Not provided',
          nationality: data.data.person?.nationality?.nationality_name || 'Not provided',
          email: data.data.account?.account_email || 'Not provided',
          phone: data.data.account?.account_phone || 'Not provided',
          company_name: data.data.company?.company_name || 'Not provided',
          position_name: data.data.position_name || 'Not provided',
          address: {
            premise_name: data.data.person?.address?.premise_name || '',
            street_name: data.data.person?.address?.street_name || '',
            barangay_name: data.data.person?.address?.barangay_name || '',
            city_name: data.data.person?.address?.city_name || ''
          },
          profile_photo: data.data.account?.account_profile_photo || ''
        });
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-gray-900">Error loading profile</h3>
        <p className="text-gray-600">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            fetchProfile();
          }}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Profile</h1>
          <p className="text-gray-600">View and manage your personal information</p>
        </div>
        <button
          onClick={() => router.push('/Dashboard/employee/profile/edit')}
          className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <svg className="-ml-1 mr-2 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          Edit Profile
        </button>
      </div>

      {/* Profile Photo */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Profile Photo</h3>
        </div>
        <div className="p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0 h-24 w-24 rounded-full overflow-hidden border-2 border-gray-200">
              {profile.profile_photo ? (
                <img
                  src={profile.profile_photo}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="h-full w-full bg-gray-200 flex items-center justify-center">
                  <svg className="h-10 w-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                </div>
              )}
            </div>
            <div className="ml-6">
              <p className="text-sm text-gray-500">Upload a photo to personalize your profile</p>
              <button
                onClick={() => router.push('/Dashboard/employee/profile/edit')}
                className="mt-2 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Change Photo
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Personal Information</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500">Full Name</p>
              <p className="text-lg font-medium text-gray-900">
                {profile.first_name} {profile.middle_name} {profile.last_name}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Date of Birth</p>
              <p className="text-lg font-medium text-gray-900">
                {profile.date_of_birth ? formatDate(profile.date_of_birth) : 'Not provided'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Gender</p>
              <p className="text-lg font-medium text-gray-900">
                {profile.gender}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Nationality</p>
              <p className="text-lg font-medium text-gray-900">
                {profile.nationality}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Contact Information</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500">Email Address</p>
              <p className="text-lg font-medium text-gray-900">
                {profile.email}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Phone Number</p>
              <p className="text-lg font-medium text-gray-900">
                {profile.phone}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Address</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500">Full Address</p>
              <p className="text-lg font-medium text-gray-900">
                {profile.address.premise_name || profile.address.street_name || profile.address.barangay_name || profile.address.city_name
                  ? `${profile.address.premise_name || ''} ${profile.address.street_name || ''}, ${profile.address.barangay_name || ''}, ${profile.address.city_name || ''}`
                  : 'Not provided'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Employment Information */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Employment Information</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-gray-500">Company</p>
              <p className="text-lg font-medium text-gray-900">
                {profile.company_name}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Position</p>
              <p className="text-lg font-medium text-gray-900">
                {profile.position_name}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
