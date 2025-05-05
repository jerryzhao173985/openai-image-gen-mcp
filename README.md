# OpenAI Image Generation MCP

A Model Context Protocol (MCP) server for OpenAI image generation API. This MCP enables AI assistants like Claude to generate and edit images using OpenAI's GPT-image-1 model.

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [Detailed Documentation](#detailed-documentation)
- [License](#license)

## Features

- Generate images using OpenAI's image generation models
- Edit existing images with text prompts and optional masks
- Automatically save generated images to local storage
- Optionally upload generated images to Cloudflare ImgBed
- Health check endpoint to verify server status
- Multiple ways to provide API key (env var, command line, direct)

## Installation

1. Clone the repository and install dependencies:

```bash
git clone https://github.com/yourusername/openai-image-gen-mcp.git
cd openai-image-gen-mcp
npm install
```

2. Build the TypeScript project:

```bash
npm run build
```

## Quick Start

### 1. Using the Run Script (Recommended for Production)

The easiest way to start the full-featured MCP server:

```bash
./run-with-key.sh
```

This script has the API key embedded and starts the MCP server with all features.

### 2. Using Direct API Key (For Testing)

```bash
node hardcoded-key.js
```

This is a simplified version with the API key directly embedded in the code.

### 3. Using Environment Variables

```bash
export OPENAI_API_KEY=your-api-key
./start.sh
```

## Configuration

### Claude MCP Configuration

To connect Claude to this MCP, use this configuration file:

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

⚠️ **IMPORTANT**: Use the full-featured compiled version (`build/index.js`) for production. The simplified versions are for testing and education only.

## Available Tools

The MCP provides these tools to Claude:

1. **oai_generate_image** - Generate images from text prompts
2. **oai_edit_image** - Edit existing images with text prompts
3. **health_check** - Verify the server's health status

Example usage in Claude:

```
Generate an image of a sunset over mountains with a lake in the foreground.
```

Claude will use the appropriate MCP tool to create the image.

## Detailed Documentation

For more detailed information, please see:

- [**Architecture**](docs/architecture.md) - System design and components
- [**Pipeline**](docs/pipeline.md) - Development and request processing pipeline
- [**Guidelines**](docs/guidelines.md) - Best practices and usage guidelines
- [**Explanation**](docs/explanation.md) - Detailed explanation of the code and APIs

## Directory Structure

```
openai-image-gen-mcp/
├── build/              # Compiled JavaScript code
├── docs/               # Documentation files
├── output/             # Generated images
├── src/                # TypeScript source code
│   ├── config.js       # Configuration management
│   └── index.ts        # Main MCP server implementation
├── *.sh                # Helper scripts
├── *.js                # Simplified versions and utilities
└── *.json              # Configuration files
```

## Troubleshooting

If you encounter problems:

1. Check that your API key is valid and properly formatted
2. Ensure the output directory exists and is writable
3. Run the health check to verify server status
4. Check logs for detailed error information
5. Try the simplified version to isolate issues

For more help, see the [Troubleshooting section](docs/guidelines.md#error-handling-guidelines) in the guidelines.

## License

ISC