#!/bin/bash

# The API key from .env.example
API_KEY='sk-abcdefg123456'

echo "Starting OpenAI Image Generation MCP with API key"
echo "API key starts with: ${API_KEY:0:20}..."

# Direct export of API key to environment variable
export API_KEY="$API_KEY"

# Run the server with the API key directly set
node build/index.js