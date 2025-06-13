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
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json(
        { error: 'Authorization token required' },
        { status: 401 }
      );
    }

    const token = authHeader.split(' ')[1];
    const { payload } = await jwtVerify(token, JWT_SECRET);
    
    const url = new URL(request.url);
    const limit = url.searchParams.get('limit') || '20';

    // First check if user has preferences
    const preferencesQuery = await client.query(`
      SELECT COUNT(*) as preference_count
      FROM Jobseeker_preference jp
      JOIN Person p ON jp.person_id = p.person_id
      JOIN Job_seeker js ON p.person_id = js.person_id
      WHERE js.account_id = $1
    `, [payload.userId]);

    const hasPreferences = parseInt(preferencesQuery.rows[0].preference_count) > 0;

    let jobsQuery;
    if (hasPreferences) {
      // Get recommended jobs based on user preferences with hierarchy
      jobsQuery = await client.query(`
        SELECT 
          j.job_id, 
          j.job_name, 
          j.job_description, 
          j.job_location, 
          j.job_salary, 
          j.job_time, 
          j.job_rating, 
          j.job_posted_date,
          c.company_name, 
          c.company_rating, 
          c.company_id,
          jt.job_type_name,
          STRING_AGG(DISTINCT jc.job_category_name, ', ') as job_categories,
          STRING_AGG(DISTINCT cf.category_field_name, ', ') as category_fields,
          MAX(
            CASE 
              WHEN exact_match.person_id IS NOT NULL THEN 3
              WHEN field_match.person_id IS NOT NULL THEN 2
              ELSE 1 
            END
          ) as preference_priority,
          COALESCE(c.company_rating, 0) as company_rating_score
        FROM Job j
        JOIN Company c ON j.company_id = c.company_id
        JOIN Job_type jt ON j.job_type_id = jt.job_type_id
        JOIN Job_Category_List jcl ON j.job_id = jcl.job_id
        JOIN Job_category jc ON jcl.job_category_id = jc.job_category_id
        JOIN Category_field cf ON jc.category_field_id = cf.category_field_id
        
        -- Exact job category match (highest priority)
        LEFT JOIN (
          SELECT DISTINCT jp.preferred_job_category_id, p.person_id
          FROM Jobseeker_preference jp
          JOIN Person p ON jp.person_id = p.person_id
          JOIN Job_seeker js ON p.person_id = js.person_id
          WHERE js.account_id = $1
        ) exact_match ON jcl.job_category_id = exact_match.preferred_job_category_id
        
        -- Same category field match (medium priority)
        LEFT JOIN (
          SELECT DISTINCT jc2.category_field_id, p.person_id
          FROM Jobseeker_preference jp
          JOIN Job_category jc2 ON jp.preferred_job_category_id = jc2.job_category_id
          JOIN Person p ON jp.person_id = p.person_id
          JOIN Job_seeker js ON p.person_id = js.person_id
          WHERE js.account_id = $1
        ) field_match ON jc.category_field_id = field_match.category_field_id
        
        WHERE j.job_is_active = true 
          AND (j.job_closing_date IS NULL OR j.job_closing_date > NOW())
          AND NOT EXISTS (
            -- Exclude jobs already applied to
            SELECT 1 FROM Job_requests jr2
            JOIN Job_seeker js2 ON jr2.job_seeker_id = js2.job_seeker_id
            WHERE jr2.job_id = j.job_id AND js2.account_id = $1
          )
          AND (exact_match.person_id IS NOT NULL OR field_match.person_id IS NOT NULL)
        GROUP BY 
          j.job_id, c.company_id, jt.job_type_name, j.job_name, j.job_description, j.job_location, j.job_salary, j.job_time, j.job_rating, j.job_posted_date, c.company_name, c.company_rating
        ORDER BY 
          preference_priority DESC,
          company_rating_score DESC,
          j.job_posted_date DESC
        LIMIT $2
      `, [payload.userId, limit]);
    } else {
      // Fallback: return recent active jobs if no preferences set
      jobsQuery = await client.query(`
        SELECT 
          j.job_id, j.job_name, j.job_description, j.job_location, 
          j.job_salary, j.job_time, j.job_rating, j.job_posted_date,
          c.company_name, c.company_rating, c.company_id,
          jt.job_type_name,
          STRING_AGG(DISTINCT jc.job_category_name, ', ') as job_categories,
          STRING_AGG(DISTINCT cf.category_field_name, ', ') as category_fields,
          0 as preference_score
        FROM Job j
        JOIN Company c ON j.company_id = c.company_id
        JOIN Job_type jt ON j.job_type_id = jt.job_type_id
        JOIN Job_Category_List jcl ON j.job_id = jcl.job_id
        JOIN Job_category jc ON jcl.job_category_id = jc.job_category_id
        JOIN Category_field cf ON jc.category_field_id = cf.category_field_id
        WHERE j.job_is_active = true 
          AND (j.job_closing_date IS NULL OR j.job_closing_date > NOW())
          AND NOT EXISTS (
            -- Exclude jobs already applied to
            SELECT 1 FROM Job_requests jr2
            JOIN Job_seeker js2 ON jr2.job_seeker_id = js2.job_seeker_id
            WHERE jr2.job_id = j.job_id AND js2.account_id = $1
          )
        GROUP BY 
          j.job_id, c.company_id, jt.job_type_name, j.job_name, j.job_description, j.job_location, j.job_salary, j.job_time, j.job_rating, j.job_posted_date, c.company_name, c.company_rating
        ORDER BY 
          COALESCE(c.company_rating, 0) DESC,
          j.job_posted_date DESC
        LIMIT $2
      `, [payload.userId, limit]);
    }

    // Add preference scores for display
    const jobsWithScores = jobsQuery.rows.map(job => ({
      ...job,
      preference_score: job.preference_priority === 3 ? 100 : 
                       job.preference_priority === 2 ? 50 : 0
    }));

    return NextResponse.json({
      jobs: jobsWithScores,
      hasPreferences: hasPreferences,
      isPersonalized: hasPreferences
    });

  } catch (error) {
    console.error('Error fetching recommended jobs:', error);
    return NextResponse.json(
      { error: 'Failed to fetch recommended jobs' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
