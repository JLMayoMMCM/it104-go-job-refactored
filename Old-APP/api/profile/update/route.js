import { NextResponse } from 'next/server';
import { jwtVerify } from 'jose';
import pool from '@/lib/database';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'your-secret-key-here'
);

export async function POST(request) {
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

    const formData = await request.formData();
    
    // Extract text fields
    const firstName = formData.get('firstName');
    const lastName = formData.get('lastName');
    const middleName = formData.get('middleName') || '';
    const phone = formData.get('phone') || '';
    const premiseName = formData.get('premiseName') || '';
    const streetName = formData.get('streetName') || '';
    const barangayName = formData.get('barangayName') || '';
    const cityName = formData.get('cityName') || '';
    const nationality = formData.get('nationality') || 'Filipino';
    const removeResume = formData.get('removeResume') === 'true';
    
    // Extract files
    const profilePhoto = formData.get('profilePhoto');
    const resume = formData.get('resume');

    await client.query('BEGIN');

    // Get user's person_id and current data
    const userQuery = await client.query(`
      SELECT 
        a.account_id,
        COALESCE(js.person_id, e.person_id) as person_id,
        COALESCE(p_js.address_id, p_e.address_id) as address_id,
        COALESCE(p_js.nationality_id, p_e.nationality_id) as nationality_id,
        js.job_seeker_id,
        e.employee_id,
        at.account_type_name
      FROM Account a
      JOIN Account_type at ON a.account_type_id = at.account_type_id
      LEFT JOIN Job_seeker js ON a.account_id = js.account_id
      LEFT JOIN Employee e ON a.account_id = e.account_id
      LEFT JOIN Person p_js ON js.person_id = p_js.person_id
      LEFT JOIN Person p_e ON e.person_id = p_e.person_id
      WHERE a.account_id = $1
    `, [payload.userId]);

    if (userQuery.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    const userData = userQuery.rows[0];

    // Handle nationality
    let nationalityId = userData.nationality_id;
    if (nationality) {
      let nationalityResult = await client.query(
        'SELECT nationality_id FROM Nationality WHERE nationality_name = $1',
        [nationality]
      );

      if (nationalityResult.rows.length === 0) {
        nationalityResult = await client.query(
          'INSERT INTO Nationality (nationality_name) VALUES ($1) RETURNING nationality_id',
          [nationality]
        );
      }
      nationalityId = nationalityResult.rows[0].nationality_id;
    }

    // Handle address - create if doesn't exist or update existing
    let addressId = userData.address_id;
    if (!addressId) {
      // Create new address
      const addressResult = await client.query(`
        INSERT INTO Address (premise_name, street_name, barangay_name, city_name)
        VALUES ($1, $2, $3, $4)
        RETURNING address_id
      `, [premiseName, streetName, barangayName, cityName]);
      addressId = addressResult.rows[0].address_id;
    } else {
      // Update existing address
      await client.query(`
        UPDATE Address 
        SET premise_name = $1, street_name = $2, barangay_name = $3, city_name = $4
        WHERE address_id = $5
      `, [premiseName, streetName, barangayName, cityName, addressId]);
    }

    // Handle person - create if doesn't exist or update existing
    let personId = userData.person_id;
    if (!personId) {
      // Create new person
      const personResult = await client.query(`
        INSERT INTO Person (first_name, last_name, middle_name, address_id, nationality_id)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING person_id
      `, [firstName, lastName, middleName, addressId, nationalityId]);
      personId = personResult.rows[0].person_id;

      // Link person to job seeker or employee
      if (userData.account_type_name === 'Job Seeker') {
        await client.query(
          'UPDATE Job_seeker SET person_id = $1 WHERE account_id = $2',
          [personId, payload.userId]
        );
      } else if (userData.account_type_name === 'Company') {
        await client.query(
          'UPDATE Employee SET person_id = $1 WHERE account_id = $2',
          [personId, payload.userId]
        );
      }
    } else {
      // Update existing person
      await client.query(`
        UPDATE Person 
        SET first_name = $1, last_name = $2, middle_name = $3, nationality_id = $4, address_id = $5
        WHERE person_id = $6
      `, [firstName, lastName, middleName, nationalityId, addressId, personId]);
    }

    // Update account phone
    await client.query(
      'UPDATE Account SET account_phone = $1 WHERE account_id = $2',
      [phone, payload.userId]
    );

    // Handle profile photo upload
    if (profilePhoto && profilePhoto.size > 0) {
      // Validate photo file type
      if (!profilePhoto.type.startsWith('image/')) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Profile photo must be an image file' },
          { status: 400 }
        );
      }

      // Validate photo file size (5MB max)
      if (profilePhoto.size > 5 * 1024 * 1024) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Profile photo file size must be less than 5MB' },
          { status: 400 }
        );
      }

      const photoBuffer = Buffer.from(await profilePhoto.arrayBuffer());
      await client.query(
        'UPDATE Account SET account_photo = $1 WHERE account_id = $2',
        [photoBuffer, payload.userId]
      );
    }

    // Handle resume removal
    if (removeResume) {
      await client.query(
        'UPDATE Account SET account_resume = NULL WHERE account_id = $2',
        [payload.userId]
      );
    }
    // Handle resume upload (only PDF files allowed)
    else if (resume && resume.size > 0) {
      // Validate file type - only PDF
      if (resume.type !== 'application/pdf') {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Resume must be a PDF file only' },
          { status: 400 }
        );
      }

      // Validate file size (10MB max)
      if (resume.size > 10 * 1024 * 1024) {
        await client.query('ROLLBACK');
        return NextResponse.json(
          { error: 'Resume file size must be less than 10MB' },
          { status: 400 }
        );
      }

      const resumeBuffer = Buffer.from(await resume.arrayBuffer());
      await client.query(
        'UPDATE Account SET account_resume = $1 WHERE account_id = $2',
        [resumeBuffer, payload.userId]
      );
    }

    await client.query('COMMIT');

    let message = 'Profile updated successfully!';
    if (resume && resume.size > 0) {
      message = 'Profile and resume updated successfully!';
    } else if (removeResume) {
      message = 'Profile updated and resume removed successfully!';
    }

    return NextResponse.json({
      message,
      resumeUploaded: !!(resume && resume.size > 0),
      resumeRemoved: removeResume
    });

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error updating profile:', error);
    return NextResponse.json(
      { error: 'Failed to update profile: ' + error.message },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}
