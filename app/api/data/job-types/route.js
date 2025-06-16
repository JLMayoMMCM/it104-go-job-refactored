import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request) {
  try {
    const { data: jobTypes, error } = await supabase
      .from('job_type')
      .select('job_type_id, job_type_name')
      .order('job_type_id', { ascending: true });

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json({ error: 'Failed to fetch job types' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: jobTypes
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
