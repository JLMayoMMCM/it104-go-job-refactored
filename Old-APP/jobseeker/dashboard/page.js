'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';
import JobCard from '@/components/JobCard';

export default function JobseekerDashboard() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [recommendedJobs, setRecommendedJobs] = useState([]);
  const [recentJobs, setRecentJobs] = useState([]);
  const [preferences, setPreferences] = useState([]);
  const [stats, setStats] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [hasPreferences, setHasPreferences] = useState(false);

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
          if (!userData.isJobSeeker) {
            router.push('/employee/dashboard');
            return;
          }
          setUser(userData);
          await loadDashboardData(token);
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

  const loadDashboardData = async (token) => {
    try {
      // Load recommended jobs
      const recommendedResponse = await fetch('/api/jobs/recommended?limit=6', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (recommendedResponse.ok) {
        const recommendedData = await recommendedResponse.json();
        setRecommendedJobs(recommendedData.jobs || recommendedData);
        setHasPreferences(recommendedData.hasPreferences);
      }

      // Load recent jobs
      const recentResponse = await fetch('/api/jobs?limit=6&sortBy=newest', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (recentResponse.ok) {
        const recentData = await recentResponse.json();
        setRecentJobs(recentData.jobs || []);
      }

      // Load preferences
      const preferencesResponse = await fetch('/api/job-preferences', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (preferencesResponse.ok) {
        const preferencesData = await preferencesResponse.json();
        setPreferences(preferencesData);
      }

      // Load stats
      const statsResponse = await fetch('/api/jobseeker/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
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
          <p className="text-gray-600 text-xl">Discover your next career opportunity</p>
        </div>

        <div className="flex flex-col gap-12">
          {/* Statistics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-8 rounded-2xl shadow-md text-center border-l-4 border-blue-600">
              <h3 className="text-gray-600 text-sm mb-4 uppercase tracking-wide font-medium">Applications</h3>
              <p className="text-4xl font-bold text-blue-600 my-4">{stats.applications || 0}</p>
              <span className="text-gray-500 text-sm">Total submitted</span>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-md text-center border-l-4 border-yellow-600">
              <h3 className="text-gray-600 text-sm mb-4 uppercase tracking-wide font-medium">Pending</h3>
              <p className="text-4xl font-bold text-yellow-600 my-4">{stats.pending || 0}</p>
              <span className="text-gray-500 text-sm">Under review</span>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-md text-center border-l-4 border-green-600">
              <h3 className="text-gray-600 text-sm mb-4 uppercase tracking-wide font-medium">Accepted</h3>
              <p className="text-4xl font-bold text-green-600 my-4">{stats.accepted || 0}</p>
              <span className="text-gray-500 text-sm">Job offers</span>
            </div>
            <div className="bg-white p-8 rounded-2xl shadow-md text-center border-l-4 border-purple-600">
              <h3 className="text-gray-600 text-sm mb-4 uppercase tracking-wide font-medium">Saved Jobs</h3>
              <p className="text-4xl font-bold text-purple-600 my-4">{stats.savedJobs || 0}</p>
              <span className="text-gray-500 text-sm">Bookmarked</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white p-8 rounded-2xl shadow-md">
            <h3 className="text-2xl font-semibold text-gray-800 mb-6">Quick Actions</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <button
                onClick={() => router.push('/jobs')}
                className="bg-blue-600 hover:bg-blue-700 text-white p-6 rounded-lg transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="text-3xl mb-2">🔍</div>
                <div className="font-semibold">Browse Jobs</div>
              </button>
              <button
                onClick={() => router.push('/jobseeker/applications')}
                className="bg-green-600 hover:bg-green-700 text-white p-6 rounded-lg transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="text-3xl mb-2">📋</div>
                <div className="font-semibold">My Applications</div>
                {stats.pending > 0 && (
                  <div className="bg-yellow-500 text-white text-xs px-2 py-1 rounded-full mt-2 inline-block">
                    {stats.pending}
                  </div>
                )}
              </button>
              <button
                onClick={() => router.push('/jobseeker/saved-jobs')}
                className="bg-purple-600 hover:bg-purple-700 text-white p-6 rounded-lg transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="text-3xl mb-2">💾</div>
                <div className="font-semibold">Saved Jobs</div>
              </button>
              <button
                onClick={() => router.push('/jobseeker/notifications')}
                className="bg-orange-600 hover:bg-orange-700 text-white p-6 rounded-lg transition-all duration-300 hover:transform hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="text-3xl mb-2">🔔</div>
                <div className="font-semibold">Notifications</div>
              </button>
            </div>
          </div>

          {/* Job Preferences Display */}
          {preferences.length > 0 && (
            <div className="bg-white p-8 rounded-2xl shadow-md">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-2xl font-semibold text-gray-800">Your Job Preferences</h3>
                <button
                  onClick={() => router.push('/job-preferences')}
                  className="text-blue-600 hover:text-blue-800 font-medium"
                >
                  Update Preferences
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {preferences.map(preference => (
                  <span
                    key={preference.job_category_id}
                    className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium"
                  >
                    {preference.job_category_name}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Recommended Jobs */}
          <div className="bg-white p-8 rounded-2xl shadow-md">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-2xl font-semibold text-gray-800">
                  {hasPreferences ? 'Recommended for You' : 'Latest Job Postings'}
                </h3>
                {hasPreferences && (
                  <p className="text-sm text-gray-600 mt-1">
                    Ordered by: Job category preferences → Field match → Company ratings
                  </p>
                )}
              </div>
              <button
                onClick={() => router.push(hasPreferences ? '/jobs?recommended=true' : '/jobs')}
                className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg cursor-pointer font-medium transition-all duration-300"
              >
                {hasPreferences ? 'View All Recommendations' : 'Browse All Jobs'}
              </button>
            </div>
            
            {recommendedJobs.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">🎯</div>
                {hasPreferences ? (
                  <>
                    <p className="text-gray-600 mb-8">No job recommendations found matching your preferences.</p>
                    <div className="flex gap-4 justify-center">
                      <button
                        onClick={() => router.push('/profile')}
                        className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg cursor-pointer font-medium transition-all duration-300"
                      >
                        Update Preferences
                      </button>
                      <button
                        onClick={() => router.push('/jobs')}
                        className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg cursor-pointer font-medium transition-all duration-300"
                      >
                        Browse All Jobs
                      </button>
                    </div>
                  </>
                ) : (
                  <>
                    <p className="text-gray-600 mb-8">Set your job preferences to get personalized job recommendations!</p>
                    <button
                      onClick={() => router.push('/profile')}
                      className="bg-blue-600 hover:bg-blue-700 text-white py-3 px-6 rounded-lg cursor-pointer font-medium transition-all duration-300"
                    >
                      Set Job Preferences
                    </button>
                  </>
                )}
              </div>
            ) : (
              <>
                {hasPreferences && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
                    <div className="flex items-center text-sm text-blue-800">
                      <span className="mr-2">💡</span>
                      <span>Jobs are ordered by your category preferences, then field similarity, then company ratings</span>
                    </div>
                  </div>
                )}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {recommendedJobs.map(job => (
                    <JobCard key={job.job_id} job={job} showPreferenceMatch={hasPreferences} />
                  ))}
                </div>
              </>
            )}
          </div>

          {/* Recent Job Postings */}
          <div className="bg-white p-8 rounded-2xl shadow-md">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-2xl font-semibold text-gray-800">Latest Job Postings</h3>
              <button
                onClick={() => router.push('/jobs')}
                className="bg-green-600 hover:bg-green-700 text-white py-3 px-6 rounded-lg cursor-pointer font-medium transition-all duration-300"
              >
                Browse All Jobs
              </button>
            </div>
            
            {recentJobs.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">📄</div>
                <p className="text-gray-600">No recent job postings available.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {recentJobs.map(job => (
                  <JobCard key={job.job_id} job={job} />
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
