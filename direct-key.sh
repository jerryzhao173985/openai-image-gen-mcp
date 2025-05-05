#!/bin/bash

if [ -z "$1" ]; then
  echo "Usage: ./direct-key.sh YOUR_API_KEY"
  echo "Example: ./direct-key.sh sk-abcdefg123456"
  exit 1
fi

echo "Starting OpenAI Image Generation MCP with provided API key"
API_KEY="$1" node build/index.js