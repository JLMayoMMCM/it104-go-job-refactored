import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';
import { SignJWT } from 'jose';
import pool from '@/lib/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-here'
);

export async function POST(request) {
  const client = await pool.connect();
  
  try {
    const { username, password, userType } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Find user in database with address and nationality details
    let userQuery;
    
    if (userType === 'job-seeker') {
      // Query for job seekers
      userQuery = await client.query(`
        SELECT 
          a.account_id, a.account_username, a.account_email, a.account_password, a.account_is_verified,
          at.account_type_name, 
          p.first_name, p.last_name, p.middle_name,
          addr.premise_name, addr.street_name, addr.barangay_name, addr.city_name,
          n.nationality_name,
          js.job_seeker_id
        FROM Account a
        JOIN Account_type at ON a.account_type_id = at.account_type_id
        JOIN Job_seeker js ON a.account_id = js.account_id
        JOIN Person p ON js.person_id = p.person_id
        JOIN Address addr ON p.address_id = addr.address_id
        JOIN Nationality n ON p.nationality_id = n.nationality_id
        WHERE (a.account_username = $1 OR a.account_email = $1) AND at.account_type_name = 'Job Seeker'
      `, [username]);
    } else if (userType === 'employee') {
      // Query for employees (both regular employees and company owners)
      userQuery = await client.query(`
        SELECT 
          a.account_id, a.account_username, a.account_email, a.account_password, a.account_is_verified,
          at.account_type_name, 
          p.first_name, p.last_name, p.middle_name,
          addr.premise_name, addr.street_name, addr.barangay_name, addr.city_name,
          n.nationality_name,
          c.company_name,
          e.position_name,
          e.employee_id
        FROM Account a
        JOIN Account_type at ON a.account_type_id = at.account_type_id
        JOIN Employee e ON a.account_id = e.account_id
        JOIN Person p ON e.person_id = p.person_id
        JOIN Address addr ON p.address_id = addr.address_id
        JOIN Nationality n ON p.nationality_id = n.nationality_id
        JOIN Company c ON e.company_id = c.company_id
        WHERE (a.account_username = $1 OR a.account_email = $1) AND at.account_type_name = 'Company'
      `, [username]);
    } else {
      return NextResponse.json(
        { error: 'Invalid user type. Please select job-seeker or employee.' },
        { status: 400 }
      );
    }
    
    if (userQuery.rows.length === 0) {
      return NextResponse.json(
        { error: 'Invalid credentials or user type mismatch' },
        { status: 401 }
      );
    }

    const user = userQuery.rows[0];

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.account_password);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Generate verification code for unverified users
    if (!user.account_is_verified) {
      const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
      
      console.log(`Verification code for ${user.account_email}: ${verificationCode}`);
      
      return NextResponse.json({
        message: 'Please verify your email to continue',
        email: user.account_email,
        requiresVerification: true
      });
    }

    // Generate JWT token for verified users
    const token = await new SignJWT({ 
      userId: user.account_id,
      email: user.account_email,
      username: user.account_username 
    })
      .setProtectedHeader({ alg: 'HS256' })
      .setIssuedAt()
      .setExpirationTime('7d')
      .sign(JWT_SECRET);

    return NextResponse.json({
      message: 'Login successful',
      token,
      user: {
        id: user.account_id,
        email: user.account_email,
        username: user.account_username,
        isVerified: user.account_is_verified
      }
    });

  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

// Export other HTTP methods to satisfy Next.js requirements
export async function GET() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function PUT() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}

export async function DELETE() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 });
}
