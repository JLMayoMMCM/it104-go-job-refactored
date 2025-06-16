import { NextResponse } from 'next/server';
import { supabase } from '@/app/lib/supabase';

export async function POST(request, { params }) {
  try {
    const companyId = params.companyId;
    const body = await request.json();
    const { accountId } = body;

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

    // Check if company exists
    const { data: companyData, error: companyError } = await supabase
      .from('company')
      .select('company_id, company_name')
      .eq('company_id', companyId)
      .single();

    if (companyError || !companyData) {
      return NextResponse.json({ error: 'Company not found' }, { status: 404 });
    }

    // Check if already following
    const { data: existingFollow } = await supabase
      .from('followed_companies')
      .select('follow_id')
      .eq('company_id', companyId)
      .eq('job_seeker_id', jobSeekerId)
      .single();

    if (existingFollow) {
      return NextResponse.json({ error: 'Already following this company' }, { status: 400 });
    }

    // Add follow record
    const { data: followData, error: followError } = await supabase
      .from('followed_companies')
      .insert({
        company_id: companyId,
        job_seeker_id: jobSeekerId
      })
      .select()
      .single();

    if (followError) {
      console.error('Error following company:', followError);
      return NextResponse.json({ error: 'Failed to follow company' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: `You are now following ${companyData.company_name}`,
      isFollowing: true 
    });

  } catch (error) {
    console.error('Error in follow company:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
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

    // Get company name for response
    const { data: companyData } = await supabase
      .from('company')
      .select('company_name')
      .eq('company_id', companyId)
      .single();

    // Remove follow record
    const { error: unfollowError } = await supabase
      .from('followed_companies')
      .delete()
      .eq('company_id', companyId)
      .eq('job_seeker_id', jobSeekerId);

    if (unfollowError) {
      console.error('Error unfollowing company:', unfollowError);
      return NextResponse.json({ error: 'Failed to unfollow company' }, { status: 500 });
    }

    return NextResponse.json({ 
      message: `You have unfollowed ${companyData?.company_name || 'the company'}`,
      isFollowing: false 
    });

  } catch (error) {
    console.error('Error in unfollow company:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
