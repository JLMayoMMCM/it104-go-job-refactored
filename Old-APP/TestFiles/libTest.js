// Simple Node.js test runner for database.js and email.js
import { testConnection as testDbConnection } from '../../lib/database.js';
import { sendVerificationEmail } from '../../lib/email.js';

async function runTests() {
  console.log('Testing Database Connection...');
  try {
    const dbResult = await testDbConnection();
    if (dbResult === true) {
      console.log('✔ Database connection test passed');
    } else {
      console.error('✖ Database connection test failed: Expected true, got', dbResult);
    }
  } catch (err) {
    console.error('✖ Database connection test threw an error:', err);
  }

  console.log('Testing Email Sending...');
  try {
    const emailResult = await sendVerificationEmail('test@example.com', '123456');
    if (emailResult === true) {
      console.log('✔ Email sending test passed');
    } else {
      console.error('✖ Email sending test failed: Expected true, got', emailResult);
    }
  } catch (err) {
    console.error('✖ Email sending test threw an error:', err);
  }
}

runTests();
