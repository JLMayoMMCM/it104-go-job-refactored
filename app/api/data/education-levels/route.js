import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET() {
  try {
    const { data: educationLevels, error } = await supabase
      .from('job_seeker_education_level')
      .select('job_seeker_education_level_id, education_level_name')
      .order('job_seeker_education_level_id');

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { message: 'Failed to fetch education levels' },
        { status: 500 }
      );
    }

    return NextResponse.json(educationLevels);
  } catch (error) {
    console.error('Error fetching education levels:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
