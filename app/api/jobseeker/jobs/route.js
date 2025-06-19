import { NextResponse } from 'next/server';
import { createClient } from '../../../lib/supabase';
import { calculateJobMatch, prepareJobSeekerDataForMatching } from '../../../lib/matchingAlgorithm';

async function handleSearchJobs(supabase, filters, accountId) {
  const { page, limit, search, sort, category, jobType, experienceLevel, salaryMin, salaryMax, location, jobSeekerData } = filters;
  
  // Build the query
  let query = supabase
    .from('job')
    .select(`
      job_id,
      job_name,
      job_description,
      job_location,
      job_salary,
      job_posted_date,
      job_closing_date,
      job_is_active,
      job_experience_level_id,
      company:company_id (
        company_name,
        company_rating
      ),
      job_type:job_type_id (
        job_type_name
      ),
      experience_level:job_experience_level_id (
        experience_level_name
      ),
      job_category_list (
        job_category:job_category_id (
          job_category_id,
          job_category_name,
          category_field:category_field_id (
            category_field_id,
            category_field_name
          )
        )
      )
    `, { count: 'exact' })
    .eq('job_is_active', true)
    .gte('job_closing_date', new Date().toISOString().split('T')[0]);

  // Apply search filters
  if (search) {
    query = query.or(`job_name.ilike.%${search}%,job_description.ilike.%${search}%`);
  }

  if (location) {
    query = query.ilike('job_location', `%${location}%`);
  }

  if (jobType) {
    query = query.eq('job_type_id', jobType);
  }

  if (experienceLevel) {
    query = query.eq('job_experience_level_id', experienceLevel);
  }

  if (salaryMin) {
    query = query.gte('job_salary', parseFloat(salaryMin));
  }

  if (salaryMax) {
    query = query.lte('job_salary', parseFloat(salaryMax));
  }

  // Apply sorting
  switch (sort) {
    case 'salary_high':
      query = query.order('job_salary', { ascending: false, nullsLast: true });
      break;
    case 'salary_low':
      query = query.order('job_salary', { ascending: true, nullsLast: true });
      break;
    case 'newest':
    default:
      query = query.order('job_posted_date', { ascending: false });
      break;
  }

  // Apply pagination
  const offset = (page - 1) * limit;
  query = query.range(offset, offset + limit - 1);

  const { data: jobs, error: jobsError, count } = await query;

  if (jobsError) {
    console.error('Search jobs error:', jobsError);
    return NextResponse.json({ success: false, error: 'Failed to search jobs' }, { status: 500 });
  }

  // Filter by category if specified (requires separate query due to relationship)
  let filteredJobs = jobs || [];
  if (category) {
    const jobIds = filteredJobs.map(job => job.job_id);
    if (jobIds.length > 0) {
      const { data: categoryFilter, error: catFilterError } = await supabase
        .from('job_category_list')
        .select('job_id')
        .in('job_id', jobIds)
        .eq('job_category.category_field_id', category);
      
      if (!catFilterError) {
        const categoryJobIds = categoryFilter.map(cf => cf.job_id);
        filteredJobs = filteredJobs.filter(job => categoryJobIds.includes(job.job_id));
      }
    }
  }

  // Prepare job seeker data for matching (if available)
  let jobSeekerMatchingData = null;
  if (jobSeekerData && jobSeekerData.job_seeker_id) {
    try {
      jobSeekerMatchingData = await prepareJobSeekerDataForMatching(supabase, accountId, jobSeekerData.job_seeker_id);
    } catch (error) {
      console.error('Error preparing job seeker matching data:', error);
    }
  }

  // Format jobs data with match percentages
  const formattedJobs = filteredJobs?.map(job => {
    // Calculate days since posted
    const postedDate = new Date(job.job_posted_date);
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

    // Calculate match percentage if job seeker data is available
    let matchPercentage = 0;
    if (jobSeekerMatchingData) {
      matchPercentage = calculateJobMatch(jobSeekerMatchingData, job);
    }

    return {
      id: job.job_id,
      jobId: job.job_id, // For compatibility
      title: job.job_name,
      company: job.company?.company_name || 'Unknown Company',
      location: job.job_location || 'Not specified',
      jobType: job.job_type?.job_type_name || 'Full-time',
      type: job.job_type?.job_type_name || 'Full-time', // For compatibility
      salary: job.job_salary || 'Salary not specified',
      rating: job.company?.company_rating || 0.0,
      postedDate: postedAgo,
      posted: postedAgo, // For compatibility
      description: job.job_description?.substring(0, 150) + '...' || 'No description available',
      experienceLevel: job.experience_level?.experience_level_name || 'Not specified',
      category: job.job_category_list?.[0]?.job_category?.job_category_name || 'Not specified',
      field: job.job_category_list?.[0]?.job_category?.category_field?.category_field_name || 'Not specified',
      match: matchPercentage
    };
  }) || [];

  return NextResponse.json({
    success: true,
    data: formattedJobs,
    total: count || 0,
    page,
    totalPages: Math.ceil((count || 0) / limit)
  });
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');
    const type = searchParams.get('type'); // 'recommended', 'recent', or 'search'
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 12;
    const search = searchParams.get('search') || '';
    const sort = searchParams.get('sort') || 'newest';
    const category = searchParams.get('category') || '';
    const jobType = searchParams.get('jobType') || '';
    const experienceLevel = searchParams.get('experienceLevel') || '';
    const salaryMin = searchParams.get('salaryMin') || '';
    const salaryMax = searchParams.get('salaryMax') || '';
    const location = searchParams.get('location') || '';

    if (!accountId) {
      return NextResponse.json({ success: false, error: 'Account ID is required' }, { status: 400 });
    }

    const supabase = createClient();

    // Get jobseeker data to access preferences
    const { data: jobSeekerData, error: jobSeekerError } = await supabase
      .from('job_seeker')
      .select('job_seeker_id, job_seeker_experience_level_id')
      .eq('account_id', accountId)
      .single();

    if (jobSeekerError || !jobSeekerData) {
      return NextResponse.json({ success: false, error: 'Job seeker not found' }, { status: 404 });
    }

    // Handle search/filter functionality
    if (type === 'search' || search || category || jobType || experienceLevel || salaryMin || salaryMax || location) {
      return await handleSearchJobs(supabase, {
        page,
        limit,
        search,
        sort,
        category,
        jobType,
        experienceLevel,
        salaryMin,
        salaryMax,
        location,
        jobSeekerData
      }, accountId);
    }

    if (type === 'recommended') {
      // Prepare job seeker data for enhanced matching
      const jobSeekerMatchingData = await prepareJobSeekerDataForMatching(supabase, accountId, jobSeekerData.job_seeker_id);

      if (!jobSeekerMatchingData || jobSeekerMatchingData.preferredFields.length === 0) {
        // If no preferences, return empty recommended jobs
        return NextResponse.json({
          success: true,
          data: []
        });
      }

      // Get job categories that match user's preferred fields
      const { data: matchingCategories, error: catError } = await supabase
        .from('job_category')
        .select('job_category_id')
        .in('category_field_id', jobSeekerMatchingData.preferredFields);

      if (catError) {
        console.error('Categories fetch error:', catError);
        return NextResponse.json({ success: false, error: 'Failed to fetch categories' }, { status: 500 });
      }

      const categoryIds = matchingCategories?.map(c => c.job_category_id) || [];

      if (categoryIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: []
        });
      }

      // Get jobs that match the categories
      const { data: jobCategoryList, error: jclError } = await supabase
        .from('job_category_list')
        .select('job_id')
        .in('job_category_id', categoryIds);

      if (jclError) {
        console.error('Job category list fetch error:', jclError);
        return NextResponse.json({ success: false, error: 'Failed to fetch job categories' }, { status: 500 });
      }

      const jobIds = [...new Set(jobCategoryList?.map(jcl => jcl.job_id) || [])];

      if (jobIds.length === 0) {
        return NextResponse.json({
          success: true,
          data: []
        });
      }

      // Fetch recommended jobs with experience level information
      const { data: jobs, error: jobsError } = await supabase
        .from('job')
        .select(`
          job_id,
          job_name,
          job_description,
          job_location,
          job_salary,
          job_posted_date,
          job_closing_date,
          job_is_active,
          job_experience_level_id,
          company:company_id (
            company_name
          ),
          job_type:job_type_id (
            job_type_name
          ),
          experience_level:job_experience_level_id (
            experience_level_name
          ),
          job_category_list (
            job_category:job_category_id (
              job_category_id,
              job_category_name,
              category_field:category_field_id (
                category_field_id,
                category_field_name
              )
            )
          )
        `)
        .in('job_id', jobIds)
        .eq('job_is_active', true)
        .gte('job_closing_date', new Date().toISOString().split('T')[0])
        .order('job_posted_date', { ascending: false })
        .limit(20); // Get more jobs to allow for better filtering by match percentage

      if (jobsError) {
        console.error('Jobs fetch error:', jobsError);
        return NextResponse.json({ success: false, error: 'Failed to fetch jobs' }, { status: 500 });
      }

      // Calculate match percentage and format data using enhanced algorithm
      const jobsWithMatches = jobs?.map(job => {
        const matchPercentage = calculateJobMatch(jobSeekerMatchingData, job);

        // Calculate days since posted
        const postedDate = new Date(job.job_posted_date);
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

        return {
          id: job.job_id,
          title: job.job_name,
          company: job.company?.company_name || 'Unknown Company',
          location: job.job_location,
          type: job.job_type?.job_type_name || 'Full-time',
          salary: job.job_salary || 'Salary not specified',
          match: matchPercentage,
          posted: postedAgo,
          description: job.job_description?.substring(0, 150) + '...'
        };
      }) || [];

      // Filter to include jobs with match percentages >= 25% (allowing field matches) and sort by match
      const formattedJobs = jobsWithMatches
        .filter(job => job.match >= 25)
        .sort((a, b) => b.match - a.match)
        .slice(0, limit || 6); // Use provided limit or default to 6

      return NextResponse.json({
        success: true,
        data: formattedJobs
      });

    } else if (type === 'recent') {
      // Get recent job postings from all companies
      const { data: jobs, error: jobsError } = await supabase
        .from('job')
        .select(`
          job_id,
          job_name,
          job_description,
          job_location,
          job_salary,
          job_posted_date,
          job_closing_date,
          job_is_active,
          company:company_id (
            company_name
          ),
          job_type:job_type_id (
            job_type_name
          )
        `)
        .eq('job_is_active', true)
        .gte('job_closing_date', new Date().toISOString().split('T')[0])
        .order('job_posted_date', { ascending: false })
        .limit(6);

      if (jobsError) {
        console.error('Recent jobs fetch error:', jobsError);
        return NextResponse.json({ success: false, error: 'Failed to fetch recent jobs' }, { status: 500 });
      }

      // Format recent jobs data
      const formattedJobs = jobs?.map(job => {
        // Calculate days since posted
        const postedDate = new Date(job.job_posted_date);
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

        return {
          id: job.job_id,
          title: job.job_name,
          company: job.company?.company_name || 'Unknown Company',
          location: job.job_location,
          type: job.job_type?.job_type_name || 'Full-time',
          salary: job.job_salary || 'Salary not specified',
          rating: job.company?.company_rating || 0.0,
          posted: postedAgo,
          description: job.job_description?.substring(0, 150) + '...'
        };
      }) || [];

      return NextResponse.json({
        success: true,
        data: formattedJobs
      });

    } else {
      return NextResponse.json({ success: false, error: 'Invalid type parameter. Use "recommended" or "recent"' }, { status: 400 });
    }

  } catch (error) {
    console.error('Unexpected error fetching jobseeker jobs:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Internal server error: ' + error.message 
    }, { status: 500 });
  }
}
