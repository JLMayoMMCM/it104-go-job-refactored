import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase';

export async function GET(request) {
  try {
    const { pathname } = new URL(request.url);
    const jobId = pathname.split('/').pop();

    if (!jobId) {
      return NextResponse.json({ success: false, error: 'Job ID is required' }, { status: 400 });
    }

    const supabase = createClient();

    // Fetch job details
    const { data: jobData, error: jobError } = await supabase
      .from('job')
      .select(`
        job_id,
        job_name,
        job_description,
        job_requirements,
        job_benefits,
        job_location,
        job_salary,
        job_posted_date,
        job_closing_date,
        job_is_active,
        company:company_id (
          company_id,
          company_name,
          company_logo,
          company_description
        ),
        job_type:job_type_id (
          job_type_name
        ),
        experience_level:job_experience_level_id (
          experience_level_name
        ),
        job_category_list (
          job_category:job_category_id (
            job_category_name,
            category_field:category_field_id (
              category_field_id,
              category_field_name
            )
          )
        )
      `)
      .eq('job_id', jobId)
      .single();

    if (jobError || !jobData) {
      console.error('Job fetch error:', jobError);
      return NextResponse.json({ success: false, error: 'Job not found' }, { status: 404 });
    }

    // Get company rating
    let companyRating = 0;
    if (jobData.company?.company_id) {
      const { data: ratingsData, error: ratingsError } = await supabase
        .from('company_ratings')
        .select('rating')
        .eq('company_id', jobData.company.company_id);
        
      if (!ratingsError && ratingsData && ratingsData.length > 0) {
        // Calculate average rating
        const sum = ratingsData.reduce((acc, item) => acc + item.rating, 0);
        companyRating = parseFloat((sum / ratingsData.length).toFixed(1));
      }
    }

    // Calculate days since posted
    const postedDate = new Date(jobData.job_posted_date);
    const now = new Date();
    const daysDiff = Math.floor((now - postedDate) / (1000 * 60 * 60 * 24));
    let postedAgo;
    if (daysDiff === 0) {
      postedAgo = 'Today';
    } else if (daysDiff === 1) {
      postedAgo = '1 day ago';
    } else if (daysDiff < 7) {
      postedAgo = `${daysDiff} days ago`;
    } else {
      const weeksDiff = Math.floor(daysDiff / 7);
      postedAgo = weeksDiff === 1 ? '1 week ago' : `${weeksDiff} weeks ago`;
    }

    // Build categories array
    const categories = (jobData.job_category_list || [])
      .map(jcl => {
        const cat = jcl.job_category;
        return cat
          ? {
              name: cat.job_category_name || 'Not specified',
              field: cat.category_field?.category_field_name || 'Not specified'
            }
          : null;
      })
      .filter(Boolean);

    const formattedJob = {
      id: jobData.job_id,
      title: jobData.job_name,
      company: jobData.company?.company_name || 'Unknown Company',
      companyId: jobData.company?.company_id || null,
      companyLogo: jobData.company?.company_logo || '/Assets/Logo.png',
      companyDescription: jobData.company?.company_description || 'No company description available.',
      companyRating: companyRating,
      location: jobData.job_location || 'Not specified',
      jobType: jobData.job_type?.job_type_name || 'Not specified',
      salary: jobData.job_salary || 'Not specified',
      postedDate: jobData.job_posted_date,
      posted: postedAgo,
      description: jobData.job_description || 'No description provided.',
      requirements: jobData.job_requirements || 'No specific requirements listed.',
      qualifications: 'No specific qualifications listed.',
      benefits: jobData.job_benefits || 'No specific benefits listed.',
      experienceLevel: jobData.experience_level?.experience_level_name || 'Not specified',
      categoryName: jobData.job_category_list?.[0]?.job_category?.job_category_name || 'Not specified',
      field: jobData.job_category_list?.[0]?.job_category?.category_field?.category_field_name || 'Not specified',
      categories // <-- new array of all categories/fields
    };

    return NextResponse.json({
      success: true,
      data: formattedJob
    });

  } catch (error) {
    console.error('Unexpected error fetching job details:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
} 