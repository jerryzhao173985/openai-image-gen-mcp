# OpenAI Image Generation MCP Guidelines

This document provides guidelines and best practices for using the OpenAI Image Generation MCP.

## Configuration Guidelines

### API Key Management

The API key can be provided in several ways, in order of precedence:

1. Command-line argument:
   ```bash
   node build/index.js -e API_KEY your-api-key
   ```

2. Direct environment variable:
   ```bash
   export OPENAI_API_KEY=your-api-key
   node build/index.js
   ```

3. Configuration file:
   ```bash
   ./run-with-key.sh
   ```

**Security Best Practices:**
- Never commit API keys to version control
- Use environment variables in production
- Rotate keys periodically
- Set appropriate permissions on files containing keys

### MCP Configuration

When configuring Claude to use this MCP:

1. Create a JSON configuration file:
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

2. Point Claude to this configuration.

**Best Practices:**
- Use absolute paths to avoid working directory issues
- Include only necessary environment variables
- Use the built version (build/index.js) for stability

## Tool Usage Guidelines

### Image Generation

The `oai_generate_image` tool has several parameters:

1. **Required:**
   - `prompt` - Text description of the desired image(s)

2. **Optional (with OpenAI defaults):**
   - `n` (1) - Number of images to generate
   - `size` ('1024x1024') - Image dimensions
   - `quality` ('standard') - Image quality
   - `background` - Background transparency
   - `moderation` - Content moderation level
   - `output_compression` - Compression level (0-100)
   - `output_format` - Output format (png, jpeg, webp)

**Best Practices:**
- Keep prompts clear and specific
- Use shorter prompts for better results
- Specify size for non-standard aspect ratios
- Include appropriate context for better interpretation

### Image Editing

The `oai_edit_image` tool requires:

1. **Required:**
   - `image_path` - Path to the image file
   - `prompt` - Description of the desired edits

2. **Optional:**
   - `mask_path` - Path to a mask image that indicates which areas to edit
   - `n` - Number of variations
   - `size` - Output size
   - `output_format` - Output format

**Best Practices:**
- Use clear masks to indicate edit regions
- Keep prompts focused on the specific edit
- Ensure images are in valid formats (PNG recommended)
- Test with simple edits before complex ones

## Performance Guidelines

### Optimizing Image Generation

To optimize performance:

1. **Batch requests** - Generate multiple images at once instead of sequential calls
2. **Use appropriate sizes** - Larger sizes take longer to generate
3. **Quality settings** - "standard" is faster than "hd"
4. **Output format** - Different formats have different performance characteristics

### Output Management

The MCP saves generated images in two ways:

1. **Local storage** - All images are saved to the configured output directory
2. **Remote storage** - If configured, images are uploaded to Cloudflare ImgBed

**Best Practices:**
- Monitor disk space for local storage
- Implement cleanup for old images
- Test remote storage connectivity before relying on it

## Error Handling Guidelines

### Common Errors

1. **API Key Issues**
   - Invalid key format
   - Expired or revoked key
   - Key without proper permissions

2. **Parameter Errors**
   - Invalid parameter types
   - Out-of-range values
   - Invalid combinations

3. **Content Policy Issues**
   - Prompts that violate OpenAI's content policy
   - Unsafe content detection

**Best Practices:**
- Check API key validity separately before using MCP
- Validate inputs before sending to MCP
- Handle errors gracefully in the client

### Debugging

For debugging:

1. **Health Check** - Use the `health_check` tool to verify MCP status
2. **Test Scripts** - Use `debug-api.js` for direct API testing
3. **Simple MCP** - Use `simple-mcp.js` for minimal testing

## Upgrading Guidelines

When upgrading:

1. Check for OpenAI API changes
2. Update dependencies with `npm update`
3. Rebuild with `npm run build`
4. Test with sample prompts
5. Update configuration if needed

## Integration Guidelines

### Integrating with Other Systems

The MCP can be integrated with other systems by:

1. **HTTP Bridge** - Create an HTTP service that communicates with the MCP
2. **File System Integration** - Use the saved image files
3. **Direct Import** - Import the modules directly in another Node.js application

**Best Practices:**
- Prefer MCP for AI integrations
- Use direct API calls for other integrations
- Document integration points