#!/usr/bin/env node

const fetch = require('node-fetch');

/**
 * Simple script to test the OpenAI API connection
 */
async function testOpenAIConnection() {
  // Get the API key from environment variable
  const apiKey = process.env.OPENAI_API_KEY || process.env.API_KEY;
  
  if (!apiKey) {
    console.error('❌ No API key found. Please set OPENAI_API_KEY environment variable.');
    console.error('Example: OPENAI_API_KEY=your-key node debug-api.js');
    process.exit(1);
  }

  console.log(`🔑 Using API key: ${apiKey.substring(0, 5)}...${apiKey.substring(apiKey.length - 4)}`);
  
  const url = 'https://api.openai.com/v1/images/generations';
  const payload = {
    prompt: 'A test image of a cat',
    model: 'gpt-image-1',
    n: 1
  };

  console.log('💬 Sending test request to OpenAI...');
  console.log(`📝 Request payload: ${JSON.stringify(payload)}`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(payload)
    });

    console.log(`📡 Response status: ${response.status} ${response.statusText}`);
    
    const result = await response.json();
    
    if (response.ok) {
      console.log('✅ Connection successful!');
      console.log(`📊 Generation response received with ${result.data?.length || 0} images`);
    } else {
      console.error('❌ API Error:');
      console.error(JSON.stringify(result, null, 2));
    }
  } catch (error) {
    console.error(`❌ Error: ${error.message}`);
  }
}

testOpenAIConnection().catch(err => {
  console.error('Unhandled error:', err);
  process.exit(1);
});