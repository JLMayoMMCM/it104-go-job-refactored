'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';

export default function ViewApplicantProfile() {
  const [profile, setProfile] = useState(null);
  const [jobPreferences, setJobPreferences] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();
  const params = useParams();
  const { jobSeekerAccountId } = params;

  useEffect(() => {
    const employeeAccountId = localStorage.getItem('accountId');
    const accountType = localStorage.getItem('accountType');
    
    if (!employeeAccountId || accountType !== '3') {
      router.push('/Login');
      return;
    }
    
    fetchApplicantData(employeeAccountId, jobSeekerAccountId);
  }, [router, jobSeekerAccountId]);

  const fetchApplicantData = async (employeeAccountId, jobSeekerAccountId) => {
    try {
      setError(null);
      
      const response = await fetch(`/api/employee/view-applicant/${jobSeekerAccountId}?employeeAccountId=${employeeAccountId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      
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
        setJobPreferences(data.data.job_preferences || []);
      } else {
        throw new Error(data.error || 'Failed to fetch applicant data');
      }
    } catch (error) {
      console.error('Error fetching applicant data:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToJobRequests = () => {
    router.push('/Dashboard/employee/job-requests');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error || !profile) {
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
              <h3 className="text-sm font-medium text-red-800">Error loading applicant profile</h3>
              <div className="mt-2 text-sm text-red-700">
                <p>{error || 'Applicant data not found'}</p>
              </div>
              <div className="mt-4 space-x-2">
                <button
                  onClick={() => {
                    setError(null);
                    setLoading(true);
                    const employeeAccountId = localStorage.getItem('accountId');
                    if (employeeAccountId) fetchApplicantData(employeeAccountId, jobSeekerAccountId);
                  }}
                  className="bg-red-100 px-4 py-2 rounded-md text-sm font-medium text-red-800 hover:bg-red-200"
                >
                  Try Again
                </button>
                <button
                  onClick={handleReturnToJobRequests}
                  className="bg-gray-100 px-4 py-2 rounded-md text-sm font-medium text-gray-800 hover:bg-gray-200"
                >
                  Return to Job Requests
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
      {/* Header with Return Button */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg shadow-lg p-8 text-white">
        <div className="flex justify-between items-start mb-4">
          <button
            onClick={handleReturnToJobRequests}
            className="inline-flex items-center px-4 py-2 border border-white/20 shadow-sm text-sm font-medium rounded-md text-white bg-white/10 hover:bg-white/20 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-white"
          >
            <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Return to Job Requests
          </button>
          <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-white/20 text-white">
            Applicant Profile
          </span>
        </div>
        <div className="flex flex-col md:flex-row items-center md:items-start">
          <div className="w-24 h-24 bg-white/20 rounded-full flex items-center justify-center mb-4 md:mb-0 md:mr-6">
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
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            )}
          </div>
          <div className="flex-1 text-center md:text-left">
            <h1 className="text-3xl font-bold mb-2">{profile.firstName} {profile.lastName}</h1>
            <p className="text-blue-100 text-lg mb-4">{profile.educationLevel} • {profile.experienceLevel}</p>
          </div>
        </div>
      </div>

      {/* Profile Details */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-8">
          {/* Personal Information */}
          <div className="bg-white shadow-lg rounded-xl overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <p className="text-sm text-gray-500">Email Address</p>
                  <p className="font-medium">{profile.email}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Phone Number</p>
                  <p className="font-medium">{profile.phone}</p>
                </div>
                <div className="md:col-span-2">
                  <p className="text-sm text-gray-500">Address</p>
                  <p className="font-medium">{profile.address}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Nationality</p>
                  <p className="font-medium">{profile.nationality}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Gender</p>
                  <p className="font-medium">{profile.gender}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Education Level</p>
                  <p className="font-medium">{profile.educationLevel}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Experience Level</p>
                  <p className="font-medium">{profile.experienceLevel}</p>
                </div>
              </div>
            </div>
          </div>
          
          {/* Resume */}
          <div className="bg-white shadow-lg rounded-xl overflow-hidden">
            <div className="px-6 py-4 bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-blue-900">Resume</h3>
              <p className="text-sm text-blue-700 mt-1">Applicant's professional document</p>
            </div>
            <div className="p-6">
              {profile.resume ? (
                <div className="space-y-4">
                  <iframe
                    src={`/api/jobseeker/resume/${jobSeekerAccountId}`}
                    className="w-full h-96 border border-gray-300 rounded-lg"
                    title="Resume Preview"
                  ></iframe>
                  <div className="flex justify-end">
                    <a
                      href={`/api/jobseeker/resume/${jobSeekerAccountId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      Download Resume
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center p-8 border border-dashed border-gray-300 rounded-lg bg-gray-50">
                  <svg className="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-gray-900 text-lg">No Resume Available</p>
                  <p className="text-sm text-gray-500 mt-2">This applicant has not uploaded a resume.</p>
                </div>
              )}
            </div>
          </div>
        </div>
        
        {/* Right Column - Job Preferences */}
        <div className="lg:col-span-1">
          <div className="bg-white shadow-lg rounded-xl overflow-hidden sticky top-6">
            <div className="px-6 py-4 bg-gradient-to-r from-green-50 to-green-100 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-green-900">Job Preferences</h3>
              <p className="text-sm text-green-700 mt-1">Applicant's selected job fields</p>
            </div>
            <div className="p-6">
              {jobPreferences.length > 0 ? (
                <div className="space-y-4">
                  {jobPreferences.map((pref, index) => (
                    <div key={index} className="border border-green-200 rounded-lg p-3 bg-green-50">
                      <h4 className="text-sm font-semibold text-green-900">{pref.category_name}</h4>
                      <p className="text-xs text-green-600">{pref.field_name}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center p-4 border border-dashed border-gray-300 rounded-lg">
                  <svg className="mx-auto h-12 w-12 text-gray-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                  <p className="text-sm text-gray-600">No job preferences set</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
