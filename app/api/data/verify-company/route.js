import { NextResponse } from 'next/server';
import { supabase } from '../../../lib/supabase';

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { message: 'Company ID is required' },
        { status: 400 }
      );
    }

    const { data: company, error } = await supabase
      .from('company')
      .select('company_id, company_name, company_email')
      .eq('company_id', companyId)
      .single();

    if (error || !company) {
      return NextResponse.json(
        { message: 'Company not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      company: company
    });
  } catch (error) {
    console.error('Error verifying company:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}
