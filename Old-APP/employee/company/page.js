'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import DashboardHeader from '@/components/DashboardHeader';

export default function CompanyPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [company, setCompany] = useState(null);
  const [employees, setEmployees] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

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
        if (!userData.isEmployee) {
          router.push('/jobseeker/dashboard');
          return;
        }
        setUser(userData);
        await Promise.all([
          loadCompanyData(token),
          loadEmployees(token),
          loadCompanyJobs(token)
        ]);
      } else {
        router.push('/Login');
      }
    } catch (error) {
      router.push('/Login');
    } finally {
      setIsLoading(false);
    }
  };

  const loadCompanyData = async (token) => {
    try {
      const response = await fetch('/api/employee/company', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setCompany(data);
      }
    } catch (error) {
      console.error('Error loading company data:', error);
    }
  };

  const loadEmployees = async (token) => {
    try {
      const response = await fetch('/api/employee/company/employees', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (response.ok) {
        const data = await response.json();
        setEmployees(data);
      }
    } catch (error) {
      console.error('Error loading employees:', error);
    }
  };

  const loadCompanyJobs = async (token) => {
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

  if (isLoading) {
    return <div className="flex justify-center items-center h-screen text-lg">Loading...</div>;
  }

  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50">
        <DashboardHeader user={user} />
        <div className="flex justify-center items-center h-96">
          <p className="text-gray-600">Company information not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardHeader user={user} />
      
      <main className="p-8 max-w-7xl mx-auto">
        {/* Company Header */}
        <div className="bg-white rounded-lg shadow-md p-8 mb-8">
          <div className="flex items-start gap-6">
            <div className="w-24 h-24 bg-gray-200 rounded-lg flex items-center justify-center">
              {company.company_logo ? (
                <img 
                  src={`data:image/jpeg;base64,${company.company_logo}`} 
                  alt="Company Logo" 
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="text-3xl font-bold text-gray-500">
                  {company.company_name?.charAt(0) || 'C'}
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <h1 className="text-3xl font-bold text-gray-900 mb-2">{company.company_name}</h1>
              <p className="text-gray-600 mb-4">{company.company_description}</p>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div>
                  <span className="text-sm font-medium text-gray-500">Email</span>
                  <p className="text-gray-900">{company.company_email}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Phone</span>
                  <p className="text-gray-900">{company.company_phone || 'Not provided'}</p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Website</span>
                  <p className="text-gray-900">
                    {company.company_website ? (
                      <a 
                        href={company.company_website} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        {company.company_website}
                      </a>
                    ) : (
                      'Not provided'
                    )}
                  </p>
                </div>
                <div>
                  <span className="text-sm font-medium text-gray-500">Rating</span>
                  <p className="text-gray-900">
                    {company.company_rating ? `${company.company_rating}/5.0` : 'Not rated'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Company Address */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Company Address</h2>
          <div className="text-gray-700">
            {company.premise_name && <p>{company.premise_name}</p>}
            {company.street_name && <p>{company.street_name}</p>}
            <p>
              {[company.barangay_name, company.city_name].filter(Boolean).join(', ')}
            </p>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <h3 className="text-2xl font-bold text-blue-600">{employees.length}</h3>
            <p className="text-gray-600">Total Employees</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <h3 className="text-2xl font-bold text-green-600">{jobs.filter(job => job.job_is_active).length}</h3>
            <p className="text-gray-600">Active Job Postings</p>
          </div>
          <div className="bg-white p-6 rounded-lg shadow-md text-center">
            <h3 className="text-2xl font-bold text-purple-600">{jobs.length}</h3>
            <p className="text-gray-600">Total Job Postings</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Employees */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Employees</h2>
            {employees.length === 0 ? (
              <p className="text-gray-600">No employees found.</p>
            ) : (
              <div className="space-y-3">
                {employees.slice(0, 5).map(employee => (
                  <div key={employee.employee_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{employee.full_name}</p>
                      <p className="text-sm text-gray-600">{employee.position_name || 'No position assigned'}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      ID: {employee.employee_id}
                    </span>
                  </div>
                ))}
                {employees.length > 5 && (
                  <p className="text-sm text-gray-500 text-center">
                    And {employees.length - 5} more employees...
                  </p>
                )}
              </div>
            )}
          </div>

          {/* Recent Jobs */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900">Recent Job Postings</h2>
              <button
                onClick={() => router.push('/employee/posting-history')}
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                View All
              </button>
            </div>
            {jobs.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-gray-600 mb-4">No job postings yet.</p>
                <button
                  onClick={() => router.push('/employee/add-job')}
                  className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition-colors"
                >
                  Create First Job
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {jobs.slice(0, 5).map(job => (
                  <div key={job.job_id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{job.job_name}</p>
                      <p className="text-sm text-gray-600">{job.job_location}</p>
                    </div>
                    <div className="text-right">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        job.job_is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {job.job_is_active ? 'Active' : 'Inactive'}
                      </span>
                      <p className="text-xs text-gray-500 mt-1">
                        {job.application_count || 0} applications
                      </p>
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
