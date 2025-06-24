import { NextResponse } from 'next/server';
import { createClient } from '@/app/lib/supabase';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const accountId = searchParams.get('accountId');

  if (!accountId) {
    return NextResponse.json({ success: false, error: 'Account ID is required' }, { status: 400 });
  }

  const supabase = createClient();

  try {
    const { data: jobSeekerData, error: jobSeekerError } = await supabase
      .from('job_seeker')
      .select('job_seeker_id')
      .eq('account_id', accountId)
      .single();

    if (jobSeekerError) throw new Error('Job seeker not found.');

    const { data: followedData, error: followedError } = await supabase
      .from('followed_companies')
      .select(`
        company:company_id (
          company_id,
          company_name,
          company_logo,
          address (
            city_name,
            barangay_name
          )
        )
      `)
      .eq('job_seeker_id', jobSeekerData.job_seeker_id);

    if (followedError) throw followedError;

    const formattedData = followedData.map(item => ({
      id: item.company.company_id,
      name: item.company.company_name,
      logo: item.company.company_logo ? Buffer.from(item.company.company_logo).toString('base64') : null,
      location: [item.company.address?.city_name, item.company.address?.barangay_name].filter(Boolean).join(', ')
    }));

    return NextResponse.json({ success: true, data: formattedData });

  } catch (error) {
    return NextResponse.json({ success: false, error: 'Internal server error: ' + error.message }, { status: 500 });
  }
} 