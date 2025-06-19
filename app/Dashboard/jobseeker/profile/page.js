'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { PDFDownloadLink, Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// Styles for the PDF
const styles = StyleSheet.create({
  page: {
    padding: 30,
    fontSize: 12,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    marginBottom: 5,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    borderBottom: 1,
    borderBottomColor: '#000',
  },
  text: {
    marginBottom: 5,
  },
  contact: {
    marginTop: 5,
    fontSize: 10,
    color: '#555',
  },
});

export default function JobseekerProfile() {
  const [profile, setProfile] = useState(null);
  const [jobPreferences, setJobPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cacheBuster, setCacheBuster] = useState(Date.now());
  const router = useRouter();

  useEffect(() => {
    const accountId = localStorage.getItem('accountId');
    const accountType = localStorage.getItem('accountType');
    
    if (!accountId || accountType !== '2') {
      router.push('/Login');
      return;
    }
    
    // Refresh data when component mounts or after edit
    fetchProfileData(accountId);
  }, [router, cacheBuster]);

  const fetchProfileData = async (accountId) => {
    try {
      setError(null);
      console.log('Fetching profile data for accountId:', accountId);
      
      // Add cache buster to URL to ensure fresh data
      const response = await fetch(`/api/jobseeker/profile?accountId=${accountId}&cb=${Date.now()}`);
      console.log('API response status:', response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API response error:', errorText);
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      console.log('API response data:', data);
      
      if (data.success) {
        setProfile({
          firstName: data.data.person.first_name,
          lastName: data.data.person.last_name,
          email: data.data.person.email,
          phone: data.data.person.phone,
          address: data.data.person.address,
          nationality: data.data.person.nationality,
          gender: data.data.person.gender,
          educationLevel: data.data.person.education_level,
          experienceLevel: data.data.person.experience_level,
          profilePhoto: data.data.account.profile_photo,
          resume: data.data.account.resume || null
        });
        // Ensure job preferences are always an array, even if empty
        setJobPreferences(data.data.job_preferences || []);
        console.log('Profile data set successfully');
      } else {
        console.error('API returned error:', data.error);
        throw new Error(data.error || 'Failed to fetch profile data');
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProfile = useCallback(() => {
    router.push('/Dashboard/jobseeker/profile/edit');
    // Update cache buster to ensure refresh when returning
    setCacheBuster(Date.now());
  }, [router]);

  // Resume PDF Component
  const ResumePDF = () => {
    if (!profile) {
      return (
        <Document>
          <Page style={styles.page}>
            <View style={styles.header}>
              <Text style={styles.title}>No Profile Data</Text>
              <Text style={styles.subtitle}>Please update your profile to generate a resume.</Text>
            </View>
          </Page>
        </Document>
      );
    }

    return (
      <Document>
        <Page style={styles.page}>
          <View style={styles.header}>
            <Text style={styles.title}>{profile?.firstName} {profile?.lastName}</Text>
            <Text style={styles.subtitle}>{profile?.educationLevel} • {profile?.experienceLevel}</Text>
            <View style={styles.contact}>
              <Text style={styles.text}>Email: {profile?.email}</Text>
              <Text style={styles.text}>Phone: {profile?.phone}</Text>
              <Text style={styles.text}>Address: {profile?.address}</Text>
            </View>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Personal Information</Text>
            <Text style={styles.text}>Nationality: {profile?.nationality}</Text>
            <Text style={styles.text}>Gender: {profile?.gender}</Text>
          </View>
          
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Job Preferences</Text>
            {jobPreferences.length > 0 ? (
              jobPreferences.map((pref, index) => (
                <Text key={index} style={styles.text}>
                  {pref.category_name} - {pref.field_name}
                </Text>
              ))
            ) : (
              <Text style={styles.text}>No job preferences set</Text>
            )}
          </View>
        </Page>
      </Document>
    );
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)]"></div>
      </div>
    );
  }

  if (error || !profile) {
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
              <h3 className="text-sm font-medium text-[var(--error-color)]">Error loading profile</h3>
              <div className="mt-2 text-sm text-[var(--error-color)]">
                <p>{error || 'Profile data not found'}</p>
              </div>
              <div className="mt-4">
                <button
                  onClick={() => {
                    setError(null);
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
    <div className="space-y-6">
      {/* Header */}
      <div className="profile-header p-4 sm:p-6">
        <div className="flex flex-col md:flex-row items-center md:items-start">
          <div className="w-20 h-20 sm:w-24 sm:h-24 bg-[var(--border-color)] rounded-full flex items-center justify-center mb-3 sm:mb-4 md:mb-0 md:mr-4 sm:md:mr-6">
            {profile.profilePhoto ? (
              <img
                src={profile.profilePhoto}
                alt="Profile"
                className="w-full h-full rounded-full object-cover"
                onError={(e) => {
                  e.target.onerror = null;
                  e.target.src = '/Assets/Logo.png';
                }}
              />
            ) : (
              <svg className="w-10 h-10 sm:w-12 sm:h-12 text-[var(--text-light)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-xl sm:text-2xl md:text-3xl font-bold mb-1 sm:mb-2">{profile.firstName} {profile.lastName}</h1>
            <p className="text-white text-opacity-90 text-sm sm:text-base mb-2 sm:mb-3">{profile.educationLevel} • {profile.experienceLevel}</p>
            <button
              onClick={handleEditProfile}
              className="btn btn-primary text-sm px-4 py-2 min-w-[100px] mx-auto md:mx-0"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 mx-2 sm:mx-0 landscape:max-h-[66vh] h-auto">
        {/* Column 1: Personal Information and Job Preferences */}
        <div className="flex flex-col space-y-4 sm:space-y-6 h-full">
          {/* Personal Information */}
          <div className="bg-[var(--card-background)] shadow-lg rounded-xl overflow-hidden">
            <div className="panel-header p-3 sm:p-4 h-16 sm:h-20 flex items-center">
              <h3 className="text-base sm:text-lg font-semibold text-white">Personal Information</h3>
            </div>
            <div className="p-3 sm:p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <p className="text-xs sm:text-sm text-[var(--text-light)]">Email Address</p>
                  <p className="font-medium text-sm sm:text-base text-[var(--foreground)]">{profile.email}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-[var(--text-light)]">Phone Number</p>
                  <p className="font-medium text-sm sm:text-base text-[var(--foreground)]">{profile.phone}</p>
                </div>
                <div className="sm:col-span-2">
                  <p className="text-xs sm:text-sm text-[var(--text-light)]">Address</p>
                  <p className="font-medium text-sm sm:text-base text-[var(--foreground)]">{profile.address}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-[var(--text-light)]">Nationality</p>
                  <p className="font-medium text-sm sm:text-base text-[var(--foreground)]">{profile.nationality}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-[var(--text-light)]">Gender</p>
                  <p className="font-medium text-sm sm:text-base text-[var(--foreground)]">{profile.gender}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-[var(--text-light)]">Education Level</p>
                  <p className="font-medium text-sm sm:text-base text-[var(--foreground)]">{profile.educationLevel}</p>
                </div>
                <div>
                  <p className="text-xs sm:text-sm text-[var(--text-light)]">Experience Level</p>
                  <p className="font-medium text-sm sm:text-base text-[var(--foreground)]">{profile.experienceLevel}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Job Preferences */}
          <div className="bg-[var(--card-background)] shadow-lg rounded-xl overflow-hidden flex-1">
            <div className="panel-header p-3 sm:p-4 h-16 sm:h-20 flex items-center">
              <h3 className="text-base sm:text-lg font-semibold text-white">Job Preferences</h3>
            </div>
            <div className="p-3 sm:p-4 h-auto min-h-0 flex-1 overflow-y-auto">
              {jobPreferences.length > 0 ? (
                <div className="flex flex-wrap gap-2 max-h-full overflow-y-auto scrollbar-hide p-1">
                  {jobPreferences.map((pref, index) => (
                    <div key={index} className="inline-flex items-center px-3 py-1.5 rounded-full border border-[var(--border-color)] bg-[var(--background)] min-w-fit">
                      <h4 className="text-sm font-medium text-[var(--foreground)] mr-1">{pref.category_name || `Category ${pref.category_id}`}</h4>
                      <p className="text-xs text-[var(--text-light)]">({pref.field_name || 'N/A'})</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-3 sm:p-4 border border-dashed border-[var(--border-color)] rounded-lg">
                  <p className="text-sm text-[var(--text-light)]">No job preferences set</p>
                  <button
                    onClick={() => router.push('/Dashboard/jobseeker/preferences')}
                    className="mt-2 btn btn-primary text-sm px-4 py-2 min-w-[100px]"
                  >
                    Set Preferences
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Column 2: Resume */}
        <div className="bg-[var(--card-background)] shadow-lg rounded-xl overflow-hidden h-full max-h-[66vh]">
          <div className="panel-header p-3 sm:p-4 h-16 sm:h-20 flex items-center">
            <h3 className="text-base sm:text-lg font-semibold text-white">Resume</h3>
          </div>
          <div className="p-3 sm:p-4 h-auto min-h-0 flex-1 overflow-y-auto">
            {profile ? (
              <div className="space-y-3 sm:space-y-4 h-full">
                {profile.resume ? (
                  <div className="space-y-3 sm:space-y-4 flex flex-col h-full">
                    <div className="border border-[var(--border-color)] rounded-lg p-3 sm:p-4 bg-[var(--background)] h-auto">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <svg className="w-5 h-5 sm:w-6 sm:h-auto text-[var(--primary-color)] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <div>
                            <p className="text-sm font-medium text-[var(--foreground)]">
                              {profile.resume.name || profile.resume.url.split('/').pop() || 'Resume File'}
                            </p>
                            <p className="text-xs text-[var(--text-light)]">
                              {profile.resume.size || 'Size not available'}
                            </p>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <a
                            href={`${profile.resume.url}?cb=${Date.now()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="btn btn-primary text-sm px-4 py-2 min-w-[100px] text-center"
                          >
                            View Full Resume
                          </a>
                        </div>
                      </div>
                    </div>
                    <div className="border border-[var(--border-color)] rounded-lg p-3 sm:p-4 bg-[var(--background)] flex-1 overflow-y-auto max-h-[400px]">
                      <p className="text-sm text-[var(--text-light)] mb-1">Resume Preview:</p>
                      <div className="h-auto sm:h-90 overflow-hidden relative">
                        <iframe
                          src={`${profile.resume.url}?cb=${Date.now()}#toolbar=0&navpanes=0&scrollbar=0&view=FitH`}
                          title="Resume Preview"
                          className="w-full h-full border-none"
                          allow="autoplay"
                        />
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-[var(--background)] to-transparent h-8"></div>
                      </div>
                      <p className="text-xs text-[var(--text-light)] mt-2">Preview may not show full document. Click "View Full Resume" to see complete file.</p>
                    </div>
                  </div>
                ) : (
                  <div className="text-center p-6 sm:p-8 border border-dashed border-[var(--border-color)] rounded-lg bg-[var(--background)] h-auto">
                    <svg className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-[var(--text-light)] mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <p className="text-[var(--foreground)] text-base sm:text-lg">Resume Not Available</p>
                    <p className="text-sm text-[var(--text-light)] mt-1 sm:mt-2">Upload your resume to showcase your professional experience and skills.</p>
                    <button
                      onClick={handleEditProfile}
                      className="mt-3 sm:mt-4 btn btn-primary text-sm px-4 py-2 min-w-[100px]"
                    >
                      Upload Resume
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center p-6 sm:p-8 border-2 border-dashed border-[var(--border-color)] rounded-lg bg-[var(--background)] h-auto">
                <svg className="mx-auto h-12 w-12 sm:h-16 sm:w-16 text-[var(--text-light)] mb-3 sm:mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 0115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <h3 className="text-base sm:text-lg font-medium text-[var(--foreground)] mb-1 sm:mb-2">No resume uploaded</h3>
                <p className="text-sm text-[var(--text-light)] mb-4 sm:mb-6">Upload your resume to showcase your professional experience and skills</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
