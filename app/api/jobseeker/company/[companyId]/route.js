import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function GET(request, { params }) {
  try {
    const companyId = params.companyId;
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // Get job seeker ID
    const { data: jobSeekerData, error: jobSeekerError } = await supabase
      .from('job_seeker')
      .select('job_seeker_id')
      .eq('account_id', accountId)
      .single();

    if (jobSeekerError || !jobSeekerData) {
      return NextResponse.json({ error: 'Job seeker not found' }, { status: 404 });
    }

    const jobSeekerId = jobSeekerData.job_seeker_id;

    // Get company details with address
    const { data: companyData, error: companyError } = await supabase
      .from('company')
      .select(`
        *,
        address (
          premise_name,
          street_name,
          barangay_name,
          city_name
        )
      `)
      .eq('company_id', companyId)
      .single();

    if (companyError || !companyData) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Calculate average rating from company_ratings table
    const { data: ratingsData } = await supabase
      .from('company_ratings')
      .select('rating')
      .eq('company_id', companyId);

    let averageRating = 0;
    if (ratingsData && ratingsData.length > 0) {
      const totalRatings = ratingsData.length;
      const sumRatings = ratingsData.reduce((sum, r) => sum + r.rating, 0);
      averageRating = sumRatings / totalRatings;
    }

    // Get follow status
    const { data: followData } = await supabase
      .from('followed_companies')
      .select('follow_id')
      .eq('company_id', companyId)
      .eq('job_seeker_id', jobSeekerId)
      .single();

    const isFollowing = !!followData;

    // Get user's rating for this company
    const { data: ratingData } = await supabase
      .from('company_ratings')
      .select('rating, review_text')
      .eq('company_id', companyId)
      .eq('job_seeker_id', jobSeekerId)
      .single();

    const userRating = ratingData?.rating || 0;

    // Get recent jobs from this company (last 5 active jobs)
    const { data: jobsData, error: jobsError } = await supabase
      .from('job')
      .select(`
        job_id,
        job_name,
        job_location,
        job_salary,
        job_posted_date,
        job_type (job_type_name),
        job_seeker_experience_level (experience_level_name)
      `)
      .eq('company_id', companyId)
      .eq('job_is_active', true)
      .order('job_posted_date', { ascending: false })
      .limit(5);

    const recentJobs = jobsData || [];

    // Format the response
    const location = companyData.address ? 
      `${companyData.address.city_name}${companyData.address.barangay_name ? ', ' + companyData.address.barangay_name : ''}` :
      'Location not specified';

    const company = {
      id: companyData.company_id,
      name: companyData.company_name,
      email: companyData.company_email,
      phone: companyData.company_phone,
      website: companyData.company_website,
      description: companyData.company_description,
      rating: averageRating,
      location: location,
      address: companyData.address,
      logo: companyData.company_logo
    };

    const formattedJobs = recentJobs.map(job => ({
      id: job.job_id,
      title: job.job_name,
      location: job.job_location || location,
      type: job.job_type?.job_type_name || 'Not specified',
      experienceLevel: job.job_seeker_experience_level?.experience_level_name || 'Not specified',
      salary: job.job_salary ? `₱${parseFloat(job.job_salary).toLocaleString()}` : 'Salary not disclosed',
      posted: formatTimeAgo(job.job_posted_date)
    }));

    return NextResponse.json({
      company,
      recentJobs: formattedJobs,
      isFollowing,
      userRating
    });

  } catch (error) {
    console.error('Error fetching company data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

function formatTimeAgo(dateString) {
  const now = new Date();
  const postDate = new Date(dateString);
  const diffInMs = now - postDate;
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));

  if (diffInDays === 0) {
    const diffInHours = Math.floor(diffInMs / (1000 * 60 * 60));
    if (diffInHours === 0) {
      const diffInMinutes = Math.floor(diffInMs / (1000 * 60));
      return diffInMinutes <= 1 ? 'Just now' : `${diffInMinutes} minutes ago`;
    }
    return diffInHours === 1 ? '1 hour ago' : `${diffInHours} hours ago`;
  }
  
  if (diffInDays === 1) return '1 day ago';
  if (diffInDays < 7) return `${diffInDays} days ago`;
  if (diffInDays < 30) {
    const weeks = Math.floor(diffInDays / 7);
    return weeks === 1 ? '1 week ago' : `${weeks} weeks ago`;
  }
  
  const months = Math.floor(diffInDays / 30);
  return months === 1 ? '1 month ago' : `${months} months ago`;
}
