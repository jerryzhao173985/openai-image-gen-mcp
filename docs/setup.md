# OpenAI Image Generation MCP Setup Guide

This document provides detailed setup instructions for the OpenAI Image Generation MCP.

## Prerequisites

- Node.js (v16 or later)
- npm (v7 or later)
- OpenAI API key with access to GPT-image-1 model
- (Optional) Cloudflare ImgBed account for image hosting

## Installation

### 1. Clone or Download the Repository

```bash
git clone https://github.com/yourusername/openai-image-gen-mcp.git
cd openai-image-gen-mcp
```

### 2. Install Dependencies

```bash
npm install
```

This installs all required dependencies, including:
- `@modelcontextprotocol/sdk`
- `node-fetch`
- `zod`
- `sharp`
- `axios`
- `form-data`
- TypeScript development tools

### 3. Build the Project

```bash
npm run build
```

This compiles the TypeScript code into JavaScript in the `build` directory.

## Configuration

### API Key Configuration

You can provide your OpenAI API key in several ways:

1. **Environment Variable**:
   ```bash
   export OPENAI_API_KEY=your-api-key
   # or
   export API_KEY=your-api-key
   ```

2. **Command-Line Argument**:
   ```bash
   node build/index.js -e API_KEY your-api-key
   ```

3. **Embedded in Script**:
   Edit `run-with-key.sh` to include your API key:
   ```bash
   #!/bin/bash
   API_KEY="your-api-key" node build/index.js
   ```

### Optional ImgBed Configuration

If you want to use Cloudflare ImgBed for image hosting:

1. **Environment Variables**:
   ```bash
   export CF_IMGBED_UPLOAD_URL=your-upload-url
   export CF_IMGBED_API_KEY=your-imgbed-key
   ```

2. **Command-Line Arguments**:
   ```bash
   node build/index.js -e CF_IMGBED_UPLOAD_URL your-upload-url -e CF_IMGBED_API_KEY your-imgbed-key
   ```

### Output Directory Configuration

By default, images are saved to the `./output` directory. You can change this:

```bash
export DEFAULT_OUTPUT_DIR=/path/to/custom/output
```

## MCP Configuration for Claude

### 1. Create Configuration File

Create a file named `claude-mcp-config.json`:

```json
{
  "mcpServers": {
    "openai-image-gen": {
      "command": "node",
      "args": ["/full/path/to/openai-image-gen-mcp/build/index.js"],
      "env": {
        "OPENAI_API_KEY": "your-api-key"
      }
    }
  }
}
```

Replace `/full/path/to/` with the actual path to your installation.

### 2. Configure Claude

In Claude's settings, point to your configuration file.

## Startup Options

### Option 1: Using Start Script

The `start.sh` script provides a convenient way to start the server:

```bash
./start.sh
```

This checks for required configuration and starts the server.

### Option 2: Using Direct Key Script

The `run-with-key.sh` script has the API key embedded:

```bash
./run-with-key.sh
```

This is useful for testing and development.

### Option 3: Using Node Directly

```bash
node build/index.js
```

This requires environment variables or command-line arguments for configuration.

### Option 4: Using Simplified Versions

For testing and educational purposes:

```bash
# Direct image generation without MCP
node simple-generate.js

# Simple MCP with minimal features
node simple-mcp.js
```

## Testing

### 1. Using Debug Script

To test API connectivity directly:

```bash
node debug-api.js
```

### 2. Using Health Check

When the MCP is running, use the health_check tool to verify status.

## Common Issues

### API Key Problems

**Symptoms:**
- Error messages about invalid API key
- 401 Unauthorized responses

**Solutions:**
- Verify API key is correct and active
- Check for extra spaces or line breaks
- Ensure key has access to GPT-image-1 model

### Output Directory Issues

**Symptoms:**
- Errors saving images
- Missing output files

**Solutions:**
- Ensure output directory exists
- Check write permissions
- Verify path is correctly specified

### MCP Connection Issues

**Symptoms:**
- Claude can't connect to MCP
- Tool unavailable in Claude

**Solutions:**
- Ensure MCP server is running
- Check configuration path is correct
- Verify no firewall or network issues

## Advanced Setup

### Running as a Service

To run the MCP as a system service:

1. **systemd (Linux)**:
   Create a service file in `/etc/systemd/system/openai-image-mcp.service`:

   ```
   [Unit]
   Description=OpenAI Image Generation MCP
   After=network.target

   [Service]
   User=youruser
   WorkingDirectory=/path/to/openai-image-gen-mcp
   ExecStart=/usr/bin/node build/index.js
   Environment=OPENAI_API_KEY=your-api-key
   Restart=on-failure

   [Install]
   WantedBy=multi-user.target
   ```

2. **launchd (macOS)**:
   Create a plist file in `~/Library/LaunchAgents/com.user.openai-image-mcp.plist`

### Docker Deployment

A Dockerfile is not included by default, but you can create one:

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["node", "build/index.js"]
```

Build and run:

```bash
docker build -t openai-image-mcp .
docker run -e OPENAI_API_KEY=your-key openai-image-mcp
```