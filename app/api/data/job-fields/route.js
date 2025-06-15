import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

export async function GET(request) {
  try {
    // Get all category fields
    const { data: fields, error: fieldsError } = await supabase
      .from('category_field')
      .select('category_field_id, category_field_name')
      .order('category_field_name');

    if (fieldsError) {
      console.error('Fields fetch error:', fieldsError);
      return NextResponse.json({ error: 'Failed to fetch job fields' }, { status: 500 });
    }

    // Get all job categories with their associated fields
    const { data: categories, error: categoriesError } = await supabase
      .from('job_category')
      .select(`
        job_category_id,
        job_category_name,
        category_field_id,
        category_field:category_field_id (
          category_field_name
        )
      `)
      .order('job_category_name');

    if (categoriesError) {
      console.error('Categories fetch error:', categoriesError);
      return NextResponse.json({ error: 'Failed to fetch job categories' }, { status: 500 });
    }

    // Get job types
    const { data: jobTypes, error: typesError } = await supabase
      .from('job_type')
      .select('job_type_id, job_type_name')
      .order('job_type_name');

    if (typesError) {
      console.error('Job types fetch error:', typesError);
      return NextResponse.json({ error: 'Failed to fetch job types' }, { status: 500 });
    }

    // Organize categories under their respective fields
    const fieldsWithCategories = fields.map(field => {
      const fieldCategories = categories
        .filter(cat => cat.category_field_id === field.category_field_id)
        .map(cat => ({
          job_category_id: cat.job_category_id,
          job_category_name: cat.job_category_name
        }));
      return {
        ...field,
        job_categories: fieldCategories
      };
    });

    return NextResponse.json({
      success: true,
      data: fieldsWithCategories || []
    });

  } catch (error) {
    console.error('API error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
