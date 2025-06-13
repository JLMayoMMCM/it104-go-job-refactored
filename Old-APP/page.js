'use client';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import './landing.css';

export default function Home() {
  const router = useRouter();

  useEffect(() => {
    // Ensure router is available before using it
    if (!router) {
      console.error('Router not available');
      return;
    }
  }, [router]);

  const handleLogin = () => {
    try {
      if (router && router.push) {
        router.push('/Login');
      } else {
        console.error('Router push method not available');
      }
    } catch (error) {
      console.error('Error navigating to login:', error);
    }
  };

  const handleBrowseJobs = () => {
    try {
      console.log('Browsing jobs as guest');
      if (router && router.push) {
        router.push('/jobs');
      } else {
        console.error('Router push method not available');
      }
    } catch (error) {
      console.error('Error navigating to jobs:', error);
    }
  };
  return (
    <div className="landing-container">      <div className="landing-content">
        <img src="/Assets/Logo.png" alt="GO JOB" className="landing-title" />
        <p className="landing-subtitle">Find Your Perfect Career Match</p>
        
        <div className="landing-buttons">
          <button 
            className="browse-button"
            onClick={handleBrowseJobs}
          >
            Browse Jobs
          </button>
          
          <button 
            className="login-button"
            onClick={handleLogin}
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
}
