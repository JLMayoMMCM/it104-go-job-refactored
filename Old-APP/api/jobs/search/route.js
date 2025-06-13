import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import pool from '@/lib/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-here'
);

export async function GET(request) {
  const client = await pool.connect();
  
  try {
    const { searchParams } = new URL(request.url);
    const keyword = searchParams.get('keyword') || '';
    const location = searchParams.get('location') || '';
    const category = searchParams.get('category') || '';
    const jobType = searchParams.get('jobType') || '';
    const minSalary = searchParams.get('minSalary') || '';
    const maxSalary = searchParams.get('maxSalary') || '';
    const page = parseInt(searchParams.get('page')) || 1;
    const limit = parseInt(searchParams.get('limit')) || 10;
    const offset = (page - 1) * limit;

    let userId = null;
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      try {
        const token = authHeader.split(' ')[1];
        const { payload } = await jwtVerify(token, JWT_SECRET);
        userId = payload.userId;
      } catch (error) {
        // Token invalid, continue as guest
      }
    }

    // Build query conditions
    let conditions = ['j.job_is_active = true'];
    let params = [];
    let paramIndex = 1;

    if (keyword) {
      conditions.push(`(j.job_name ILIKE $${paramIndex} OR j.job_description ILIKE $${paramIndex} OR c.company_name ILIKE $${paramIndex})`);
      params.push(`%${keyword}%`);
      paramIndex++;
    }

    if (location) {
      conditions.push(`j.job_location ILIKE $${paramIndex}`);
      params.push(`%${location}%`);
      paramIndex++;
    }

    if (category) {
      conditions.push(`jcat.job_category_id = $${paramIndex}`);
      params.push(category);
      paramIndex++;
    }

    if (jobType) {
      conditions.push(`j.job_type_id = $${paramIndex}`);
      params.push(jobType);
      paramIndex++;
    }

    if (minSalary) {
      conditions.push(`j.job_salary >= $${paramIndex}`);
      params.push(minSalary);
      paramIndex++;
    }

    if (maxSalary) {
      conditions.push(`j.job_salary <= $${paramIndex}`);
      params.push(maxSalary);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Get jobs with pagination
    const jobsQuery = `
      SELECT DISTINCT
        j.job_id,
        j.job_name,
        j.job_description,
        j.job_location,
        j.job_salary,
        j.job_quantity,
        j.job_posted_date,
        j.job_closing_date,
        j.job_is_active,
        c.company_name,
        c.company_logo,
        jt.job_type_name,
        array_agg(DISTINCT jcat.job_category_name) FILTER (WHERE jcat.job_category_name IS NOT NULL) as categories,
        CASE WHEN sj.saved_job_id IS NOT NULL THEN true ELSE false END as is_saved,
        CASE WHEN jr.request_id IS NOT NULL THEN true ELSE false END as has_applied
      FROM Job j
      JOIN Company c ON j.company_id = c.company_id
      JOIN Job_type jt ON j.job_type_id = jt.job_type_id
      LEFT JOIN Job_Category_List jcl ON j.job_id = jcl.job_id
      LEFT JOIN Job_category jcat ON jcl.job_category_id = jcat.job_category_id
      ${userId ? `LEFT JOIN Job_seeker js ON js.account_id = ${userId}` : ''}
      ${userId ? 'LEFT JOIN Saved_jobs sj ON j.job_id = sj.job_id AND sj.job_seeker_id = js.job_seeker_id' : 'LEFT JOIN Saved_jobs sj ON false'}
      ${userId ? 'LEFT JOIN Job_requests jr ON j.job_id = jr.job_id AND jr.job_seeker_id = js.job_seeker_id' : 'LEFT JOIN Job_requests jr ON false'}
      ${whereClause}
      GROUP BY j.job_id, c.company_name, c.company_logo, jt.job_type_name, sj.saved_job_id, jr.request_id
      ORDER BY j.job_posted_date DESC
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    params.push(limit, offset);

    const result = await client.query(jobsQuery, params);

    // Get total count for pagination
    const countQuery = `
      SELECT COUNT(DISTINCT j.job_id)
      FROM Job j
      JOIN Company c ON j.company_id = c.company_id
      JOIN Job_type jt ON j.job_type_id = jt.job_type_id
      LEFT JOIN Job_Category_List jcl ON j.job_id = jcl.job_id
      LEFT JOIN Job_category jcat ON jcl.job_category_id = jcat.job_category_id
      ${whereClause}
    `;

    const countResult = await client.query(countQuery, params.slice(0, -2));
    const totalJobs = parseInt(countResult.rows[0].count);

    const jobs = result.rows.map(job => ({
      ...job,
      company_logo: job.company_logo ? Buffer.from(job.company_logo).toString('base64') : null,
      categories: job.categories || []
    }));

    return NextResponse.json({
      jobs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalJobs / limit),
        totalJobs,
        hasNextPage: page < Math.ceil(totalJobs / limit),
        hasPreviousPage: page > 1
      }
    });

  } catch (error) {
    console.error('Error searching jobs:', error);
    return NextResponse.json(
      { error: 'Failed to search jobs' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
