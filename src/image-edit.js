const fs = require('fs');
const FormData = require('form-data');
const fetch = require('node-fetch');
const path = require('path');
const { API_KEY, API_EDITS_URL, DEFAULT_MODEL } = require('./config');

/**
 * Edit an image based on a prompt
 * @param {Buffer} imageBuffer - The image buffer to edit
 * @param {Buffer} maskBuffer - Optional mask buffer to specify areas to edit
 * @param {string} prompt - The text prompt describing the edit
 * @param {Object} options - Additional options for image editing
 * @returns {Promise<Object>} The edited image data
 */
async function editImage(imageBuffer, maskBuffer, prompt, options = {}) {
  if (!API_KEY) {
    throw new Error('OpenAI API key is not configured.');
  }

  // Create form data
  const form = new FormData();
  form.append('image', imageBuffer, {
    filename: 'image.png',
    contentType: 'image/png',
  });
  
  // Add mask if provided
  if (maskBuffer) {
    form.append('mask', maskBuffer, {
      filename: 'mask.png',
      contentType: 'image/png',
    });
  }

  // Add other required and optional parameters
  form.append('prompt', prompt);
  form.append('model', options.model || DEFAULT_MODEL || 'gpt-image-1');
  
  if (options.n) form.append('n', options.n.toString());
  if (options.size) form.append('size', options.size);
  if (options.output_format) form.append('response_format', options.output_format);

  try {
    const response = await fetch(API_EDITS_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${API_KEY}`,
        ...form.getHeaders()
      },
      body: form
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`API error: ${response.status} ${response.statusText} - ${error.error?.message || JSON.stringify(error)}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error editing image:', error);
    throw new Error(`Failed to edit image: ${error.message}`);
  }
}

module.exports = { editImage };