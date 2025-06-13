import { NextResponse } from 'next/server';
import pool from '@/lib/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';


export async function GET(request) {
  const client = await pool.connect();
  
  try {
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') || '20';
    const offset = url.searchParams.get('offset') || '0';
    const search = url.searchParams.get('search') || '';
    const categoryId = url.searchParams.get('category');
    const jobTypeId = url.searchParams.get('jobType');
    const salaryMin = url.searchParams.get('salaryMin');
    const salaryMax = url.searchParams.get('salaryMax');

    let whereConditions = ['j.job_is_active = true'];
    let queryParams = [];
    let paramCount = 0;

    // Add search filter
    if (search) {
      paramCount++;
      whereConditions.push(`(j.job_name ILIKE $${paramCount} OR j.job_description ILIKE $${paramCount} OR c.company_name ILIKE $${paramCount})`);
      queryParams.push(`%${search}%`);
    }

    // Add category filter
    if (categoryId) {
      paramCount++;
      whereConditions.push(`jcl.job_category_id = $${paramCount}`);
      queryParams.push(categoryId);
    }

    // Add job type filter
    if (jobTypeId) {
      paramCount++;
      whereConditions.push(`j.job_type_id = $${paramCount}`);
      queryParams.push(jobTypeId);
    }

    // Add salary filters
    if (salaryMin) {
      paramCount++;
      whereConditions.push(`j.job_salary >= $${paramCount}`);
      queryParams.push(salaryMin);
    }

    if (salaryMax) {
      paramCount++;
      whereConditions.push(`j.job_salary <= $${paramCount}`);
      queryParams.push(salaryMax);
    }

    // Add closing date filter
    whereConditions.push(`(j.job_closing_date IS NULL OR j.job_closing_date > NOW())`);

    paramCount++;
    queryParams.push(limit);
    paramCount++;
    queryParams.push(offset);

    const jobsQuery = await client.query(`
      SELECT DISTINCT
        j.job_id, j.job_name, j.job_description, j.job_location, 
        j.job_salary, j.job_time, j.job_rating, j.job_posted_date,
        j.job_closing_date, j.job_quantity,
        c.company_name, c.company_rating,
        jt.job_type_name
      FROM Job j
      JOIN Company c ON j.company_id = c.company_id
      JOIN Job_type jt ON j.job_type_id = jt.job_type_id
      LEFT JOIN Job_Category_List jcl ON j.job_id = jcl.job_id
      WHERE ${whereConditions.join(' AND ')}
      ORDER BY j.job_posted_date DESC
      LIMIT $${paramCount - 1} OFFSET $${paramCount}
    `, queryParams);

    // Get total count for pagination
    const countQuery = await client.query(`
      SELECT COUNT(DISTINCT j.job_id) as total
      FROM Job j
      JOIN Company c ON j.company_id = c.company_id
      JOIN Job_type jt ON j.job_type_id = jt.job_type_id
      LEFT JOIN Job_Category_List jcl ON j.job_id = jcl.job_id
      WHERE ${whereConditions.slice(0, -1).join(' AND ')} AND (j.job_closing_date IS NULL OR j.job_closing_date > NOW())
    `, queryParams.slice(0, -2));

    return NextResponse.json({
      jobs: jobsQuery.rows,
      total: parseInt(countQuery.rows[0].total),
      hasMore: (parseInt(offset) + parseInt(limit)) < parseInt(countQuery.rows[0].total)
    });

  } catch (error) {
    console.error('Error fetching jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch jobs' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
