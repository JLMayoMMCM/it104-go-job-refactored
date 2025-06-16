import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function POST(request) {
  try {
    const { accountId, selectedJobCategories, selectedJobFields } = await request.json();

    // Validate required fields
    if (!accountId) {
      return NextResponse.json(
        { message: 'Account ID is required' },
        { status: 400 }
      );
    }

    if (!selectedJobCategories || selectedJobCategories.length === 0) {
      return NextResponse.json(
        { message: 'At least one job category must be selected' },
        { status: 400 }
      );
    }

    // First, verify the account exists and get its type
    const { data: accountInfo, error: accountInfoError } = await supabase
      .from('account')
      .select(`
        account_id,
        account_type_id,
        account_email
      `)
      .eq('account_id', accountId)
      .single();

    if (accountInfoError) {
      console.error('Account info lookup error:', accountInfoError);
      return NextResponse.json(
        { message: 'Account not found' },
        { status: 404 }
      );
    }

    if (!accountInfo) {
      console.error('No account found with accountId:', accountId);
      return NextResponse.json(
        { message: 'Account not found' },
        { status: 404 }
      );
    }

    // Check if this is a jobseeker account (account_type_id should be 2)
    if (accountInfo.account_type_id !== 2) {
      console.error(`Account ${accountId} is not a jobseeker account. Type: ${accountInfo.account_type_id}`);
      return NextResponse.json(
        { message: 'This account is not a jobseeker account' },
        { status: 400 }
      );
    }

    // Now get the job_seeker record
    const { data: jobSeekerData, error: jobSeekerError } = await supabase
      .from('job_seeker')
      .select('job_seeker_id')
      .eq('account_id', accountId)
      .single();

    if (jobSeekerError) {
      console.error('Job seeker lookup error:', jobSeekerError);
      return NextResponse.json(
        { message: 'Jobseeker profile not found. Please complete your registration.' },
        { status: 400 }
      );
    }

    if (!jobSeekerData || !jobSeekerData.job_seeker_id) {
      console.error('No job_seeker record found for accountId:', accountId);
      return NextResponse.json(
        { message: 'Jobseeker profile not found. Please complete your registration.' },
        { status: 400 }
      );
    }

    const jobSeekerId = jobSeekerData.job_seeker_id;

    // Delete existing preferences
    await supabase
      .from('jobseeker_preference')
      .delete()
      .eq('jobseeker_id', jobSeekerId);

    await supabase
      .from('jobseeker_field_preference')
      .delete()
      .eq('jobseeker_id', jobSeekerId);

    // Insert new job category preferences
    if (selectedJobCategories && selectedJobCategories.length > 0) {
      // Validate that all category IDs are valid numbers
      const validCategoryIds = selectedJobCategories
        .map(id => parseInt(id))
        .filter(id => !isNaN(id) && id > 0);

      if (validCategoryIds.length === 0) {
        return NextResponse.json(
          { message: 'Invalid job category IDs provided' },
          { status: 400 }
        );
      }

      const categoryPreferences = validCategoryIds.map(categoryId => ({
        jobseeker_id: jobSeekerId,
        preferred_job_category_id: categoryId
      }));

      const { error: categoryPrefsError } = await supabase
        .from('jobseeker_preference')
        .insert(categoryPreferences);

      if (categoryPrefsError) {
        console.error('Error saving category preferences:', categoryPrefsError);
        return NextResponse.json(
          { message: 'Failed to save job category preferences. Please ensure the selected categories are valid.' },
          { status: 500 }
        );
      }

      // Automatically add job fields based on selected categories
      // Fetch the corresponding job fields for the selected categories
      const { data: categoryFields, error: categoryFieldsError } = await supabase
        .from('job_category')
        .select('category_field_id')
        .in('job_category_id', validCategoryIds);

      if (categoryFieldsError) {
        console.error('Error fetching category fields:', categoryFieldsError);
        return NextResponse.json(
          { message: 'Failed to fetch job field data for selected categories.' },
          { status: 500 }
        );
      }

      const fieldIds = [...new Set(categoryFields.map(cf => cf.category_field_id).filter(id => id))];
      
      if (fieldIds.length > 0) {
        const fieldPreferences = fieldIds.map(fieldId => ({
          jobseeker_id: jobSeekerId,
          preferred_job_field_id: fieldId
        }));

        const { error: fieldPrefsError } = await supabase
          .from('jobseeker_field_preference')
          .insert(fieldPreferences);

        if (fieldPrefsError) {
          console.error('Error saving field preferences:', fieldPrefsError);
          return NextResponse.json(
            { message: 'Failed to save job field preferences. Please ensure the selected fields are valid.' },
            { status: 500 }
          );
        }
      }
    }

    return NextResponse.json({
      message: 'Job preferences saved successfully',
      success: true
    });

  } catch (error) {
    console.error('Preferences save error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    if (!accountId) {
      return NextResponse.json(
        { message: 'Account ID is required' },
        { status: 400 }
      );
    }

    // First, verify the account exists and get its type
    const { data: accountInfo, error: accountInfoError } = await supabase
      .from('account')
      .select(`
        account_id,
        account_type_id,
        account_email
      `)
      .eq('account_id', accountId)
      .single();

    if (accountInfoError) {
      console.error('Account info lookup error:', accountInfoError);
      return NextResponse.json(
        { message: 'Account not found' },
        { status: 404 }
      );
    }

    if (!accountInfo) {
      console.error('No account found with accountId:', accountId);
      return NextResponse.json(
        { message: 'Account not found' },
        { status: 404 }
      );
    }

    // Check if this is a jobseeker account (account_type_id should be 2)
    if (accountInfo.account_type_id !== 2) {
      console.error(`Account ${accountId} is not a jobseeker account. Type: ${accountInfo.account_type_id}`);
      return NextResponse.json(
        { message: 'This account is not a jobseeker account' },
        { status: 400 }
      );
    }

    // Now get the job_seeker record
    const { data: jobSeekerData, error: jobSeekerError } = await supabase
      .from('job_seeker')
      .select('job_seeker_id')
      .eq('account_id', accountId)
      .single();

    if (jobSeekerError) {
      console.error('Job seeker lookup error:', jobSeekerError);
      return NextResponse.json(
        { message: 'Jobseeker profile not found. Please complete your registration.' },
        { status: 400 }
      );
    }

    if (!jobSeekerData || !jobSeekerData.job_seeker_id) {
      console.error('No job_seeker record found for accountId:', accountId);
      return NextResponse.json(
        { message: 'Jobseeker profile not found. Please complete your registration.' },
        { status: 400 }
      );
    }

    const jobSeekerId = jobSeekerData.job_seeker_id;

    // Get current preferences
    const [categoryPrefsResult, fieldPrefsResult] = await Promise.all([
      supabase
        .from('jobseeker_preference')
        .select('preferred_job_category_id')
        .eq('jobseeker_id', jobSeekerId),
      supabase
        .from('jobseeker_field_preference')
        .select('preferred_job_field_id')
        .eq('jobseeker_id', jobSeekerId)
    ]);

    const selectedCategories = categoryPrefsResult.data?.map(pref => pref.preferred_job_category_id) || [];
    const selectedFields = fieldPrefsResult.data?.map(pref => pref.preferred_job_field_id) || [];

    return NextResponse.json({
      success: true,
      data: {
        selectedJobCategories: selectedCategories,
        selectedJobFields: selectedFields,
        hasPreferences: selectedCategories.length > 0
      }
    });

  } catch (error) {
    console.error('Preferences fetch error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
