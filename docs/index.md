# OpenAI Image Generation MCP Documentation

Welcome to the documentation for the OpenAI Image Generation MCP. This MCP (Model Context Protocol) server enables AI assistants like Claude to generate and edit images using OpenAI's GPT-image-1 model.

## Documentation Index

### Getting Started
- [Setup Guide](setup.md) - Complete installation and setup instructions
- [Quick Start Guide](../README.md#quick-start) - Get up and running quickly

### Core Documentation
- [Architecture](architecture.md) - System design and component interactions
- [Pipeline](pipeline.md) - Development and request processing pipeline
- [Guidelines](guidelines.md) - Best practices and usage guidelines
- [Explanation](explanation.md) - Detailed explanation of the code and APIs

### Reference
- [API Tools Reference](../README.md#available-tools) - Available MCP tools
- [Configuration Reference](setup.md#configuration) - Configuration options
- [Troubleshooting Guide](../README.md#troubleshooting) - Common issues and solutions

## Project Overview

The OpenAI Image Generation MCP provides a bridge between AI assistants (like Claude) and OpenAI's image generation capabilities. This allows the AI to generate and manipulate images based on text prompts.

### Key Features

- Generate images from text descriptions
- Edit existing images with text prompts
- Save generated images locally and optionally to cloud storage
- Health check to monitor system status
- Flexible configuration options

### Architecture Summary

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Claude    │ --> │  MCP Server │ --> │ OpenAI API  │ --> │ File System │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                          │                                        ↑
                          │                                        │
                          ▼                                        │
                    ┌─────────────┐                                │
                    │  ImgBed     │ ------------------------------┘
                    │  (Optional) │
                    └─────────────┘
```

### Using This Documentation

- If you're new to the project, start with the [Setup Guide](setup.md)
- For high-level understanding, read the [Architecture](architecture.md) document
- For best practices, refer to the [Guidelines](guidelines.md)
- For in-depth technical details, see the [Explanation](explanation.md)

## Contributing

This project is designed to be extended and improved. Potential areas for enhancement include:

- Additional image processing options
- Support for other image generation providers
- Enhanced error handling and reporting
- User interface for configuration and monitoring
- Additional output formats and storage options

## License

This project is licensed under the ISC License - see the LICENSE file for details.