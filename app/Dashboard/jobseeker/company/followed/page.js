'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Pagination from '../../../../components/Pagination';

export default function FollowedCompaniesPage() {
  const [followedCompanies, setFollowedCompanies] = useState([]);
  const [filteredCompanies, setFilteredCompanies] = useState([]);
  const [displayedCompanies, setDisplayedCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const router = useRouter();
  const companiesPerPage = 10;

  useEffect(() => {
    const accountId = localStorage.getItem('accountId');
    if (!accountId) {
      router.push('/Login');
      return;
    }
    fetchFollowedCompanies(accountId);
  }, [router]);

  useEffect(() => {
    // Filter companies based on search term
    let filtered = followedCompanies;
    if (searchTerm) {
      filtered = followedCompanies.filter(company => 
        company.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        company.location?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    setFilteredCompanies(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  }, [followedCompanies, searchTerm]);

  // Paginate filtered companies
  useEffect(() => {
    const startIndex = (currentPage - 1) * companiesPerPage;
    const endIndex = startIndex + companiesPerPage;
    setDisplayedCompanies(filteredCompanies.slice(startIndex, endIndex));
    setTotalPages(Math.ceil(filteredCompanies.length / companiesPerPage));
  }, [filteredCompanies, currentPage]);

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

  const handlePageChange = (newPage) => {
    setCurrentPage(newPage);
    window.scrollTo(0, 0); // Scroll to top on page change
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--primary-color)]"></div>
      </div>
    );
  }
  
  if (error) return (
    <div className="text-center py-10">
      <div className="text-red-500 bg-red-100 dark:bg-red-900/20 p-4 rounded-lg">
        Error: {error}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="profile-header p-6">
        <h1 className="text-2xl font-bold text-white">Followed Companies</h1>
        <p className="text-white/80 mt-1">Companies you are following to get updates on their latest job postings.</p>
      </div>

      <div className="card p-4">
        {/* Search bar */}
        <div className="mb-4">
          <input
            type="text"
            placeholder="Search companies by name or location..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full p-4 border border-[var(--border-color)] rounded-lg bg-[var(--background)] text-[var(--foreground)] placeholder-[var(--text-light)] focus:outline-none focus:ring-2 focus:ring-[var(--primary-color)] focus:border-transparent transition-all"
          />
        </div>

        {/* Pagination info */}
        <div className="flex justify-between items-center mb-4 text-sm text-[var(--text-light)]">
          <span>
            Page {currentPage} of {totalPages}
          </span>
          <span>
            Showing {displayedCompanies.length} of {filteredCompanies.length} companies
          </span>
        </div>

        {filteredCompanies.length === 0 ? (
          <div className="text-center py-16 bg-[var(--light-color)] dark:bg-[var(--dark-color)] rounded-lg">
            <h3 className="text-lg font-semibold text-[var(--foreground)]">No Followed Companies</h3>
            <p className="text-[var(--text-light)] mt-2">
              {searchTerm ? 'No companies match your search.' : 'Start following companies to see them here.'}
            </p>
          </div>
        ) : (
          <div className="space-y-4 h-[65vh] overflow-y-auto pr-2 scrollbar-hide">
            {displayedCompanies.map(company => (
              <div 
                key={company.id} 
                className="p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-[var(--background)] border border-[var(--border-color)] rounded-lg hover:shadow-lg dark:hover:shadow-[var(--primary-color)]/5 transition-all"
              >
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-full overflow-hidden border-2 border-[var(--border-color)] bg-[var(--light-color)] dark:bg-[var(--dark-color)]">
                    <img
                      src={company.logo ? `data:image/png;base64,${company.logo}` : '/Assets/Logo.png'}
                      alt={`${company.name} Logo`}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <Link 
                      href={`/Dashboard/jobseeker/company/${company.id}`} 
                      className="text-lg font-semibold text-[var(--foreground)] hover:text-[var(--primary-color)] transition-colors"
                    >
                      {company.name}
                    </Link>
                    <p className="text-sm text-[var(--text-light)] mt-1">{company.location}</p>
                  </div>
                </div>
                <Link 
                  href={`/Dashboard/jobseeker/company/${company.id}`} 
                  className="btn btn-primary text-sm px-4 py-2 whitespace-nowrap"
                >
                  View Profile
                </Link>
              </div>
            ))}
          </div>
        )}

        {/* Pagination controls */}
        <Pagination 
          currentPage={currentPage} 
          totalPages={totalPages} 
          onPageChange={handlePageChange}
          containerClassName="mt-6" 
        />
      </div>
    </div>
  );
} 