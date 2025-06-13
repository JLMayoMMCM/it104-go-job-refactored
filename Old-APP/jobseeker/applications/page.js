'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';

export default function ApplicationsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [applications, setApplications] = useState([]);
  const [filteredApplications, setFilteredApplications] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

  useEffect(() => {
    filterApplications();
  }, [applications, filter]);

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
        if (!userData.isJobSeeker) {
          router.push('/employee/dashboard');
          return;
        }
        setUser(userData);
        await loadApplications(token);
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
      const response = await fetch('/api/jobseeker/applications', {
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

  const filterApplications = () => {
    let filtered = applications;

    if (filter !== 'all') {
      filtered = applications.filter(app => app.request_status === filter);
    }

    setFilteredApplications(filtered);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'accepted': return 'bg-green-100 text-green-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen text-lg">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={user} />
      
      <main className="p-8 max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">My Applications</h2>
          
          {/* Filter Buttons */}
          <div className="bg-white p-4 rounded-lg shadow-md mb-6">
            <div className="flex gap-2 flex-wrap">
              <button
                onClick={() => setFilter('all')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                All ({applications.length})
              </button>
              <button
                onClick={() => setFilter('pending')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'pending' ? 'bg-yellow-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Pending ({applications.filter(app => app.request_status === 'pending').length})
              </button>
              <button
                onClick={() => setFilter('accepted')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'accepted' ? 'bg-green-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Accepted ({applications.filter(app => app.request_status === 'accepted').length})
              </button>
              <button
                onClick={() => setFilter('rejected')}
                className={`px-4 py-2 rounded-lg transition-colors ${
                  filter === 'rejected' ? 'bg-red-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                Rejected ({applications.filter(app => app.request_status === 'rejected').length})
              </button>
            </div>
          </div>
        </div>

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-6xl mb-4">📋</div>
            <p className="text-gray-600 text-lg">
              {filter === 'all' ? 'No applications yet.' : `No ${filter} applications found.`}
            </p>
            <p className="text-gray-500 mt-2">
              {filter === 'all' ? 'Start applying to jobs!' : 'Try changing the filter.'}
            </p>
            <button
              onClick={() => router.push('/jobs')}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Browse Jobs
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map(application => (
              <div key={application.request_id} className="bg-white rounded-lg shadow-md p-6">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-start gap-4">
                      {application.company_logo && (
                        <img 
                          src={`data:image/jpeg;base64,${application.company_logo}`} 
                          alt="Company Logo" 
                          className="w-12 h-12 object-contain rounded"
                        />
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900">{application.job_name}</h3>
                        <p className="text-gray-600">{application.company_name}</p>
                        <p className="text-sm text-gray-500">{application.job_location}</p>
                        <p className="text-sm text-gray-500">{application.job_type_name}</p>
                        {application.job_salary && (
                          <p className="text-green-600 font-medium">₱{parseFloat(application.job_salary).toLocaleString()}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-right">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(application.request_status)}`}>
                      {application.request_status.charAt(0).toUpperCase() + application.request_status.slice(1)}
                    </span>
                    <p className="text-sm text-gray-500 mt-1">
                      Applied: {new Date(application.request_date).toLocaleDateString()}
                    </p>
                  </div>
                </div>

                {application.cover_letter && (
                  <div className="mb-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Your Cover Letter:</h4>
                    <p className="text-gray-700 text-sm">{application.cover_letter}</p>
                  </div>
                )}

                {application.employee_response && (
                  <div className="mb-4 p-4 bg-blue-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Company Response:</h4>
                    <p className="text-gray-700 text-sm">{application.employee_response}</p>
                    <p className="text-xs text-gray-500 mt-2">
                      Responded: {new Date(application.response_date).toLocaleDateString()}
                    </p>
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/jobs/${application.job_id}`)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded text-sm transition-colors"
                  >
                    View Job
                  </button>
                  {application.request_status === 'accepted' && (
                    <div className="bg-green-100 text-green-800 px-4 py-2 rounded text-sm font-medium">
                      🎉 Congratulations!
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
