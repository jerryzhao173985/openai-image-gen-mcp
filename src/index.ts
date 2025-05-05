#!/usr/bin/env node
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { API_KEY, API_GENERATIONS_URL, API_EDITS_URL, DEFAULT_MODEL, CF_IMGBED_UPLOAD_URL, CF_IMGBED_API_KEY, DEFAULT_OUTPUT_DIR } from './config';
import fetch from 'node-fetch';
import { z } from 'zod';
import axios from 'axios';
import sharp from 'sharp';
import path from 'path';
import { mkdir, readFile } from 'fs/promises';
import { randomUUID } from 'crypto';
import FormData from 'form-data';
import fs from 'fs';

// Helper function to ensure directory exists
async function ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
        await mkdir(dirPath, { recursive: true });
    } catch (error: any) {
        if (error.code !== 'EEXIST') {
            throw error;
        }
    }
}

// Helper function to upload image to CF ImgBed
async function uploadToCfImgbed(imageData: Buffer, filename: string): Promise<string | null> {
    if (!CF_IMGBED_UPLOAD_URL || !CF_IMGBED_API_KEY) {
        console.warn('[openai-image-gen-mcp] CF ImgBed URL or API Key not configured. Skipping upload.');
        return null;
    }

    const form = new FormData();
    form.append('file', imageData, filename);

    // Check if the base URL already contains query parameters
    const separator = CF_IMGBED_UPLOAD_URL.includes('?') ? '&' : '?';
    const uploadUrlWithAuth = `${CF_IMGBED_UPLOAD_URL}${separator}authCode=${CF_IMGBED_API_KEY}`;

    try {
        console.info(`[openai-image-gen-mcp] Uploading image '${filename}' to CF ImgBed...`);
        const response = await axios.post(uploadUrlWithAuth, form, {
            headers: {
                ...form.getHeaders(),
            },
            timeout: 60000, // 60 second timeout for upload
        });

        if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0 && response.data[0]?.src) {
            const imagePathSegment = response.data[0].src;
            // Construct the full URL based on the upload URL's origin
            const parsedUploadUrl = new URL(CF_IMGBED_UPLOAD_URL);
            const baseUrlStr = `${parsedUploadUrl.protocol}//${parsedUploadUrl.host}`;
            const fullUrl = new URL(imagePathSegment, baseUrlStr).toString();
            console.info(`[openai-image-gen-mcp] Image uploaded successfully: ${fullUrl}`);
            return fullUrl;
        } else {
            console.error(`[openai-image-gen-mcp] Unexpected response format from ImgBed. Status: ${response.status}. Headers: ${JSON.stringify(response.headers)}. Data: ${JSON.stringify(response.data)}`);
            return null;
        }
    } catch (error) {
        let errorMessage = 'Unknown error during ImgBed upload.';
        if (axios.isAxiosError(error)) {
            const responseInfo = error.response ? ` Status: ${error.response.status}. Headers: ${JSON.stringify(error.response.headers)}. Data: ${JSON.stringify(error.response.data)}` : ' No response received.';
            const requestInfo = error.request ? ` Request data: ${JSON.stringify(error.config?.data)}.` : ' No request object found.';
            errorMessage = `Axios error: ${error.message}.${responseInfo}${requestInfo}`;
        } else if (error instanceof Error) {
            errorMessage = `Generic error: ${error.message}. Stack: ${error.stack}`;
        } else {
            errorMessage = `Caught non-Error object: ${String(error)}`;
        }
        console.error(`[openai-image-gen-mcp] Failed to upload image to ImgBed: ${errorMessage}`);
        return null;
    }
}


// Function to validate and read image
async function readImageFile(imagePath: string): Promise<Buffer> {
    try {
        // Check if file exists and is readable
        await fs.promises.access(imagePath, fs.constants.R_OK);
        
        // Read the file
        const imageBuffer = await readFile(imagePath);
        return imageBuffer;
    } catch (error: any) {
        throw new Error(`Failed to read image file: ${error.message}`);
    }
}

// Print API key status on startup
console.log(`[openai-image-gen-mcp] Environment variables:`, {
    OPENAI_API_KEY_SET: !!process.env.OPENAI_API_KEY,
    API_KEY_SET: !!process.env.API_KEY,
    ENV_KEYS: Object.keys(process.env).filter(key => key.includes('KEY') || key.includes('key'))
});

if (API_KEY) {
    const maskedKey = `${API_KEY.substring(0, 5)}...${API_KEY.substring(API_KEY.length - 4)}`;
    console.log(`[openai-image-gen-mcp] Using API key: ${maskedKey}`);
} else {
    console.error(`[openai-image-gen-mcp] WARNING: No API key found. Please provide OPENAI_API_KEY environment variable.`);
}

const server = new McpServer({
    name: 'openai-image-gen-mcp',
    version: '1.0.0'
});

// Define the generateImage tool
server.tool(
    'oai_generate_image',
    {
        prompt: z.string().max(32000).describe('A text description of the desired image(s). Maximum length is 32000 characters.'),
        background: z.enum(['transparent', 'opaque', 'auto']).nullable().optional().describe('Allows to set transparency for the background. Must be one of transparent, opaque or auto (default value).'),
        moderation: z.enum(['low', 'auto']).nullable().optional().describe('Control the content-moderation level for images generated by gpt-image-1. Must be either low for less restrictive filtering or auto (default value).'),
        n: z.number().int().min(1).max(10).nullable().optional().describe('The number of images to generate. Must be between 1 and 10.'),
        output_compression: z.number().int().min(0).max(100).nullable().optional().describe('The compression level (0-100%) for the generated images. This parameter is only supported for gpt-image-1 with the webp or jpeg output formats, and defaults to 100.'),
        output_format: z.enum(['png', 'jpeg', 'webp']).nullable().optional().describe('The format in which the generated images are returned. Must be one of png, jpeg, or webp.'),
        quality: z.enum(['auto', 'high', 'medium', 'low']).nullable().optional().describe('The quality of the image that will be generated. Must be one of auto, high, medium, or low for gpt-image-1.'),
        size: z.enum(['1024x1024', '1536x1024', '1024x1536', 'auto']).nullable().optional().describe('The size of the generated images. Must be one of 1024x1024, 1536x1024 (landscape), 1024x1536 (portrait), or auto (default value) for gpt-image-1.'),
    },
    async (parameters) => {
        if (!API_KEY) {
            throw new Error('OpenAI API key is not configured.');
        }

        const payload: any = {
            prompt: parameters.prompt,
            model: DEFAULT_MODEL || 'gpt-image-1', // Default to gpt-image-1 if DEFAULT_MODEL is not set
        };

        // Add optional parameters if provided
        if (parameters.background !== undefined) payload.background = parameters.background;
        if (parameters.moderation !== undefined) payload.moderation = parameters.moderation;
        if (parameters.n !== undefined) payload.n = parameters.n;
        if (parameters.output_compression !== undefined) payload.output_compression = parameters.output_compression;
        if (parameters.output_format !== undefined) payload.output_format = parameters.output_format;
        if (parameters.quality !== undefined) payload.quality = parameters.quality;
        if (parameters.size !== undefined) payload.size = parameters.size;
        // Note: output_path is handled after fetching the image

        try {
            const response = await fetch(API_GENERATIONS_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${API_KEY}`
                },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`API error: ${response.status} ${response.statusText} - ${error.error.message}`);
            }

            const data = await response.json();
            const results: Array<{ local_path: string; url: string | null; revised_prompt: any; }> = [];

            for (const item of data.data) {
                const base64Data = item.b64_json;
                const imageBuffer = Buffer.from(base64Data, 'base64');

                // Determine output directory and ensure it exists
                const outputDir = DEFAULT_OUTPUT_DIR;
                await ensureDirectoryExists(outputDir);

                // Generate a unique filename
                const filename = `openai_${randomUUID()}.png`; // Assuming png format for saving
                const outputPath = path.join(outputDir, filename);

                // Save image to local file
                try {
                    await sharp(imageBuffer).toFile(outputPath);
                    console.info(`[openai-image-gen-mcp] Image saved to local path: ${outputPath}`);
                } catch (saveError: any) {
                    console.error(`[openai-image-gen-mcp] Failed to save image to local path ${outputPath}: ${saveError.message}`);
                    // Continue even if local save fails
                }


                // Upload to CF ImgBed if configured
                let uploadedUrl: string | null = null;
                if (CF_IMGBED_UPLOAD_URL && CF_IMGBED_API_KEY) {
                    uploadedUrl = await uploadToCfImgbed(imageBuffer, filename);
                }

                results.push({
                    local_path: outputPath,
                    url: uploadedUrl,
                    revised_prompt: item.revised_prompt
                });
            }

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(results)
                }]
            };

        } catch (error: any) {
            console.error('Error generating image:', error);
            throw new Error(`Failed to generate image: ${error.message}`);
        }
    }
);

// Define the image editing tool
server.tool(
    'oai_edit_image',
    {
        image_path: z.string().describe('Path to the image file to edit'),
        prompt: z.string().max(32000).describe('A text description of the desired edits'),
        mask_path: z.string().optional().describe('Optional path to the mask image file'),
        n: z.number().int().min(1).max(10).nullable().optional().describe('The number of images to generate. Must be between 1 and 10.'),
        size: z.enum(['1024x1024', '1536x1024', '1024x1536']).nullable().optional().describe('The size of the generated images'),
        output_format: z.enum(['png', 'jpeg', 'webp']).nullable().optional().describe('The format in which the edited images are returned'),
    },
    async (parameters) => {
        if (!API_KEY) {
            throw new Error('OpenAI API key is not configured.');
        }

        try {
            // Read the image file
            const imageBuffer = await readImageFile(parameters.image_path);
            
            // Read mask file if provided
            let maskBuffer: Buffer | null = null;
            if (parameters.mask_path) {
                maskBuffer = await readImageFile(parameters.mask_path);
            }

            // Create form data
            const form = new FormData();
            form.append('image', imageBuffer, {
                filename: 'image.png',
                contentType: 'image/png',
            });
            
            // Add mask if provided
            if (maskBuffer) {
                form.append('mask', maskBuffer, {
                    filename: 'mask.png',
                    contentType: 'image/png',
                });
            }

            // Add other required and optional parameters
            form.append('prompt', parameters.prompt);
            form.append('model', DEFAULT_MODEL || 'gpt-image-1');
            
            if (parameters.n !== undefined && parameters.n !== null) form.append('n', parameters.n.toString());
            if (parameters.size !== undefined && parameters.size !== null) form.append('size', parameters.size);
            if (parameters.output_format !== undefined && parameters.output_format !== null) form.append('response_format', parameters.output_format);

            // Make API request
            const response = await fetch(API_EDITS_URL, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${API_KEY}`,
                    ...form.getHeaders()
                },
                body: form as any
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(`API error: ${response.status} ${response.statusText} - ${error.error?.message || JSON.stringify(error)}`);
            }

            const data = await response.json();
            const results: Array<{ local_path: string; url: string | null; }> = [];

            for (const item of data.data) {
                const base64Data = item.b64_json;
                const imageBuffer = Buffer.from(base64Data, 'base64');

                // Determine output directory and ensure it exists
                const outputDir = DEFAULT_OUTPUT_DIR;
                await ensureDirectoryExists(outputDir);

                // Generate a unique filename
                const filename = `openai_edit_${randomUUID()}.png`; // Assuming png format for saving
                const outputPath = path.join(outputDir, filename);

                // Save image to local file
                try {
                    await sharp(imageBuffer).toFile(outputPath);
                    console.info(`[openai-image-gen-mcp] Edited image saved to local path: ${outputPath}`);
                } catch (saveError: any) {
                    console.error(`[openai-image-gen-mcp] Failed to save edited image to local path ${outputPath}: ${saveError.message}`);
                    // Continue even if local save fails
                }

                // Upload to CF ImgBed if configured
                let uploadedUrl: string | null = null;
                if (CF_IMGBED_UPLOAD_URL && CF_IMGBED_API_KEY) {
                    uploadedUrl = await uploadToCfImgbed(imageBuffer, filename);
                }

                results.push({
                    local_path: outputPath,
                    url: uploadedUrl
                });
            }

            return {
                content: [{
                    type: 'text',
                    text: JSON.stringify(results)
                }]
            };

        } catch (error: any) {
            console.error('Error editing image:', error);
            throw new Error(`Failed to edit image: ${error.message}`);
        }
    }
);

// Add health check endpoint
server.tool(
    'health_check',
    {},
    async () => {
        return {
            content: [{
                type: 'text',
                text: JSON.stringify({
                    status: 'ok',
                    version: '1.0.0',
                    api_status: API_KEY ? 'configured' : 'missing',
                    imgbed_status: (CF_IMGBED_UPLOAD_URL && CF_IMGBED_API_KEY) ? 'configured' : 'missing'
                })
            }]
        };
    }
);

const transport = new StdioServerTransport();
server.connect(transport);

console.log('OpenAI Image Generation MCP Server started.');