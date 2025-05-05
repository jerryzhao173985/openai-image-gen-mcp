# OpenAI GPT-Image-1 API and Model Context Protocol Integration

This document explains how OpenAI's image generation API works, how it's integrated with the Model Context Protocol (MCP), and provides a deep dive into the code patterns and libraries used.

## Table of Contents

- [OpenAI Image Generation API](#openai-image-generation-api)
  - [API Endpoints](#api-endpoints)
  - [API Parameters](#api-parameters)
  - [Default Settings](#default-settings)
- [Model Context Protocol (MCP)](#model-context-protocol-mcp)
  - [What is MCP?](#what-is-mcp)
  - [MCP Server Components](#mcp-server-components)
  - [MCP Tool Definition](#mcp-tool-definition)
- [Code Patterns and Libraries](#code-patterns-and-libraries)
  - [HTTP Requests: node-fetch vs axios](#http-requests-node-fetch-vs-axios)
  - [Parameter Validation with Zod](#parameter-validation-with-zod)
  - [Image Processing: Sharp](#image-processing-sharp)
  - [File System Operations](#file-system-operations)
- [Implementation Approaches](#implementation-approaches)
  - [Simple Direct API Call](#simple-direct-api-call)
  - [Simple MCP Implementation](#simple-mcp-implementation)
  - [Full-Featured MCP](#full-featured-mcp)
- [Troubleshooting](#troubleshooting)

## OpenAI Image Generation API

### API Endpoints

The OpenAI Image API has two main endpoints:

1. **Generations API**: Used to create new images from text prompts
   ```
   https://api.openai.com/v1/images/generations
   ```

2. **Edits API**: Used to edit existing images based on prompts
   ```
   https://api.openai.com/v1/images/edits
   ```

### API Parameters

For the generations API, here are the key parameters:

```javascript
{
  "prompt": "A beautiful sunset over mountains", // Required
  "model": "gpt-image-1",                        // Required, defaults to DALL-E 3
  "n": 1,                                        // Optional, number of images (1-10)
  "quality": "standard",                         // Optional: "standard" or "hd"
  "size": "1024x1024",                           // Optional: dimensions
  "style": "vivid",                              // Optional: "vivid" or "natural"
  "response_format": "b64_json"                  // How to return images
}
```

### Default Settings

If you only provide a prompt and model, OpenAI will use these defaults:
- **n**: 1 (generate one image)
- **size**: 1024x1024 (square image)
- **quality**: "standard" (vs. "hd" which costs more)
- **style**: "vivid" (more dramatic and vibrant)
- **response_format**: "url" in API directly, but our code uses "b64_json"

## Model Context Protocol (MCP)

### What is MCP?

The Model Context Protocol (MCP) is a standardized way for AI models to interact with tools and services. It allows AI assistants like Claude to use external tools like image generation.

Key concepts:
- **MCP Server**: A service that exposes tools to AI models
- **Tools**: Functions that the AI can call to accomplish tasks
- **Transport**: How the MCP server communicates (e.g., stdio)

### MCP Server Components

In our code, these components are implemented using the `@modelcontextprotocol/sdk` package:

```javascript
const { McpServer } = require('@modelcontextprotocol/sdk/server/mcp.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');

// Create server instance
const server = new McpServer({
  name: 'openai-image-gen-mcp',
  version: '1.0.0'
});

// Define tools (see next section)

// Connect to transport (I/O communication)
const transport = new StdioServerTransport();
server.connect(transport);
```

### MCP Tool Definition

MCP tools consist of:
1. A name
2. A schema (parameters with validation)
3. An implementation function

Here's the simplified version:

```javascript
server.tool(
  'simple_generate_image',  // Tool name
  {
    // Parameter schema with validation
    prompt: z.string().describe('Text description of the image')
  },
  // Implementation function
  async (parameters) => {
    // Make API call
    // Process result
    return {
      content: [{
        type: 'text',
        text: JSON.stringify(results)
      }]
    };
  }
);
```

## Code Patterns and Libraries

### HTTP Requests: node-fetch vs axios

Our code uses two HTTP client libraries:

1. **node-fetch**: Simpler, Promise-based API similar to browser's fetch
   ```javascript
   const response = await fetch(API_GENERATIONS_URL, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'Authorization': `Bearer ${API_KEY}`
     },
     body: JSON.stringify(payload)
   });
   ```

2. **axios**: More feature-rich HTTP client with easier request/response handling
   ```javascript
   const response = await axios.post(uploadUrlWithAuth, form, {
     headers: Object.assign({}, form.getHeaders()),
     timeout: 60000
   });
   ```

Both libraries are valid choices. node-fetch is closer to web standards, while axios has more features.

### Parameter Validation with Zod

Zod is used for input validation and type checking. The MCP uses it to define the shape of tool parameters:

```javascript
const { z } = require('zod');

// Define parameter schema
{
  prompt: z.string().max(32000).describe('Text description...'),
  n: z.number().int().min(1).max(10).nullable().optional().describe('Number of images...'),
  size: z.enum(['1024x1024', '1536x1024', '1024x1536']).nullable().optional()
}
```

This ensures:
- Required parameters are provided
- Parameters match expected types
- Values are within allowed ranges 
- Enums only accept specific values

### Image Processing: Sharp

Sharp is a high-performance Node.js image processing library. In our code, it's used to save the base64-encoded images to disk:

```javascript
const sharp = require('sharp');

// Save image with sharp
await sharp(imageBuffer).toFile(outputPath);
```

Benefits of Sharp:
- Fast image processing
- Memory efficient
- Supports various formats and operations

### File System Operations

Several approaches to file system operations are used:

1. **fs/promises** API (modern async approach):
   ```javascript
   const { mkdir, readFile } = require('fs/promises');
   
   await mkdir(dirPath, { recursive: true });
   const imageBuffer = await readFile(imagePath);
   ```

2. **fs with promisify** (older style made async):
   ```javascript
   const { promisify } = require('util');
   const writeFile = promisify(fs.writeFile);
   
   await writeFile(filePath, imageBuffer);
   ```

3. **fs synchronous** (simpler but blocking):
   ```javascript
   fs.writeFileSync(outputPath, imageBuffer);
   ```

## Implementation Approaches

### Simple Direct API Call

The simplest approach is a direct API call without MCP (see `simple-generate.js`):

```javascript
async function generateSimpleImage(prompt) {
  // 1. Send API request with minimal payload
  const response = await fetch(GENERATIONS_URL, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`
    },
    body: JSON.stringify({
      prompt: prompt,
      model: 'gpt-image-1'
    })
  });
  
  // 2. Process response
  const data = await response.json();
  
  // 3. Save image
  const imageData = data.data[0].b64_json;
  const imageBuffer = Buffer.from(imageData, 'base64');
  await writeFile(filePath, imageBuffer);
  
  return filePath;
}
```

### Simple MCP Implementation

The `simple-mcp.js` file implements a minimal MCP server with just one tool that only requires a prompt:

```javascript
server.tool(
  'simple_generate_image',
  {
    prompt: z.string().describe('Text description of the image')
  },
  async (parameters) => {
    // Make API request
    // Process & save images
    // Return results
  }
);
```

### Full-Featured MCP

The full implementation in `index.ts` provides:
- Multiple tools (generation & editing)
- Comprehensive parameter options
- Optional image uploads to external services
- Better error handling
- Health check tool

## Troubleshooting

If you encounter issues with the image generation:

1. **API Key Issues**: Ensure the API key is valid and properly configured
   ```
   API_KEY = cliArgs.API_KEY || cliArgs.OPENAI_API_KEY || process.env.OPENAI_API_KEY || process.env.API_KEY;
   ```

2. **Environment Variables**: Check that environment variables are correctly set and not containing unresolved placeholders
   ```
   if (API_KEY && API_KEY.includes('${env:')) {
     // Environment variable not properly resolved
   }
   ```

3. **API Responses**: The code handles API errors by checking response status and parsing error details
   ```javascript
   if (!response.ok) {
     const error = await response.json();
     throw new Error(`API error: ${response.status} ${response.statusText} - ${error.error.message}`);
   }
   ```

4. **File System Issues**: Ensure output directories exist and are writable
   ```javascript
   // Ensure directory exists before writing files
   await ensureDirectoryExists(outputDir);
   ```

## Conclusion

The OpenAI image generation API provides a powerful way to create images from text prompts. By wrapping it in an MCP server, we enable AI assistants to generate images on demand with configurable parameters.

The simplified implementations (`simple-generate.js` and `simple-mcp.js`) demonstrate the minimum code needed to get started, while the full implementation in `index.ts` provides more features and robustness for production use.

To use the simplified version with Claude, configure the MCP in Claude's settings to use `claude-simple-mcp.json`, which will provide Claude with the `simple_generate_image` tool.