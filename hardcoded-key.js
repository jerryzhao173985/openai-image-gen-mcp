#!/usr/bin/env node

// Import dependencies
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const { z } = require('zod');
const fetch = require('node-fetch');
const path = require('path');
const fs = require('fs');
const { mkdir } = require('fs/promises');
const { randomUUID } = require('crypto');

// Hardcoded configuration
const API_KEY = 'sk-abcdefg123456';
const API_GENERATIONS_URL = 'https://api.openai.com/v1/images/generations';
const DEFAULT_MODEL = 'gpt-image-1';
const DEFAULT_OUTPUT_DIR = './output';

// Helper function to ensure directory exists
async function ensureDirectoryExists(dirPath) {
    try {
        await mkdir(dirPath, { recursive: true });
    } catch (error) {
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }
}

// Create MCP server
const server = new McpServer({
    name: 'openai-image-gen-mcp',
    version: '1.0.0'
});

// Display API key status
console.log(`[openai-image-gen-mcp] Using direct API key: ${API_KEY.substring(0, 5)}...${API_KEY.substring(API_KEY.length - 4)}`);

// Define image generation tool
server.tool(
    'oai_generate_image',
    {
        prompt: z.string().max(32000).describe('A text description of the desired image(s). Maximum length is 32000 characters.'),
        n: z.number().int().min(1).max(10).optional().describe('The number of images to generate. Must be between 1 and 10.'),
        size: z.enum(['1024x1024', '1536x1024', '1024x1536', 'auto']).optional().describe('The size of the generated images.'),
        quality: z.enum(['auto', 'high', 'medium', 'low']).optional().describe('The quality of the image that will be generated.'),
    },
    async (parameters) => {
        // Build payload
        const payload = {
            prompt: parameters.prompt,
            model: DEFAULT_MODEL,
        };

        // Add optional parameters
        if (parameters.n !== undefined) payload.n = parameters.n;
        if (parameters.size !== undefined) payload.size = parameters.size;
        if (parameters.quality !== undefined) payload.quality = parameters.quality;

        try {
            console.log(`[openai-image-gen-mcp] Sending request to OpenAI API: ${JSON.stringify(payload)}`);
            
            // Make API request
            const response = await fetch(API_GENERATIONS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify(payload)
            });

            // Handle error response
            if (!response.ok) {
                const error = await response.json();
                console.error(`[openai-image-gen-mcp] API error: ${response.status} ${response.statusText}`);
                console.error(error);
                throw new Error(`API error: ${response.status} ${response.statusText} - ${error.error?.message || JSON.stringify(error)}`);
            }

            // Process successful response
            const data = await response.json();
            console.log(`[openai-image-gen-mcp] Response received with ${data.data?.length || 0} images`);
            
            const results = [];
            
            // Process each generated image
            for (const item of data.data) {
                const base64Data = item.b64_json;
                const imageBuffer = Buffer.from(base64Data, 'base64');

                // Ensure output directory exists
                await ensureDirectoryExists(DEFAULT_OUTPUT_DIR);

                // Generate filename and save image
                const filename = `openai_${randomUUID()}.png`;
                const outputPath = path.join(DEFAULT_OUTPUT_DIR, filename);
                
                fs.writeFileSync(outputPath, imageBuffer);
                console.log(`[openai-image-gen-mcp] Image saved to: ${outputPath}`);

                results.push({
                    local_path: outputPath,
                    revised_prompt: item.revised_prompt
                });
            }

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(results)
                }]
            };
        } catch (error) {
            console.error('[openai-image-gen-mcp] Error:', error);
            throw new Error(`Failed to generate image: ${error.message}`);
        }
    }
);

// Add health check endpoint
server.tool(
    'health_check',
    {},
    async () => {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    status: 'ok',
                    version: '1.0.0',
                    api_status: 'configured',
                    api_key_first_5: API_KEY.substring(0, 5)
                })
            }]
        };
    }
);

// Connect to transport
const transport = new StdioServerTransport();
server.connect(transport);

console.log('OpenAI Image Generation MCP Server started with direct API key.');