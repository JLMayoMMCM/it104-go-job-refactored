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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-medium text-[var(--foreground)]">Error loading profile</h3>
        <p className="text-[var(--text-light)]">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            fetchProfile();
          }}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-[var(--primary-color)] hover:bg-[var(--secondary-color)] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[var(--accent-color)]"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="profile-header">
        <div className="flex flex-col md:flex-row items-center md:items-start">
          <div className="w-24 h-24 bg-[var(--border-color)] rounded-full flex items-center justify-center mb-4 md:mb-0 md:mr-6">
            {profile.profile_photo ? (
              <img
                src={profile.profile_photo}
                alt="Profile"
                className="w-full h-full rounded-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/Assets/Logo.png';
                }}
              />
            ) : (
              <svg className="w-12 h-12 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold mb-2">{profile.first_name} {profile.last_name}</h1>
            <p className="text-[var(--light-color)] text-lg mb-2">{profile.position_name}</p>
            <p className="text-[var(--light-color)] text-md mb-4">{profile.company_name}</p>
            <button
              onClick={() => router.push('/Dashboard/employee/profile/edit')}
              className="px-4 py-2 bg-white text-[var(--primary-color)] rounded-md text-sm font-medium hover:bg-[var(--hover-color)]"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-[var(--card-background)] shadow-lg rounded-xl overflow-hidden">
        <div className="panel-header">
          <h3 className="text-lg font-semibold text-white">Personal Information</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-[var(--text-light)]">Full Name</p>
              <p className="text-lg font-medium text-[var(--foreground)]">
                {profile.first_name} {profile.middle_name} {profile.last_name}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-light)]">Date of Birth</p>
              <p className="text-lg font-medium text-[var(--foreground)]">
                {profile.date_of_birth ? formatDate(profile.date_of_birth) : 'Not provided'}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-light)]">Gender</p>
              <p className="text-lg font-medium text-[var(--foreground)]">
                {profile.gender}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-light)]">Nationality</p>
              <p className="text-lg font-medium text-[var(--foreground)]">
                {profile.nationality}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-[var(--card-background)] shadow-lg rounded-xl overflow-hidden">
        <div className="panel-header">
          <h3 className="text-lg font-semibold text-white">Contact Information</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-[var(--text-light)]">Email Address</p>
              <p className="text-lg font-medium text-[var(--foreground)]">
                {profile.email}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-light)]">Phone Number</p>
              <p className="text-lg font-medium text-[var(--foreground)]">
                {profile.phone}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Address Information */}
      <div className="bg-[var(--card-background)] shadow-lg rounded-xl overflow-hidden">
        <div className="panel-header">
          <h3 className="text-lg font-semibold text-white">Address</h3>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-[var(--text-light)]">Full Address</p>
              <p className="text-lg font-medium text-[var(--foreground)]">
                {profile.address.premise_name || profile.address.street_name || profile.address.barangay_name || profile.address.city_name
                  ? `${profile.address.premise_name || ''} ${profile.address.street_name || ''}, ${profile.address.barangay_name || ''}, ${profile.address.city_name || ''}`
                  : 'Not provided'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Employment Information */}
      <div className="bg-[var(--card-background)] shadow-lg rounded-xl overflow-hidden">
        <div className="panel-header">
          <h3 className="text-lg font-semibold text-white">Employment Information</h3>
          <p className="text-sm text-white text-opacity-80 mt-1">Your professional details</p>
        </div>
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <p className="text-sm font-medium text-[var(--text-light)]">Company</p>
              <p className="text-lg font-medium text-[var(--foreground)]">
                {profile.company_name}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium text-[var(--text-light)]">Position</p>
              <p className="text-lg font-medium text-[var(--foreground)]">
                {profile.position_name}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
