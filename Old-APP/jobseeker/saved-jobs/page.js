'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';

export default function SavedJobsPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [savedJobs, setSavedJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    checkAuthAndLoadData();
  }, []);

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
        await loadSavedJobs(token);
      } else {
        router.push('/Login');
      }
    } catch (error) {
      router.push('/Login');
    } finally {
      setIsLoading(false);
    }
  };

  const loadSavedJobs = async (token) => {
    try {
      const response = await fetch('/api/jobseeker/saved-jobs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setSavedJobs(data);
      }
    } catch (error) {
      console.error('Error loading saved jobs:', error);
      setError('Failed to load saved jobs');
    }
  };

  const handleUnsaveJob = async (jobId) => {
    try {
      const token = localStorage.getItem('authToken');
      const response = await fetch('/api/jobs/save', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ jobId })
      });

      if (response.ok) {
        setSavedJobs(savedJobs.filter(job => job.job_id !== jobId));
      } else {
        setError('Failed to remove job from saved jobs');
      }
    } catch (error) {
      setError('Network error. Please try again.');
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
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Saved Jobs</h2>
          
          {error && (
            <div className="bg-red-100 text-red-800 p-3 rounded-md mb-4 border border-red-200">
              {error}
            </div>
          )}
        </div>

        {/* Saved Jobs List */}
        {savedJobs.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <div className="text-6xl mb-4">❤️</div>
            <p className="text-gray-600 text-lg">No saved jobs yet.</p>
            <p className="text-gray-500 mt-2">Save jobs you're interested in to view them later!</p>
            <button
              onClick={() => router.push('/jobs')}
              className="mt-4 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg transition-colors"
            >
              Browse Jobs
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {savedJobs.map(job => (
              <div key={job.saved_job_id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    {job.company_logo && (
                      <img 
                        src={`data:image/jpeg;base64,${job.company_logo}`} 
                        alt="Company Logo" 
                        className="w-12 h-12 object-contain mb-3"
                      />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{job.job_name}</h3>
                    <p className="text-gray-600 mb-1">{job.company_name}</p>
                    <p className="text-sm text-gray-500 mb-2">{job.job_location}</p>
                    <p className="text-sm text-gray-500 mb-2">{job.job_type_name}</p>
                    
                    {job.job_salary && (
                      <p className="text-green-600 font-medium mb-3">
                        ₱{parseFloat(job.job_salary).toLocaleString()}
                      </p>
                    )}
                  </div>
                  
                  <button
                    onClick={() => handleUnsaveJob(job.job_id)}
                    className="text-red-500 hover:text-red-700 p-1"
                    title="Remove from saved"
                  >
                    ❤️
                  </button>
                </div>

                <div className="mb-4">
                  <p className="text-gray-700 text-sm line-clamp-3">
                    {job.job_description?.substring(0, 150)}...
                  </p>
                </div>

                <div className="flex justify-between items-center text-xs text-gray-500 mb-4">
                  <span>Posted: {new Date(job.job_posted_date).toLocaleDateString()}</span>
                  <span>Saved: {new Date(job.saved_date).toLocaleDateString()}</span>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => router.push(`/jobs/${job.job_id}`)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2 px-4 rounded text-sm transition-colors"
                  >
                    View Details
                  </button>
                  
                  {!job.has_applied && job.job_is_active ? (
                    <button
                      onClick={() => router.push(`/jobs/${job.job_id}`)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white py-2 px-4 rounded text-sm transition-colors"
                    >
                      Apply Now
                    </button>
                  ) : job.has_applied ? (
                    <div className="flex-1 bg-gray-100 text-gray-600 py-2 px-4 rounded text-sm text-center">
                      Applied
                    </div>
                  ) : (
                    <div className="flex-1 bg-red-100 text-red-600 py-2 px-4 rounded text-sm text-center">
                      Closed
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
