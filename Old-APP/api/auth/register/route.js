import bcrypt from 'bcrypt';
import { NextResponse } from 'next/server';
import pool from '@/lib/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

function generateVerificationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

function generateAccountNumber() {
  return 'ACC' + Date.now().toString();
}

export async function POST(request) {
  const client = await pool.connect();
  
  try {
    const { 
      userType, 
      firstName, 
      lastName, 
      middleName,
      email, 
      username, 
      phone,
      password, 
      confirmPassword,
      companyId, // For employees
      companyName, // For company registration
      companyEmail,
      companyPhone,
      companyWebsite,
      companyDescription,
      // Personal address fields (not used for company)
      premiseName = 'N/A',
      streetName = 'N/A',
      barangayName = 'N/A',
      cityName = 'N/A',
      // Company address fields
      companyPremiseName = 'N/A',
      companyStreetName = 'N/A',
      companyBarangayName = 'N/A',
      companyCityName = 'N/A',
      // Nationality field (not used for company)
      nationalityName = 'Filipino'
    } = await request.json();

    console.log('Registration attempt:', { userType, firstName, lastName, email, username, companyId, companyName });

    // Validation for non-company registrations
    if (userType !== 'company') {
      if (!firstName || !lastName || !email || !username || !password) {
        return NextResponse.json(
          { error: 'All required fields must be filled' },
          { status: 400 }
        );
      }

      if (password !== confirmPassword) {
        return NextResponse.json(
          { error: 'Passwords do not match' },
          { status: 400 }
        );
      }

      if (password.length < 8) {
        return NextResponse.json(
          { error: 'Password must be at least 8 characters long' },
          { status: 400 }
        );
      }

      // Validate company ID for employees
      if (userType === 'employee' && !companyId) {
        return NextResponse.json(
          { error: 'Company ID is required for employees' },
          { status: 400 }
        );
      }
    }

    // Validation for company registration
    if (userType === 'company') {
      if (!companyName || !companyEmail) {
        return NextResponse.json(
          { error: 'Company name and email are required for company registration' },
          { status: 400 }
        );
      }
    }

    // Validate userType
    if (!userType || !['job-seeker', 'employee', 'company'].includes(userType)) {
      return NextResponse.json(
        { error: 'Please select a valid user type (job-seeker, employee, or company)' },
        { status: 400 }
      );
    }

    // Validate company exists if employee
    if (userType === 'employee') {
      console.log('Validating company ID:', companyId);
      
      // First, let's see what companies exist
      const allCompanies = await client.query('SELECT company_id, company_name FROM Company ORDER BY company_id');
      console.log('Available companies:', allCompanies.rows);
      
      const companyCheck = await client.query(
        'SELECT company_id, company_name FROM Company WHERE company_id = $1',
        [companyId]
      );

      console.log('Company check result:', companyCheck.rows);

      if (companyCheck.rows.length === 0) {
        return NextResponse.json(
          { 
            error: `Invalid company ID: ${companyId}. Company does not exist.`,
            availableCompanies: allCompanies.rows.map(c => ({ id: c.company_id, name: c.company_name }))
          },
          { status: 400 }
        );
      }
      
      console.log('Company validation passed for:', companyCheck.rows[0].company_name);
    }

    await client.query('BEGIN');

    // Handle company registration separately (no account creation)
    if (userType === 'company') {
      console.log('Creating new company record...');
      
      // Check if company email already exists
      const existingCompany = await client.query(
        'SELECT company_id FROM Company WHERE company_email = $1',
        [companyEmail]
      );

      if (existingCompany.rows.length > 0) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Company with this email already exists' },
          { status: 409 }
        );
      }

      // Insert company address
      const companyAddressResult = await client.query(
        'INSERT INTO Address (premise_name, street_name, barangay_name, city_name) VALUES ($1, $2, $3, $4) RETURNING address_id',
        [companyPremiseName, companyStreetName, companyBarangayName, companyCityName]
      );

      // Create new company (only use address_id, not account_address_id)
      const companyResult = await client.query(
        'INSERT INTO Company (company_name, company_email, company_phone, company_website, company_description, address_id) VALUES ($1, $2, $3, $4, $5, $6) RETURNING company_id',
        [companyName, companyEmail, companyPhone, companyWebsite, companyDescription, companyAddressResult.rows[0].address_id]
      );

      await client.query('COMMIT');
      console.log('Company created:', companyResult.rows[0]);

      return NextResponse.json({
        message: 'Company registration successful! Your company ID is ' + companyResult.rows[0].company_id,
        companyId: companyResult.rows[0].company_id,
        userType: userType
      }, { status: 201 });
    }

    // For job-seeker and employee registrations (account creation)
    // Check if user already exists
    const existingUser = await client.query(
      'SELECT account_id FROM Account WHERE account_email = $1 OR account_username = $2',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'User with this email or username already exists' },
        { status: 409 }
      );
    }

    // Ensure account types exist
    await client.query(`
      INSERT INTO Account_type (account_type_id, account_type_name) 
      VALUES (1, 'Company'), (2, 'Job Seeker') 
      ON CONFLICT (account_type_id) DO NOTHING
    `);

    // Hash password
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Insert or get nationality
    let nationalityResult = await client.query(
      'SELECT nationality_id FROM Nationality WHERE nationality_name = $1',
      [nationalityName]
    );

    if (nationalityResult.rows.length === 0) {
      nationalityResult = await client.query(
        'INSERT INTO Nationality (nationality_name) VALUES ($1) RETURNING nationality_id',
        [nationalityName]
      );
    }

    // 1. Insert personal address
    const addressResult = await client.query(
      'INSERT INTO Address (premise_name, street_name, barangay_name, city_name) VALUES ($1, $2, $3, $4) RETURNING address_id',
      [premiseName, streetName, barangayName, cityName]
    );

    // 2. Insert person
    const personResult = await client.query(
      'INSERT INTO Person (first_name, last_name, middle_name, address_id, nationality_id) VALUES ($1, $2, $3, $4, $5) RETURNING person_id',
      [firstName, lastName, middleName, addressResult.rows[0].address_id, nationalityResult.rows[0].nationality_id]
    );

    // 3. Insert account
    let accountTypeId;
    if (userType === 'job-seeker') {
      accountTypeId = 2; // Job Seeker
    } else if (userType === 'employee') {
      accountTypeId = 1; // Company
    }

    const accountResult = await client.query(
      'INSERT INTO Account (account_email, account_username, account_phone, account_number, account_password, account_type_id, account_is_verified) VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING account_id',
      [email, username, phone, generateAccountNumber(), hashedPassword, accountTypeId, false]
    );

    const accountId = accountResult.rows[0].account_id;
    console.log('Account created with ID:', accountId);

    // 4. Handle user type specific logic
    if (userType === 'job-seeker') {
      console.log('Creating job-seeker record...');
      
      // Insert job seeker record directly
      await client.query(
        'INSERT INTO Job_seeker (person_id, account_id) VALUES ($1, $2)',
        [personResult.rows[0].person_id, accountId]
      );

      console.log('Job seeker record created successfully');
      
    } else if (userType === 'employee') {
      console.log('Creating employee record for existing company...');
      
      // Create employee record for existing company
      const employeeResult = await client.query(
        'INSERT INTO Employee (person_id, account_id, company_id, position_name) VALUES ($1, $2, $3, $4) RETURNING employee_id',
        [personResult.rows[0].person_id, accountId, companyId, 'Employee']
      );

      console.log('Employee record created:', {
        employee_id: employeeResult.rows[0].employee_id,
        person_id: personResult.rows[0].person_id,
        account_id: accountId,
        company_id: companyId
      });
    }

    // Generate and store verification code for accounts only
    const verificationCode = generateVerificationCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await client.query(`
      CREATE TABLE IF NOT EXISTS Verification_codes (
        account_id INTEGER PRIMARY KEY REFERENCES Account(account_id) ON DELETE CASCADE,
        code VARCHAR(6) NOT NULL,
        expires_at TIMESTAMP NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await client.query(
      'INSERT INTO Verification_codes (account_id, code, expires_at) VALUES ($1, $2, $3) ON CONFLICT (account_id) DO UPDATE SET code = EXCLUDED.code, expires_at = EXCLUDED.expires_at, created_at = CURRENT_TIMESTAMP',
      [accountId, verificationCode, expiresAt]
    );

    await client.query('COMMIT');
    console.log('Transaction committed successfully');    // Send verification email via API
    let emailSent = false;
    let emailError = null;
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/api/email/send-verification`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code: verificationCode })
      });
      const data = await res.json();
      emailSent = data.success;
      if (!data.success) emailError = data.error;
    } catch (emailSendError) {
      emailError = emailSendError.message;
    }
    
    // Provide appropriate response based on email status
    const responseMessage = emailError && emailError.includes('Email credentials not configured')
      ? 'Registration successful! Email verification is currently disabled (development mode).'
      : emailSent 
        ? 'Registration successful! Please check your email for verification.'
        : 'Registration successful! However, verification email could not be sent. Please contact support.';

    return NextResponse.json({
      message: responseMessage,
      userId: accountId,
      userType: userType,
      emailSent: emailSent,
      emailSimulated: emailError && emailError.includes('Email credentials not configured'),
      verificationCode: process.env.NODE_ENV === 'development' && emailError ? verificationCode : undefined
    }, { status: 201 });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration error:', error);
    
    // Provide more specific error messages
    if (error.code === '23505') { // Unique constraint violation
      return NextResponse.json(
        { error: 'Email or username already exists' },
        { status: 409 }
      );
    } else if (error.code === '23503') { // Foreign key constraint violation
      return NextResponse.json(
        { error: 'Database constraint error. Please check your input data.' },
        { status: 400 }
      );
    } else if (error.code === '23502') { // Not null constraint violation
      return NextResponse.json(
        { error: 'Required field is missing.' },
        { status: 400 }
      );
    }
    
    return NextResponse.json(
      { error: `Registration failed: ${error.message}` },
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
