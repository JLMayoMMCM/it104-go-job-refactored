import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase'; // Correct path to supabase client

export async function GET(request, context) {
  const { companyId } = context.params;
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');

  if (!companyId) {
    return NextResponse.json({ success: false, error: 'Company ID is required' }, { status: 400 });
  }

  const supabase = createClient();
  let jobSeekerId = null;

  if (accountId) {
    const { data: seekerData, error: seekerError } = await supabase
      .from('job_seeker')
      .select('job_seeker_id')
      .eq('account_id', accountId)
      .single();

    if (seekerError) {
      console.warn('Could not fetch job seeker for auth context:', seekerError.message);
    } else {
      jobSeekerId = seekerData.job_seeker_id;
    }
  }

  try {
    const { data: companyData, error: companyError } = await supabase
      .from('company')
      .select(`
        company_id,
        company_name,
        company_email,
        company_phone,
        company_website,
        company_description,
        company_logo,
        address (
          premise_name,
          street_name,
          barangay_name,
          city_name
        )
      `)
      .eq('company_id', companyId)
      .single();

    if (companyError) throw companyError;
    if (!companyData) {
      return NextResponse.json({ success: false, error: 'Company not found' }, { status: 404 });
    }

    const { data: ratingsData, error: ratingsError } = await supabase
      .from('company_ratings')
      .select(`
        rating,
        review_text,
        rating_date,
        job_seeker:job_seeker_id (
          account:account_id (
            account_username,
            account_profile_photo
          )
        )
      `)
      .eq('company_id', companyId)
      .order('rating_date', { ascending: false });

    if (ratingsError) throw ratingsError;

    const { data: jobsData, error: jobsError } = await supabase
      .from('job')
      .select(`
        job_id,
        job_name,
        job_location,
        job_salary,
        job_posted_date,
        job_closing_date,
        job_time,
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
              category_field_name
            )
          )
        )
      `)
      .eq('company_id', companyId)
      .eq('job_is_active', true)
      .gte('job_closing_date', new Date().toISOString())
      .order('job_posted_date', { ascending: false });

    if (jobsError) throw jobsError;

    let isFollowing = false;
    let userRating = null;

    if (jobSeekerId) {
      const { data: followData, error: followError } = await supabase
        .from('followed_companies')
        .select('follow_id')
        .eq('company_id', companyId)
        .eq('job_seeker_id', jobSeekerId)
        .single();
      if (followError) console.warn('Follow check error:', followError.message);
      isFollowing = !!followData;

      const { data: ratingData, error: ratingError } = await supabase
        .from('company_ratings')
        .select('rating, review_text')
        .eq('company_id', companyId)
        .eq('job_seeker_id', jobSeekerId)
        .single();
      if (ratingError) console.warn('User rating check error:', ratingError.message);
      if (ratingData) {
        userRating = {
          rating: ratingData.rating,
          review_text: ratingData.review_text
        };
      }
    }

    const totalRatings = ratingsData?.length || 0;
    const averageRating = totalRatings > 0 
      ? (ratingsData.reduce((sum, r) => sum + r.rating, 0) / totalRatings)
      : 0;

    const locationString = [
      companyData.address?.premise_name,
      companyData.address?.street_name,
      companyData.address?.barangay_name,
      companyData.address?.city_name,
    ].filter(Boolean).join(', ');

    const responseData = {
      ...companyData,
      company_logo: companyData.company_logo ? Buffer.from(companyData.company_logo).toString('base64') : null,
      location: locationString,
      average_rating: averageRating,
      total_ratings: totalRatings,
      reviews: (ratingsData || []).map(r => ({
        rating: r.rating,
        review_text: r.review_text,
        rating_date: r.rating_date,
        author_name: r.job_seeker?.account?.account_username || 'Anonymous',
        author_avatar: r.job_seeker?.account?.account_profile_photo,
      })),
      jobs: (jobsData || []).map(job => ({
        id: job.job_id,
        title: job.job_name,
        location: job.job_location || locationString,
        type: job.job_type?.job_type_name || 'N/A',
        experienceLevel: job.experience_level?.experience_level_name || 'N/A',
        salary: job.job_salary,
        postedDate: job.job_posted_date,
        closingDate: job.job_closing_date,
        jobTime: job.job_time,
        field: job.job_category_list?.[0]?.job_category?.category_field?.category_field_name || 'N/A',
        categories: job.job_category_list?.map(jcl => jcl.job_category?.job_category_name) || [],
      })),
      isFollowing,
      userRating,
    };

    return NextResponse.json({ success: true, data: responseData });

  } catch (error) {
    console.error('Error in /api/jobseeker/company/[companyId]:', error);
    return NextResponse.json({ success: false, error: 'Internal server error: ' + error.message }, { status: 500 });
  }
}
