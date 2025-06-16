// Simple test script to check the profile API
const fetch = require('node-fetch');

async function testProfileAPI() {
  try {
    // Test with a sample account ID
    const testAccountId = '1'; // You may need to adjust this based on your actual data
    
    console.log('Testing profile API with accountId:', testAccountId);
    
    const response = await fetch(`http://localhost:3001/api/jobseeker/profile?accountId=${testAccountId}`);
    
    console.log('Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Error response:', errorText);
      return;
    }
    
    const data = await response.json();
    console.log('Success! Profile data:', JSON.stringify(data, null, 2));
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testProfileAPI();
