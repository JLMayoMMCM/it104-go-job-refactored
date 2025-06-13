'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';

export default function EmployeeDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [companyJobs, setCompanyJobs] = useState([]);
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuth = async () => {
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
          await loadEmployeeData(token);
        } else {
          router.push('/Login');
        }
      } catch (error) {
        router.push('/Login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, [router]);

  const loadEmployeeData = async (token) => {
    try {
      // Load company jobs
      const jobsResponse = await fetch('/api/employee/job-history', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (jobsResponse.ok) {
        const jobsData = await jobsResponse.json();
        setCompanyJobs(jobsData);
      }

      // Load statistics
      const statsResponse = await fetch('/api/employee/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Load notification count
      const notificationsResponse = await fetch('/api/employee/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        const unreadCount = notificationsData.filter(n => !n.is_read).length;
        setStats(prev => ({ ...prev, unreadNotifications: unreadCount }));
      }
    } catch (error) {
      console.error('Error loading employee data:', error);
    }
  };

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen text-lg">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={user} />

      <main className="p-8 max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl text-gray-800 mb-2 font-bold">
            Welcome back, {user?.firstName || user?.username || 'User'}!
          </h2>
          <p className="text-gray-600 text-xl">Manage your job postings and applications</p>
        </div>

        <div className="flex flex-col gap-12">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-2xl shadow-md text-center border-l-4 border-blue-600">
              <h3 className="text-gray-600 text-sm mb-4 uppercase tracking-wide font-medium">Active Postings</h3>
              <p className="text-4xl font-bold text-blue-600 my-4">{stats.activeJobs || 0}</p>
              <span className="text-gray-500 text-sm">Currently hiring</span>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-md text-center border-l-4 border-yellow-600">
              <h3 className="text-gray-600 text-sm mb-4 uppercase tracking-wide font-medium">Applications</h3>
              <p className="text-4xl font-bold text-yellow-600 my-4">{stats.pendingApplications || 0}</p>
              <span className="text-gray-500 text-sm">Pending review</span>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-md text-center border-l-4 border-green-600">
              <h3 className="text-gray-600 text-sm mb-4 uppercase tracking-wide font-medium">Positions Filled</h3>
              <p className="text-4xl font-bold text-green-600 my-4">{stats.filledPositions || 0}</p>
              <span className="text-gray-500 text-sm">This month</span>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-md text-center border-l-4 border-purple-600">
              <h3 className="text-gray-600 text-sm mb-4 uppercase tracking-wide font-medium">Total Jobs</h3>
              <p className="text-4xl font-bold text-purple-600 my-4">{companyJobs.length || 0}</p>
              <span className="text-gray-500 text-sm">All time</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-8 rounded-2xl shadow-md">
            <h3 className="text-2xl font-semibold text-gray-800 mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <button
                onClick={() => router.push('/employee/add-job')}
                className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-lg transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="text-3xl mb-2">➕</div>
                <div className="font-semibold">Add New Job</div>
              </button>
              <button
                onClick={() => router.push('/employee/job-requests')}
                className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="text-3xl mb-2">📋</div>
                <div className="font-semibold">Job Requests</div>
                {stats.pendingApplications > 0 && (
                  <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full mt-2 inline-block">
                    {stats.pendingApplications}
                  </div>
                )}
              </button>
              <button
                onClick={() => router.push('/employee/posting-history')}
                className="bg-purple-600 hover:bg-purple-700 text-white p-6 rounded-lg transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="text-3xl mb-2">📝</div>
                <div className="font-semibold">Posting History</div>
              </button>
              <button
                onClick={() => router.push('/employee/notifications')}
                className="bg-yellow-600 hover:bg-yellow-700 text-white p-6 rounded-lg transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="text-3xl mb-2">🔔</div>
                <div className="font-semibold">Notifications</div>
                {stats.unreadNotifications > 0 && (
                  <div className="bg-red-500 text-white text-xs px-2 py-1 rounded-full mt-2 inline-block">
                    {stats.unreadNotifications}
                  </div>
                )}
              </button>
              <button
                onClick={() => router.push('/employee/company')}
                className="bg-indigo-600 hover:bg-indigo-700 text-white p-6 rounded-lg transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="text-3xl mb-2">🏢</div>
                <div className="font-semibold">View Company</div>
              </button>
            </div>
          </div>

          {/* Recent Job Postings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-semibold text-gray-800">Recent Job Postings</h3>
              <button
                onClick={() => router.push('/employee/posting-history')}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                View All Job Postings
              </button>
            </div>
            
            {companyJobs.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-6xl mb-4">📝</div>
                <p className="text-gray-600 text-lg">No job postings yet.</p>
                <p className="text-gray-500 mt-2">Create your first job posting to get started!</p>
                <button
                  onClick={() => router.push('/employee/add-job')}
                  className="mt-4 bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg transition-colors"
                >
                  Add New Job
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {companyJobs.slice(0, 5).map(job => (
                  <div key={job.job_id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-semibold text-gray-900">{job.job_name}</h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        job.job_is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {job.job_is_active ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 mb-2 text-sm text-gray-500">
                      <span>📍 {job.job_location}</span>
                      <span>💼 {job.job_type_name}</span>
                      <span>📅 {new Date(job.job_posted_date).toLocaleDateString()}</span>
                    </div>

                    <p className="text-gray-700 text-sm mb-3">{job.job_description?.substring(0, 120)}...</p>

                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-500">
                        {job.application_count || 0} applications received
                      </span>
                      <div className="flex gap-2">
                        <button
                          onClick={() => router.push(`/jobs/${job.job_id}`)}
                          className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          View
                        </button>
                        <button
                          onClick={() => router.push(`/employee/edit-job/${job.job_id}`)}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => router.push(`/employee/job-requests?job=${job.job_id}`)}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1 rounded text-sm transition-colors"
                        >
                          Applications
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
