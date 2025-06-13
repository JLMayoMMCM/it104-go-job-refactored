import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET() {
  try {
    const { data: experienceLevels, error } = await supabase
      .from('job_seeker_experience_level')
      .select('job_seeker_experience_level_id, experience_level_name')
      .order('job_seeker_experience_level_id');

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { message: 'Failed to fetch experience levels' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: experienceLevels
    });
  } catch (error) {
    console.error('Error fetching experience levels:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
