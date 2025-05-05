#!/bin/bash

# Display startup banner
echo "===================================="
echo "OpenAI Image Generation MCP Server"
echo "===================================="

# Check for OpenAI API key and export from OPENAI_API_KEY env var if available
if [ -n "$OPENAI_API_KEY" ]; then
  echo "✅ OPENAI_API_KEY found in environment"
  # Explicitly set API_KEY for the process to ensure it's correctly read
  export API_KEY="$OPENAI_API_KEY"
  echo "✅ API_KEY set from OPENAI_API_KEY"
else
  echo "⚠️  Warning: OPENAI_API_KEY environment variable not found."
  echo "You can set it with: export OPENAI_API_KEY=your_key_here"
  echo "Continuing anyway, but the MCP will not generate images without a valid API key."
fi

# Check if build directory exists, if not build the project
if [ ! -d "./build" ]; then
  echo "📦 Building the project..."
  npm run build
fi

# Start the MCP server
echo "🚀 Starting MCP server..."
node build/index.js

# This will only execute if the server crashes or is terminated
echo "MCP server stopped."