'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import ApplicantProfileModal from '@/components/ApplicantProfileModal';

export default function JobRequestsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [selectedJob, setSelectedJob] = useState('all');  const [jobs, setJobs] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedApplicantId, setSelectedApplicantId] = useState(null);

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [applications, filter, selectedJob]);

  const checkAuthAndLoadData = async () => {
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
        if (!userData.isEmployee) {
          router.push('/jobseeker/dashboard');
          return;
        }
        setUser(userData);
        await Promise.all([loadApplications(token), loadJobs(token)]);
      } else {
        router.push('/Login');
      }
    } catch (error) {
      router.push('/Login');
    } finally {
      setIsLoading(false);
    }
  };

  const loadApplications = async (token) => {
    try {
      const response = await fetch('/api/employee/applications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setApplications(data);
      }
    } catch (error) {
      console.error('Error loading applications:', error);
    }
  };

  const loadJobs = async (token) => {
    try {
      const response = await fetch('/api/employee/job-history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setJobs(data);
      }
    } catch (error) {
      console.error('Error loading jobs:', error);
    }
  };

  const filterApplications = () => {
    let filtered = applications;

    if (filter !== 'all') {
      filtered = filtered.filter(app => app.request_status === filter);
    }

    if (selectedJob !== 'all') {
      filtered = filtered.filter(app => app.job_id === parseInt(selectedJob));
    }

    setFilteredApplications(filtered);
  };

  const handleApplicationResponse = async (requestId, status, response = '') => {
    setError('');
    setSuccess('');

    try {
      const token = localStorage.getItem('authToken');
      const res = await fetch('/api/employee/applications/respond', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ applicationId: requestId, status, response })
      });

      if (res.ok) {
        setSuccess(`Job request ${status} successfully`);
        await loadApplications(token);
      } else {
        const data = await res.json();
        setError(data.error || `Failed to ${status} job request`);
      }    } catch (error) {
      setError('Network error. Please try again.');
    }
  };

  const handleViewProfile = (applicantAccountId) => {
    setSelectedApplicantId(applicantAccountId);
    setShowProfileModal(true);
  };

  const handleCloseProfileModal = () => {
    setShowProfileModal(false);
    setSelectedApplicantId(null);
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen text-lg">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={user} />
      
      <main className="p-8 max-w-7xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Job Applications</h2>
          
          {error && (
            <div className="bg-red-100 text-red-800 p-3 rounded-md mb-4 border border-red-200">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-100 text-green-800 p-3 rounded-md mb-4 border border-green-200">
              {success}
            </div>
          )}

          {/* Filters */}
          <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Status</label>
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Applications</option>
                  <option value="pending">Pending</option>
                  <option value="accepted">Accepted</option>
                  <option value="rejected">Rejected</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Filter by Job</label>
                <select
                  value={selectedJob}
                  onChange={(e) => setSelectedJob(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Jobs</option>
                  {jobs.map(job => (
                    <option key={job.job_id} value={job.job_id}>
                      {job.job_name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-gray-600">No applications found.</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map(application => (
              <div key={application.request_id} className="bg-white rounded-lg shadow-md p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Application Info */}
                  <div className="lg:col-span-2">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{application.job_name}</h3>
                        <p className="text-sm text-gray-600">Applicant: {application.applicant_name}</p>
                        <p className="text-sm text-gray-600">Email: {application.applicant_email}</p>
                      </div>
                      <div className="text-right">
                        <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                          application.request_status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                          application.request_status === 'accepted' ? 'bg-green-100 text-green-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {application.request_status.charAt(0).toUpperCase() + application.request_status.slice(1)}
                        </span>
                        <p className="text-sm text-gray-500 mt-1">
                          Applied: {new Date(application.request_date).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    {application.cover_letter && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Cover Letter:</h4>
                        <p className="text-gray-700 bg-gray-50 p-3 rounded-md">{application.cover_letter}</p>
                      </div>
                    )}

                    {application.employee_response && (
                      <div className="mb-4">
                        <h4 className="font-medium text-gray-900 mb-2">Response:</h4>
                        <p className="text-gray-700 bg-blue-50 p-3 rounded-md">{application.employee_response}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Responded: {new Date(application.response_date).toLocaleDateString()}
                        </p>
                      </div>
                    )}
                  </div>                  {/* Actions */}
                  <div className="lg:col-span-1">
                    <h4 className="font-medium text-gray-900 mb-3">Actions</h4>
                    <div className="space-y-3">
                      <button
                        onClick={() => handleViewProfile(application.applicant_account_id)}
                        className="w-full bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 transition-colors"
                      >
                        View Profile
                      </button>
                      
                      {application.request_status === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApplicationResponse(application.request_id, 'accepted', 'Congratulations! We would like to move forward with your application.')}
                            className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 transition-colors"
                          >
                            Accept Request
                          </button>
                          <button
                            onClick={() => {
                              const response = prompt('Optional: Add a message for the applicant');
                              handleApplicationResponse(application.request_id, 'rejected', response || 'Thank you for your interest. We have decided to move forward with other candidates.');
                            }}
                            className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition-colors"
                          >
                            Reject Request
                          </button>
                        </>
                      )}
                      
                      <button
                        onClick={() => router.push(`/jobs/${application.job_id}`)}
                        className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 transition-colors"
                      >
                        View Job Details
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>        )}
      </main>

      {/* Applicant Profile Modal */}
      {showProfileModal && (
        <ApplicantProfileModal
          applicantId={selectedApplicantId}
          onClose={handleCloseProfileModal}
        />
      )}
    </div>
  );
}
