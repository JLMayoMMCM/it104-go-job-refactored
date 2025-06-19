'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function JobRequestsPage() {
  const [jobRequests, setJobRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordAction, setPasswordAction] = useState(null);
  const [password, setPassword] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [processingRequest, setProcessingRequest] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedApplicantId, setSelectedApplicantId] = useState(null);
  const [applicantProfile, setApplicantProfile] = useState(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileError, setProfileError] = useState('');
  const router = useRouter();

  useEffect(() => {
    fetchJobRequests();
  }, []);

  const fetchJobRequests = async (statusFilter) => {
    try {
      const accountId = localStorage.getItem('accountId');
      if (!accountId) {
        throw new Error('Account ID not found. Please log in again.');
      }

      const statusMap = {
        'all': null,
        'pending': 2,
        'accepted': 1,
        'rejected': 3
      };
      const statusParam = statusMap[statusFilter] || null;
      const url = `/api/employee/job-requests?accountId=${accountId}${
        statusParam ? `&status=${statusParam}` : ''
      }`;
      
      const response = await fetch(url, { credentials: 'include' });
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch job requests');
      }

      if (data.success) {
        setJobRequests(data.data);
      }
    } catch (error) {
      console.error('Error fetching job requests:', error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRequestAction = (requestId, action) => {
    setPasswordAction({ requestId, action });
    setShowPasswordModal(true);
    setPassword('');
    setPasswordError('');
  };

  const handleViewProfile = async (jobSeekerAccountId) => {
    setSelectedApplicantId(jobSeekerAccountId);
    setShowProfileModal(true);
    setProfileLoading(true);
    setProfileError('');
    setApplicantProfile(null);

    try {
      const employeeAccountId = localStorage.getItem('accountId');
      const response = await fetch(`/api/employee/view-applicant/${jobSeekerAccountId}?employeeAccountId=${employeeAccountId}`);
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Server error (${response.status}): ${errorText}`);
      }
      
      const data = await response.json();
      
      if (data.success) {
        setApplicantProfile({
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
          resume: data.data.account.resume || null,
          jobPreferences: data.data.job_preferences || []
        });
      } else {
        throw new Error(data.error || 'Failed to fetch applicant data');
      }
    } catch (error) {
      console.error('Error fetching applicant data:', error);
      setProfileError(error.message);
    } finally {
      setProfileLoading(false);
    }
  };

  const closeProfileModal = () => {
    setShowProfileModal(false);
    setSelectedApplicantId(null);
    setApplicantProfile(null);
    setProfileError('');
  };

  const confirmAction = async () => {
    if (!password.trim()) {
      setPasswordError('Password is required');
      return;
    }

    setProcessingRequest(true);
    setPasswordError('');

    try {
      const accountId = localStorage.getItem('accountId');
      const response = await fetch(`/api/employee/job-requests/${passwordAction.requestId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          accountId,
          request_status_id: passwordAction.action === 'accepted' ? 1 : 3,
          employee_password: password
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          setPasswordError('Invalid password');
        } else {
          throw new Error(data.error || `Failed to ${passwordAction.action} job request`);
        }
        return;
      }

        if (data.success) {
          // Convert the returned numeric status to frontend format
          const newStatus = data.status === 1 ? 'accepted' : data.status === 3 ? 'rejected' : 'pending';
        
          setJobRequests(jobRequests.map(req => 
            req.request_id === passwordAction.requestId ? { ...req, request_status: newStatus, request_status_id: data.status } : req
          ));
          setShowPasswordModal(false);
          setPasswordAction(null);
          setPassword('');
        }
    } catch (error) {
      console.error(`Error ${passwordAction.action} job request:`, error);
      setError(error.message);
    } finally {
      setProcessingRequest(false);
    }
  };

  const cancelAction = () => {
    setShowPasswordModal(false);
    setPasswordAction(null);
    setPassword('');
    setPasswordError('');
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
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
        <h3 className="text-lg font-medium text-gray-900">Error loading job requests</h3>
        <p className="text-gray-600">{error}</p>
        <button
          onClick={() => {
            setLoading(true);
            fetchJobRequests();
          }}
          className="mt-4 inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Try Again
        </button>
      </div>
    );
  }

  const pendingRequests = jobRequests.filter(req => req.request_status_id === 2);
  const acceptedRequests = jobRequests.filter(req => req.request_status_id === 1);
  const rejectedRequests = jobRequests.filter(req => req.request_status_id === 3);

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Job Applications</h1>
          <p className="text-gray-600">Review and manage candidate applications</p>
        </div>
      </div>

      {/* Pending Requests */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Pending Applications ({pendingRequests.length})</h3>
        </div>
        <div className="p-6">
          {pendingRequests.length > 0 ? (
            <div className="space-y-4">
              {pendingRequests.map(request => (
                <div key={request.request_id} className="border border-yellow-200 rounded-xl p-6 bg-yellow-50 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{request.job_seeker.person.first_name} {request.job_seeker.person.last_name}</h4>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs font-medium rounded-full">Pending</span>
                      </div>
                      <div className="flex items-center space-x-6 text-sm text-gray-500 mb-3">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Applied {formatDate(request.request_date)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>For: {request.job.job_name}</span>
                        </div>
                      </div>
                      {request.cover_letter && (
                        <div className="mt-3 text-sm text-gray-700">
                          <p className="font-medium">Cover Letter:</p>
                          <p className="mt-1">{request.cover_letter}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col space-y-2 ml-4">
                      <button
                        onClick={() => handleViewProfile(request.job_seeker.account_id)}
                        className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                      >
                        View Profile
                      </button>
                      <div className="flex space-x-2">
                        <button
                          onClick={() => handleRequestAction(request.request_id, 'accepted')}
                          className="px-4 py-2 text-sm bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium"
                        >
                          Accept
                        </button>
                        <button
                          onClick={() => handleRequestAction(request.request_id, 'rejected')}
                          className="px-4 py-2 text-sm bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium"
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No pending applications</h3>
              <p className="mt-1 text-gray-500">You don't have any pending job applications at the moment.</p>
            </div>
          )}
        </div>
      </div>

      {/* Accepted Requests */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Accepted Applications ({acceptedRequests.length})</h3>
        </div>
        <div className="p-6">
          {acceptedRequests.length > 0 ? (
            <div className="space-y-4">
              {acceptedRequests.map(request => (
                <div key={request.request_id} className="border border-green-200 rounded-xl p-6 bg-green-50 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{request.job_seeker.person.first_name} {request.job_seeker.person.last_name}</h4>
                        <span className="px-2 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full">Accepted</span>
                      </div>
                      <div className="flex items-center space-x-6 text-sm text-gray-500 mb-3">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Applied {formatDate(request.request_date)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>For: {request.job.job_name}</span>
                        </div>
                      </div>
                      {request.cover_letter && (
                        <div className="mt-3 text-sm text-gray-700">
                          <p className="font-medium">Cover Letter:</p>
                          <p className="mt-1">{request.cover_letter}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col space-y-2 ml-4">
                      <button
                        onClick={() => handleViewProfile(request.job_seeker.account_id)}
                        className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h3 className="mt-2 text-lg font-medium text-gray-900">No accepted applications</h3>
              <p className="mt-1 text-gray-500">You haven't accepted any job applications yet.</p>
            </div>
          )}
        </div>
      </div>      {/* Rejected Requests */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Rejected Applications ({rejectedRequests.length})</h3>
        </div>
        <div className="p-6">
          {rejectedRequests.length > 0 ? (
            <div className="space-y-4">
              {rejectedRequests.map(request => (
                <div key={request.request_id} className="border border-red-200 rounded-xl p-6 bg-red-50 hover:shadow-lg transition-all duration-200">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h4 className="text-lg font-semibold text-gray-900">{request.job_seeker.person.first_name} {request.job_seeker.person.last_name}</h4>
                        <span className="px-2 py-1 bg-red-100 text-red-800 text-xs font-medium rounded-full">Rejected</span>
                      </div>
                      <div className="flex items-center space-x-6 text-sm text-gray-500 mb-3">
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>Applied {formatDate(request.request_date)}</span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                          </svg>
                          <span>For: {request.job.job_name}</span>
                        </div>
                      </div>
                      {request.cover_letter && (
                        <div className="mt-3 text-sm text-gray-700">
                          <p className="font-medium">Cover Letter:</p>
                          <p className="mt-1">{request.cover_letter}</p>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col space-y-2 ml-4">
                      <button
                        onClick={() => handleViewProfile(request.job_seeker.account_id)}
                        className="px-4 py-2 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors font-medium"
                      >
                        View Profile
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <svg className="mx-auto h-12 w-12 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" />
              </svg>              <h3 className="mt-2 text-lg font-medium text-gray-900">No rejected applications</h3>
              <p className="mt-1 text-gray-500">You haven't rejected any job applications yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* Password Confirmation Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center">
          <div className="relative p-8 bg-white w-full max-w-md m-auto rounded-lg shadow-lg">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-yellow-100 mb-4">
                <svg className="h-6 w-6 text-yellow-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.35 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Confirm Action
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                Please enter your password to {passwordAction?.action} this application.
              </p>
              <div className="mb-4">
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      confirmAction();
                    }
                  }}
                />
                {passwordError && (
                  <p className="mt-2 text-sm text-red-600">{passwordError}</p>
                )}
              </div>
              <div className="flex space-x-4">
                <button
                  onClick={cancelAction}
                  disabled={processingRequest}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction}
                  disabled={processingRequest}
                  className={`flex-1 px-4 py-2 text-sm font-medium text-white rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 ${
                    passwordAction?.action === 'accepted'
                      ? 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
                      : 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
                  }`}
                >
                  {processingRequest ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    `${passwordAction?.action === 'accepted' ? 'Accept' : 'Deny'} Application`
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Applicant Profile Modal */}
      {showProfileModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50 flex items-center justify-center p-4">
          <div className="relative bg-white w-full max-w-4xl mx-auto rounded-lg shadow-lg max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 border-b border-gray-200">
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">
                      {profileLoading ? 'Loading Profile...' : applicantProfile ? `${applicantProfile.firstName} ${applicantProfile.lastName}` : 'Applicant Profile'}
                    </h3>
                    <p className="text-blue-100 text-sm">View applicant details</p>
                  </div>
                </div>
                <button
                  onClick={closeProfileModal}
                  className="text-white hover:text-gray-200 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="p-6">
              {profileLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                </div>
              ) : profileError ? (
                <div className="text-center py-12">
                  <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                    <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">Error Loading Profile</h3>
                  <p className="text-gray-600 mb-4">{profileError}</p>
                  <button
                    onClick={() => handleViewProfile(selectedApplicantId)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Try Again
                  </button>
                </div>
              ) : applicantProfile ? (
                <div className="space-y-8">
                  {/* Profile Header */}
                  <div className="flex flex-col md:flex-row items-center md:items-start space-y-4 md:space-y-0 md:space-x-6">
                    <div className="w-24 h-24 bg-gray-200 rounded-full flex items-center justify-center">
                      {applicantProfile.profilePhoto ? (
                        <img
                          src={applicantProfile.profilePhoto}
                          alt="Profile"
                          className="w-full h-full rounded-full object-cover"
                          onError={(e) => {
                            e.target.onerror = null;
                            e.target.src = '/Assets/Logo.png';
                          }}
                        />
                      ) : (
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                      )}
                    </div>
                    <div className="flex-1 text-center md:text-left">
                      <h2 className="text-2xl font-bold text-gray-900">{applicantProfile.firstName} {applicantProfile.lastName}</h2>
                      <p className="text-gray-600 text-lg">{applicantProfile.educationLevel} • {applicantProfile.experienceLevel}</p>
                    </div>
                  </div>

                  {/* Personal Information */}
                  <div className="bg-gray-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-4">Personal Information</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <p className="text-sm text-gray-500">Email Address</p>
                        <p className="font-medium">{applicantProfile.email}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Phone Number</p>
                        <p className="font-medium">{applicantProfile.phone}</p>
                      </div>
                      <div className="md:col-span-2">
                        <p className="text-sm text-gray-500">Address</p>
                        <p className="font-medium">{applicantProfile.address}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Nationality</p>
                        <p className="font-medium">{applicantProfile.nationality}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-500">Gender</p>
                        <p className="font-medium">{applicantProfile.gender}</p>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Resume Section */}
                    <div className="lg:col-span-2">
                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Resume</h3>
                        {applicantProfile.resume ? (
                          <div className="space-y-4">
                            <iframe
                              src={`/api/jobseeker/resume/${selectedApplicantId}`}
                              className="w-full h-96 border border-gray-300 rounded-lg"
                              title="Resume Preview"
                            ></iframe>
                            <div className="flex justify-end">
                              <a
                                href={`/api/jobseeker/resume/${selectedApplicantId}`}
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

                    {/* Job Preferences */}
                    <div className="lg:col-span-1">
                      <div className="bg-white border border-gray-200 rounded-xl p-6">
                        <h3 className="text-lg font-semibold text-gray-900 mb-4">Job Preferences</h3>
                        {applicantProfile.jobPreferences.length > 0 ? (
                          <div className="space-y-3">
                            {applicantProfile.jobPreferences.map((pref, index) => (
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
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
