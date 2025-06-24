'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function FollowedCompaniesPage() {
  const [followedCompanies, setFollowedCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const accountId = localStorage.getItem('accountId');
    if (!accountId) {
      router.push('/Login');
      return;
    }
    fetchFollowedCompanies(accountId);
  }, [router]);

  const fetchFollowedCompanies = async (accountId) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/jobseeker/followed-companies?accountId=${accountId}`);
      const result = await response.json();
      if (!response.ok || !result.success) {
        throw new Error(result.error || 'Failed to fetch followed companies.');
      }
      setFollowedCompanies(result.data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center py-10">Loading followed companies...</div>;
  if (error) return <div className="text-center py-10 text-red-500">Error: {error}</div>;

  return (
    <div className="space-y-6">
      <div className="profile-header p-6">
        <h1 className="text-2xl font-bold text-white">Followed Companies</h1>
        <p className="text-white/80 mt-1">Companies you are following to get updates on their latest job postings.</p>
      </div>

      <div className="card p-4">
        {followedCompanies.length === 0 ? (
          <div className="text-center py-16">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">No Followed Companies</h3>
            <p className="text-[var(--text-light)] mt-2">Start following companies to see them here.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border-color)]">
            {followedCompanies.map(company => (
              <div key={company.id} className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 hover:bg-[var(--light-color)] transition-colors rounded-md">
                <div className="flex items-center gap-4">
                  <img
                    src={company.logo ? `data:image/png;base64,${company.logo}` : '/Assets/Logo.png'}
                    alt={`${company.name} Logo`}
                    className="w-16 h-16 rounded-full object-cover border-2 border-white/50 shadow-sm"
                  />
                  <div>
                    <Link href={`/Dashboard/jobseeker/company/${company.id}`} className="font-bold text-lg text-[var(--foreground)] hover:underline">
                      {company.name}
                    </Link>
                    <p className="text-sm text-[var(--text-light)]">{company.location}</p>
                  </div>
                </div>
                <Link href={`/Dashboard/jobseeker/company/${company.id}`} className="btn btn-primary mt-3 sm:mt-0">
                  View Profile
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 