import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import pool from '@/lib/database';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-here'
);

export async function GET(request, { params }) {
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
    const applicantId = params.id;

    // Verify that the requesting user is an employee
    const employeeQuery = await client.query(
      'SELECT employee_id FROM Employee WHERE account_id = $1',
      [payload.userId]
    );

    if (employeeQuery.rows.length === 0) {
      return NextResponse.json(
        { error: 'Access denied. Only employees can view applicant profiles.' },
        { status: 403 }
      );
    }

    // Get applicant profile details
    const profileQuery = await client.query(`
      SELECT 
        a.account_id, a.account_email, a.account_username, a.account_phone,
        a.account_photo, a.account_resume, a.account_is_verified,
        p.first_name, p.last_name, p.middle_name,
        addr.premise_name, addr.street_name, addr.barangay_name, addr.city_name,
        n.nationality_name,
        js.job_seeker_id
      FROM Account a
      JOIN Job_seeker js ON a.account_id = js.account_id
      JOIN Person p ON js.person_id = p.person_id
      LEFT JOIN Address addr ON p.address_id = addr.address_id
      LEFT JOIN Nationality n ON p.nationality_id = n.nationality_id
      WHERE a.account_id = $1
    `, [applicantId]);

    if (profileQuery.rows.length === 0) {
      return NextResponse.json(
        { error: 'Applicant profile not found' },
        { status: 404 }
      );
    }

    const profile = profileQuery.rows[0];

    // Get applicant's job preferences
    const preferencesQuery = await client.query(`
      SELECT 
        jc.job_category_name,
        cf.category_field_name
      FROM Jobseeker_preference jp
      JOIN Job_category jc ON jp.preferred_job_category_id = jc.job_category_id
      JOIN Category_field cf ON jc.category_field_id = cf.category_field_id
      WHERE jp.person_id = (
        SELECT person_id FROM Job_seeker WHERE account_id = $1
      )
    `, [applicantId]);

    // Get application statistics for this applicant
    const statsQuery = await client.query(`
      SELECT 
        COUNT(*) as total_applications,
        COUNT(CASE WHEN jr.request_status = 'accepted' THEN 1 END) as accepted_applications,
        COUNT(CASE WHEN jr.request_status = 'rejected' THEN 1 END) as rejected_applications,
        COUNT(CASE WHEN jr.request_status = 'pending' THEN 1 END) as pending_applications,
        MIN(jr.request_date) as first_application_date
      FROM Job_requests jr
      JOIN Job_seeker js ON jr.job_seeker_id = js.job_seeker_id
      WHERE js.account_id = $1
    `, [applicantId]);

    const stats = statsQuery.rows[0] || {
      total_applications: 0,
      accepted_applications: 0,
      rejected_applications: 0,
      pending_applications: 0,
      first_application_date: null
    };

    // Convert photo to base64 if exists
    const profilePhoto = profile.account_photo ? 
      `data:image/jpeg;base64,${Buffer.from(profile.account_photo).toString('base64')}` : null;

    const responseData = {
      id: profile.account_id,
      email: profile.account_email,
      username: profile.account_username,
      firstName: profile.first_name,
      lastName: profile.last_name,
      middleName: profile.middle_name,
      phone: profile.account_phone,
      premiseName: profile.premise_name,
      streetName: profile.street_name,
      barangayName: profile.barangay_name,
      cityName: profile.city_name,
      nationality: profile.nationality_name,
      isVerified: profile.account_is_verified,
      profilePhoto,
      hasResume: !!profile.account_resume,
      preferences: preferencesQuery.rows,
      stats: {
        totalApplications: parseInt(stats.total_applications),
        acceptedApplications: parseInt(stats.accepted_applications),
        rejectedApplications: parseInt(stats.rejected_applications),
        pendingApplications: parseInt(stats.pending_applications),
        firstApplicationDate: stats.first_application_date
      }
    };

    return NextResponse.json(responseData);

  } catch (error) {
    console.error('Error fetching applicant profile:', error);
    return NextResponse.json(
      { error: 'Failed to fetch applicant profile' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
