import { NextResponse } from 'next/server';
import pool from '@/lib/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request) {
  const client = await pool.connect();
  
  try {
    const url = new URL(request.url);
    const page = parseInt(url.searchParams.get('page')) || 1;
    const limit = parseInt(url.searchParams.get('limit')) || 10;
    const search = url.searchParams.get('search') || '';
    const location = url.searchParams.get('location') || '';
    const jobType = url.searchParams.get('jobType') || '';
    const category = url.searchParams.get('category') || '';
    const sortBy = url.searchParams.get('sortBy') || 'newest';
    
    const offset = (page - 1) * limit;
    
    let whereConditions = ['j.job_is_active = true'];
    let queryParams = [];
    let paramIndex = 1;

    // Add search conditions
    if (search) {
      whereConditions.push(`(j.job_name ILIKE $${paramIndex} OR j.job_description ILIKE $${paramIndex} OR c.company_name ILIKE $${paramIndex})`);
      queryParams.push(`%${search}%`);
      paramIndex++;
    }

    if (location) {
      whereConditions.push(`j.job_location ILIKE $${paramIndex}`);
      queryParams.push(`%${location}%`);
      paramIndex++;
    }

    if (jobType) {
      whereConditions.push(`jt.job_type_name = $${paramIndex}`);
      queryParams.push(jobType);
      paramIndex++;
    }

    if (category) {
      whereConditions.push(`jc.job_category_name = $${paramIndex}`);
      queryParams.push(category);
      paramIndex++;
    }

    // Build ORDER BY clause
    let orderBy = 'j.job_posted_date DESC';
    switch (sortBy) {
      case 'salary_high':
        orderBy = 'j.job_salary DESC NULLS LAST, j.job_posted_date DESC';
        break;
      case 'salary_low':
        orderBy = 'j.job_salary ASC NULLS LAST, j.job_posted_date DESC';
        break;
      case 'company_rating':
        orderBy = 'c.company_rating DESC NULLS LAST, j.job_posted_date DESC';
        break;
      case 'oldest':
        orderBy = 'j.job_posted_date ASC';
        break;
      default:
        orderBy = 'j.job_posted_date DESC';
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total count
    const countQuery = `
      SELECT COUNT(DISTINCT j.job_id) as total
      FROM Job j
      JOIN Company c ON j.company_id = c.company_id
      JOIN Job_type jt ON j.job_type_id = jt.job_type_id
      LEFT JOIN Job_Category_List jcl ON j.job_id = jcl.job_id
      LEFT JOIN Job_category jc ON jcl.job_category_id = jc.job_category_id
      WHERE ${whereClause}
    `;

    const countResult = await client.query(countQuery, queryParams);
    const totalJobs = parseInt(countResult.rows[0].total);

    // Get jobs with pagination
    const jobsQuery = `
      SELECT DISTINCT
        j.job_id, j.job_name, j.job_description, j.job_location, 
        j.job_salary, j.job_time, j.job_rating, j.job_posted_date,
        j.job_closing_date, j.job_is_active, j.job_quantity,
        c.company_id, c.company_name, c.company_rating, c.company_logo,
        c.company_description, c.company_website,
        jt.job_type_name,
        STRING_AGG(DISTINCT jc.job_category_name, ', ') as job_categories,
        STRING_AGG(DISTINCT cf.category_field_name, ', ') as category_fields
      FROM Job j
      JOIN Company c ON j.company_id = c.company_id
      JOIN Job_type jt ON j.job_type_id = jt.job_type_id
      LEFT JOIN Job_Category_List jcl ON j.job_id = jcl.job_id
      LEFT JOIN Job_category jc ON jcl.job_category_id = jc.job_category_id
      LEFT JOIN Category_field cf ON jc.category_field_id = cf.category_field_id
      WHERE ${whereClause}
      GROUP BY j.job_id, c.company_id, jt.job_type_name
      ORDER BY ${orderBy}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    queryParams.push(limit, offset);
    const jobsResult = await client.query(jobsQuery, queryParams);

    return NextResponse.json({
      jobs: jobsResult.rows,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalJobs / limit),
        totalJobs: totalJobs,
        hasNext: page < Math.ceil(totalJobs / limit),
        hasPrev: page > 1
      }
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
