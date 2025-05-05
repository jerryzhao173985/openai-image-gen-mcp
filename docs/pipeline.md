# OpenAI Image Generation MCP Development Pipeline

This document explains the full pipeline of developing and using the OpenAI Image Generation MCP, from setup to execution.

## Development Pipeline

### 1. Project Setup

The project is set up as a TypeScript Node.js application:

```bash
mkdir openai-image-gen-mcp
cd openai-image-gen-mcp
npm init -y
npm install typescript @types/node --save-dev
npx tsc --init
```

Key dependencies:
- `@modelcontextprotocol/sdk` - For MCP server implementation
- `node-fetch` - For HTTP requests to OpenAI API
- `zod` - For parameter validation
- `sharp` - For image processing
- `axios` - Alternative HTTP client (used for uploads)
- `form-data` - For multipart/form-data requests

### 2. Code Implementation

The implementation follows these steps:

1. **Configuration Management** (`src/config.js`):
   - Read configuration from environment variables
   - Support command-line arguments
   - Set defaults for required values

2. **Server Setup** (`src/index.ts`):
   - Create MCP server instance
   - Configure server metadata
   - Set up transport (stdio)

3. **Tool Implementation**:
   - Define tool schemas with Zod
   - Implement tool handlers
   - Handle errors and edge cases

4. **Image Processing**:
   - Save generated images to disk
   - Optional: Upload to external storage

### 3. Build Process

The TypeScript code is compiled to JavaScript:

```bash
npm run build
```

This uses the TypeScript compiler (tsc) to transpile TypeScript files to JavaScript according to the configuration in `tsconfig.json`.

### 4. Execution

The MCP server can be started in several ways:

1. **Direct execution** - Using the compiled JavaScript:
   ```bash
   node build/index.js
   ```

2. **Start script** - Using the helper script:
   ```bash
   ./start.sh
   ```

3. **With explicit API key** - Using the API key directly:
   ```bash
   ./run-with-key.sh
   ```

4. **Simple version** - For testing only:
   ```bash
   node simple-mcp.js
   ```

### 5. Integration with Claude

Claude uses the MCP server through a configuration file that specifies:
- The command to run
- Any arguments
- Environment variables

Example (`claude-mcp-config.json`):
```json
{
  "mcpServers": {
    "openai-image-gen": {
      "command": "node",
      "args": ["/Users/jerry/openai-image-gen-mcp/build/index.js"]
    }
  }
}
```

## Request Processing Pipeline

When the MCP server receives a request, it follows this pipeline:

1. **Request Parsing**:
   - Parse JSON request
   - Validate against tool schema
   - Extract parameters

2. **Parameter Processing**:
   - Apply defaults for missing parameters
   - Validate parameter values

3. **API Request**:
   - Build OpenAI API request
   - Send HTTP request
   - Handle errors

4. **Response Processing**:
   - Parse API response
   - Extract image data
   - Save images to disk

5. **Optional Upload**:
   - Upload images to external service if configured

6. **Response Construction**:
   - Build MCP response
   - Include URLs or paths
   - Return to client

## Error Handling

The pipeline includes error handling at multiple levels:

1. **Input Validation** - Using Zod to validate input parameters
2. **API Errors** - Handling HTTP errors from OpenAI API
3. **Processing Errors** - Handling errors during image processing
4. **Response Errors** - Handling errors in response construction

## Testing

Testing is done through various scripts:

1. **Direct API Test** (`debug-api.js`) - Tests the OpenAI API directly
2. **Simple Generation** (`simple-generate.js`) - Tests image generation without MCP
3. **Health Check** - MCP endpoint to verify server status

## Versioning and Deployment

The code includes versioning information:
- MCP server version
- Protocol version
- Tool versions

Deployment is handled by installing the package and running the scripts. The API key is required either via environment variables or direct configuration.