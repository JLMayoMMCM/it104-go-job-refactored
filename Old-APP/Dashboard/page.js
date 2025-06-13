'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function Dashboard() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const checkAuthAndRedirect = async () => {
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
          
          // Redirect based on user type
          if (userData.isJobSeeker) {
            router.push('/jobseeker/dashboard');
          } else if (userData.isEmployee) {
            router.push('/employee/dashboard');
          } else {
            // Fallback for unknown user types
            router.push('/Login');
          }
        } else {
          router.push('/Login');
        }
      } catch (error) {
        router.push('/Login');
      } finally {
        setIsLoading(false);
      }
    };

    checkAuthAndRedirect();
  }, [router]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen text-lg">
        Redirecting...
      </div>
    );
  }

  return null; // This component just redirects, so no UI needed
}
