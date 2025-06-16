import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function POST(request, { params }) {
  try {
    const companyId = params.companyId;
    const body = await request.json();
    const { accountId, rating, reviewText } = body;

    if (!accountId) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    if (!rating || rating < 1 || rating > 5) {
      return NextResponse.json({ error: 'Rating must be between 1 and 5' }, { status: 400 });
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

    // Check if company exists
    const { data: companyData, error: companyError } = await supabase
      .from('company')
      .select('company_id, company_name')
      .eq('company_id', companyId)
      .single();

    if (companyError || !companyData) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check if user has already rated this company
    const { data: existingRating } = await supabase
      .from('company_ratings')
      .select('rating_id')
      .eq('company_id', companyId)
      .eq('job_seeker_id', jobSeekerId)
      .single();

    let ratingData;
    let ratingError;

    if (existingRating) {
      // Update existing rating
      const updateData = {
        rating: rating,
        rating_date: new Date().toISOString()
      };
      
      if (reviewText !== undefined) {
        updateData.review_text = reviewText;
      }

      const result = await supabase
        .from('company_ratings')
        .update(updateData)
        .eq('company_id', companyId)
        .eq('job_seeker_id', jobSeekerId)
        .select()
        .single();
      
      ratingData = result.data;
      ratingError = result.error;
    } else {
      // Insert new rating
      const insertData = {
        company_id: companyId,
        job_seeker_id: jobSeekerId,
        rating: rating
      };
      
      if (reviewText !== undefined) {
        insertData.review_text = reviewText;
      }

      const result = await supabase
        .from('company_ratings')
        .insert(insertData)
        .select()
        .single();
      
      ratingData = result.data;
      ratingError = result.error;
    }

    if (ratingError) {
      console.error('Error saving rating:', ratingError);
      return NextResponse.json({ error: 'Failed to save rating' }, { status: 500 });
    }

    // Calculate new average rating for the company
    const { data: allRatings, error: ratingsError } = await supabase
      .from('company_ratings')
      .select('rating')
      .eq('company_id', companyId);

    if (!ratingsError && allRatings) {
      const totalRatings = allRatings.length;
      const sumRatings = allRatings.reduce((sum, r) => sum + r.rating, 0);
      const averageRating = totalRatings > 0 ? (sumRatings / totalRatings) : 0;

      // Update company's average rating
      await supabase
        .from('company')
        .update({ company_rating: averageRating.toFixed(2) })
        .eq('company_id', companyId);
    }

    return NextResponse.json({ 
      message: `Thank you for rating ${companyData.company_name}`,
      rating: rating,
      userRating: rating
    });

  } catch (error) {
    console.error('Error in rate company:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

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

    // Get user's rating for this company
    const { data: ratingData, error: ratingError } = await supabase
      .from('company_ratings')
      .select('rating, review_text, rating_date')
      .eq('company_id', companyId)
      .eq('job_seeker_id', jobSeekerId)
      .single();

    if (ratingError && ratingError.code !== 'PGRST116') {
      console.error('Error fetching rating:', ratingError);
      return NextResponse.json({ error: 'Failed to fetch rating' }, { status: 500 });
    }

    return NextResponse.json({ 
      userRating: ratingData?.rating || 0,
      reviewText: ratingData?.review_text || '',
      ratingDate: ratingData?.rating_date || null
    });

  } catch (error) {
    console.error('Error in get rating:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
