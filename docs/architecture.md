# OpenAI Image Generation MCP Architecture

This document explains the architecture of the OpenAI Image Generation MCP, including components, interactions, and design decisions.

## System Architecture

The system follows a layered architecture:

```
┌─────────────────────────┐
│      Claude Client      │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│      MCP Protocol       │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│       MCP Server        │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│     OpenAI API Client   │
└───────────┬─────────────┘
            │
            ▼
┌─────────────────────────┐
│      OpenAI API         │
└─────────────────────────┘
```

### Components

1. **Claude Client**: The AI assistant that uses the MCP tools.
2. **MCP Protocol**: Standardized protocol for tool invocation and response.
3. **MCP Server**: Server implementation that manages tools and handles requests.
4. **OpenAI API Client**: Client that communicates with OpenAI's API.
5. **OpenAI API**: External service that generates images.

### Additional Components

- **File System**: Stores generated images locally.
- **ImgBed Service**: Optional external service for image hosting.

## Code Architecture

The codebase is organized into the following components:

### 1. Configuration (`config.js`)

Handles environment variables, command-line arguments, and defaults.

```javascript
module.exports = {
    API_KEY,              // OpenAI API key
    API_GENERATIONS_URL,  // Endpoint for image generations
    API_EDITS_URL,        // Endpoint for image edits
    DEFAULT_MODEL,        // Default model for generation
    CF_IMGBED_UPLOAD_URL, // URL for ImgBed uploads
    CF_IMGBED_API_KEY,    // API key for ImgBed
    DEFAULT_OUTPUT_DIR    // Local directory for saving images
};
```

### 2. Server Setup (`index.ts`)

Initializes the MCP server and defines tools.

```javascript
const server = new McpServer({
    name: 'openai-image-gen-mcp',
    version: '1.0.0'
});

server.tool('oai_generate_image', { /* schema */ }, async (parameters) => {
    /* implementation */
});

server.tool('oai_edit_image', { /* schema */ }, async (parameters) => {
    /* implementation */
});

server.tool('health_check', {}, async () => {
    /* implementation */
});

const transport = new StdioServerTransport();
server.connect(transport);
```

### 3. Helper Functions

Modular helper functions for specific tasks:

- `ensureDirectoryExists`: Creates directories as needed
- `uploadToCfImgbed`: Uploads images to external service
- `readImageFile`: Validates and reads image files

### 4. Tool Implementations

Each tool is implemented as an async function that:
1. Validates inputs
2. Calls OpenAI API
3. Processes response
4. Saves results
5. Returns formatted response

## Data Flow

### Image Generation Flow

1. **MCP Request Received**:
   ```json
   {
     "name": "oai_generate_image",
     "parameters": {
       "prompt": "A beautiful mountain landscape",
       "size": "1024x1024"
     }
   }
   ```

2. **Parameter Processing**:
   - Validate required parameters
   - Apply defaults for missing parameters
   - Build API payload

3. **API Request**:
   ```json
   {
     "prompt": "A beautiful mountain landscape",
     "model": "gpt-image-1",
     "size": "1024x1024"
   }
   ```

4. **API Response**:
   ```json
   {
     "created": 1683000000,
     "data": [
       {
         "b64_json": "base64-encoded-image-data",
         "revised_prompt": "A beautiful mountain landscape with snow-capped peaks and a clear blue sky"
       }
     ]
   }
   ```

5. **Image Processing**:
   - Decode base64 image data
   - Save to local file
   - Optionally upload to external service

6. **MCP Response**:
   ```json
   {
     "content": [
       {
         "type": "text",
         "text": "[{\"local_path\":\"/path/to/image.png\",\"url\":\"https://example.com/image.png\",\"revised_prompt\":\"...\"}]"
       }
     ]
   }
   ```

## Design Decisions

### 1. Typescript vs. JavaScript

The main codebase uses TypeScript for several benefits:
- Strong type checking
- Better IDE integration
- Improved maintainability
- Interface definitions

The simple examples use JavaScript for:
- Easier readability for newcomers
- No compilation step
- Direct execution

### 2. Environment Variable Handling

Multiple sources for configuration are supported (command line, environment variables, defaults) to provide flexibility in different deployment scenarios:
- Development environments
- Production systems
- CI/CD pipelines
- Local testing

### 3. Image Storage Strategy

Dual storage strategy:
- **Local storage**: Always save locally for reliability
- **Remote storage**: Optional upload for accessibility

### 4. Error Handling

Layered error handling approach:
- **API-level errors**: Handle OpenAI API errors (auth, rate limits, etc.)
- **Processing errors**: Handle image processing issues
- **MCP protocol errors**: Handle protocol-specific errors

### 5. Tool Design

Tools are designed with:
- **Minimal requirements**: Only prompt is required
- **Sensible defaults**: OpenAI defaults used where possible
- **Comprehensive options**: All API options exposed

## Dependencies

The system depends on several key libraries:

1. **@modelcontextprotocol/sdk**: For MCP server implementation
2. **node-fetch/axios**: For HTTP requests
3. **zod**: For schema validation
4. **sharp**: For image processing
5. **form-data**: For multipart request construction

## Performance Considerations

- **Memory usage**: Image data can be large, especially with multiple images
- **Disk space**: Generated images accumulate over time
- **Rate limits**: OpenAI API has rate limits
- **Response time**: Image generation can take several seconds

## Security Considerations

- **API key protection**: Keys should be secured and not committed
- **Content validation**: Input validation prevents injection attacks
- **File access restrictions**: Local file operations are restricted to designated directories
- **Error message sanitization**: Detailed errors are logged but not exposed to users