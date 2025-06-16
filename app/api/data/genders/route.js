import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request) {
  try {
    const { data: genders, error } = await supabase
      .from('gender')
      .select('gender_id, gender_name')
      .order('gender_id', { ascending: true });

    if (error) {
      console.error('Supabase error:', error);
      return NextResponse.json({ error: 'Failed to fetch genders' }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: genders
    });
  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
