import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET() {
  try {
    const { data: nationalities, error } = await supabase
      .from('nationality')
      .select('nationality_id, nationality_name')
      .order('nationality_name');

    if (error) {
      console.error('Database error:', error);
      return NextResponse.json(
        { 
          success: false,
          message: 'Failed to fetch nationalities' 
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      data: nationalities
    });
  } catch (error) {
    console.error('Error fetching nationalities:', error);
    return NextResponse.json(
      { 
        success: false,
        message: 'Internal server error' 
      },
      { status: 500 }
    );
  }
}
