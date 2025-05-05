#!/usr/bin/env node

/**
 * Minimal OpenAI Image Generation Example
 * 
 * This file demonstrates the absolute simplest way to use OpenAI's
 * gpt-image-1 model to generate an image with default settings.
 */

// Import required dependencies
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const { promisify } = require('util');
const writeFile = promisify(fs.writeFile);

// Your OpenAI API key - replace with your own API key if testing directly
const API_KEY = 'sk-abcdefg123456';

// The OpenAI API endpoint for image generation
const GENERATIONS_URL = 'https://api.openai.com/v1/images/generations';

// Create output directory if it doesn't exist
const OUTPUT_DIR = path.join(__dirname, 'output');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

/**
 * Generate an image with OpenAI's gpt-image-1 model using minimal configuration
 * 
 * @param {string} prompt - The text description of the image
 * @returns {Promise<string>} - Path to the saved image
 */
async function generateSimpleImage(prompt) {
  console.log(`Generating image for prompt: "${prompt}"`);
  
  // Minimal payload with just prompt and model
  const payload = {
    prompt: prompt,
    model: 'gpt-image-1',
    // All other parameters use OpenAI defaults:
    // - n = 1 (one image)
    // - size = 1024x1024
    // - quality = standard
    // - style = vivid
  };
  
  console.log('Sending request to OpenAI API...');
  
  try {
    // Make API request
    const response = await fetch(GENERATIONS_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify(payload)
    });
    
    // Handle non-successful responses
    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API error: ${response.status} ${response.statusText} - ${error.error?.message || JSON.stringify(error)}`);
    }
    
    // Parse successful response
    const data = await response.json();
    console.log('Response received successfully!');
    
    if (!data.data || data.data.length === 0) {
      throw new Error('No image data received in the response');
    }
    
    // Get base64 image data from the first result
    const imageData = data.data[0].b64_json;
    const imageBuffer = Buffer.from(imageData, 'base64');
    
    // Create a simple timestamp filename
    const timestamp = new Date().toISOString().replace(/[:\.]/g, '-');
    const filePath = path.join(OUTPUT_DIR, `simple_image_${timestamp}.png`);
    
    // Save the image to disk
    await writeFile(filePath, imageBuffer);
    console.log(`Image saved to: ${filePath}`);
    
    return filePath;
  } catch (error) {
    console.error('Error generating image:', error);
    throw error;
  }
}

// If this script is run directly (not imported), generate an example image
if (require.main === module) {
  // Sample prompt
  const samplePrompt = "A beautiful mountain landscape with a lake and trees";
  
  generateSimpleImage(samplePrompt)
    .then(imagePath => {
      console.log(`✓ Success! Image generated and saved to: ${imagePath}`);
    })
    .catch(error => {
      console.error(`✗ Failed to generate image: ${error.message}`);
      process.exit(1);
    });
}

// Export the function for use in other modules
module.exports = { generateSimpleImage };