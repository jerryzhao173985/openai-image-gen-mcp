#!/usr/bin/env node

/**
 * Ultra Simple MCP for OpenAI Image Generation
 * 
 * This is a minimal Model Context Protocol (MCP) server that implements
 * just one tool: a simplified image generation endpoint that only requires
 * a prompt and has no optional parameters.
 */

// Import dependencies
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');

// API Configuration
const API_KEY = 'sk-abcdefg123456';
const API_URL = 'https://api.openai.com/v1/images/generations';
const MODEL = 'gpt-image-1';

// Output directory
const OUTPUT_DIR = path.join(__dirname, 'output');
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Create MCP server
const server = new McpServer({
  name: 'simple-openai-image-gen-mcp',
  version: '1.0.0'
});

// Define the simplest possible image generation tool
server.tool(
  'simple_generate_image',
  {
    // Only one required parameter: the prompt
    prompt: z.string().describe('Text description of the image you want to generate')
  },
  async (parameters) => {
    console.log(`[simple-mcp] Generating image for prompt: "${parameters.prompt}"`);

    try {
      // Make API request with minimal payload - just prompt and model
      const response = await fetch(API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
          prompt: parameters.prompt,
          model: MODEL
        })
      });

      // Handle error response
      if (!response.ok) {
        const error = await response.json();
        throw new Error(`API error: ${response.status} ${response.statusText} - ${error.error?.message || JSON.stringify(error)}`);
      }

      // Process successful response
      const data = await response.json();
      console.log(`[simple-mcp] Response received with ${data.data?.length || 0} images`);
      
      // Process each generated image
      const results = [];

      for (const item of data.data) {
        const base64Data = item.b64_json;
        const imageBuffer = Buffer.from(base64Data, 'base64');

        // Generate a simple timestamp-based filename
        const timestamp = new Date().toISOString().replace(/[:\.]/g, '-');
        const filename = `simple_image_${timestamp}.png`;
        const outputPath = path.join(OUTPUT_DIR, filename);
        
        // Save image to file
        fs.writeFileSync(outputPath, imageBuffer);
        console.log(`[simple-mcp] Image saved to: ${outputPath}`);

        results.push({
          local_path: outputPath,
          revised_prompt: item.revised_prompt || parameters.prompt
        });
      }

      // Return results to MCP client
      return {
        content: [{
          type: 'text',
          text: JSON.stringify(results)
        }]
      };
    } catch (error) {
      console.error('[simple-mcp] Error:', error);
      throw new Error(`Failed to generate image: ${error.message}`);
    }
  }
);

// Connect to transport
const transport = new StdioServerTransport();
server.connect(transport);

console.log('[simple-mcp] Simple OpenAI Image Generation MCP Server started.');