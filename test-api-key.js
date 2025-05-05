#!/usr/bin/env node

const fetch = require('node-fetch');

// IMPORTANT: Replace this with your real key 
// for testing purposes only, then delete this file
const TEST_API_KEY = "YOUR_ACTUAL_KEY_HERE"; 

async function testAPIKey() {
  console.log('Running API key test...');
  
  // Test directly with the API key
  const url = 'https://api.openai.com/v1/images/generations';
  const payload = {
    prompt: 'Test image with cat',
    model: 'gpt-image-1',
    n: 1
  };
  
  try {
    console.log(`Sending direct test request to OpenAI API`);
    console.log(`Headers: Authorization: Bearer ${TEST_API_KEY.substring(0, 5)}...`);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${TEST_API_KEY}`
      },
      body: JSON.stringify(payload)
    });
    
    console.log(`Response status: ${response.status} ${response.statusText}`);
    
    if (response.ok) {
      console.log('API key is working correctly!');
      const data = await response.json();
      console.log(`Generated ${data.data?.length || 0} images`);
    } else {
      const error = await response.json();
      console.error('API Error:', JSON.stringify(error, null, 2));
    }
  } catch (error) {
    console.error(`Error: ${error.message}`);
  }
}

testAPIKey().catch(console.error);