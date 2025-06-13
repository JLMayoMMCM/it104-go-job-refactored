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

    // Get user data with all related information
    const userQuery = await client.query(`
      SELECT 
        a.account_id, a.account_email, a.account_username, a.account_phone, 
        a.account_photo, a.account_resume, a.account_is_verified,
        at.account_type_name,
        COALESCE(p_js.first_name, p_e.first_name) as first_name,
        COALESCE(p_js.last_name, p_e.last_name) as last_name,
        COALESCE(p_js.middle_name, p_e.middle_name) as middle_name,
        COALESCE(addr_js.premise_name, addr_e.premise_name) as premise_name,
        COALESCE(addr_js.street_name, addr_e.street_name) as street_name,
        COALESCE(addr_js.barangay_name, addr_e.barangay_name) as barangay_name,
        COALESCE(addr_js.city_name, addr_e.city_name) as city_name,
        COALESCE(n_js.nationality_name, n_e.nationality_name) as nationality_name,
        js.job_seeker_id,
        e.employee_id,
        c.company_name,
        e.position_name
      FROM Account a
      JOIN Account_type at ON a.account_type_id = at.account_type_id
      LEFT JOIN Job_seeker js ON a.account_id = js.account_id
      LEFT JOIN Employee e ON a.account_id = e.account_id
      LEFT JOIN Person p_js ON js.person_id = p_js.person_id
      LEFT JOIN Person p_e ON e.person_id = p_e.person_id
      LEFT JOIN Address addr_js ON p_js.address_id = addr_js.address_id
      LEFT JOIN Address addr_e ON p_e.address_id = addr_e.address_id
      LEFT JOIN Nationality n_js ON p_js.nationality_id = n_js.nationality_id
      LEFT JOIN Nationality n_e ON p_e.nationality_id = n_e.nationality_id
      LEFT JOIN Company c ON e.company_id = c.company_id
      WHERE a.account_id = $1
    `, [payload.userId]);

    if (userQuery.rows.length === 0) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const user = userQuery.rows[0];

    // Convert photo to base64 if exists
    const profilePhoto = user.account_photo ? 
      `data:image/jpeg;base64,${Buffer.from(user.account_photo).toString('base64')}` : null;

    // Convert resume to data URL if exists
    const resumeUrl = user.account_resume ? 
      `data:application/pdf;base64,${Buffer.from(user.account_resume).toString('base64')}` : null;

    return NextResponse.json({
      id: user.account_id,
      email: user.account_email,
      username: user.account_username,
      firstName: user.first_name,
      lastName: user.last_name,
      middleName: user.middle_name,
      phone: user.account_phone,
      premiseName: user.premise_name,
      streetName: user.street_name,
      barangayName: user.barangay_name,
      cityName: user.city_name,
      nationality: user.nationality_name,
      isVerified: user.account_is_verified,
      profilePhoto,
      resumeUrl,
      hasResume: !!user.account_resume,
      isJobSeeker: user.account_type_name === 'Job Seeker',
      isEmployee: user.account_type_name === 'Company',
      companyName: user.company_name,
      position: user.position_name
    });

  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// Export other HTTP methods to satisfy Next.js requirements
export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
