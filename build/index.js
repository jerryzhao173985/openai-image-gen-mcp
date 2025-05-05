#!/usr/bin/env node
"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mcp_js_1 = require("@modelcontextprotocol/sdk/server/mcp.js");
const stdio_js_1 = require("@modelcontextprotocol/sdk/server/stdio.js");
const config_1 = require("./config");
const node_fetch_1 = __importDefault(require("node-fetch"));
const zod_1 = require("zod");
const axios_1 = __importDefault(require("axios"));
const sharp_1 = __importDefault(require("sharp"));
const path_1 = __importDefault(require("path"));
const promises_1 = require("fs/promises");
const crypto_1 = require("crypto");
const form_data_1 = __importDefault(require("form-data"));
const fs_1 = __importDefault(require("fs"));
// Helper function to ensure directory exists
function ensureDirectoryExists(dirPath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            yield (0, promises_1.mkdir)(dirPath, { recursive: true });
        }
        catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
        }
    });
}
// Helper function to upload image to CF ImgBed
function uploadToCfImgbed(imageData, filename) {
    var _a, _b;
    return __awaiter(this, void 0, void 0, function* () {
        if (!config_1.CF_IMGBED_UPLOAD_URL || !config_1.CF_IMGBED_API_KEY) {
            console.warn('[openai-image-gen-mcp] CF ImgBed URL or API Key not configured. Skipping upload.');
            return null;
        }
        const form = new form_data_1.default();
        form.append('file', imageData, filename);
        // Check if the base URL already contains query parameters
        const separator = config_1.CF_IMGBED_UPLOAD_URL.includes('?') ? '&' : '?';
        const uploadUrlWithAuth = `${config_1.CF_IMGBED_UPLOAD_URL}${separator}authCode=${config_1.CF_IMGBED_API_KEY}`;
        try {
            console.info(`[openai-image-gen-mcp] Uploading image '${filename}' to CF ImgBed...`);
            const response = yield axios_1.default.post(uploadUrlWithAuth, form, {
                headers: Object.assign({}, form.getHeaders()),
                timeout: 60000, // 60 second timeout for upload
            });
            if (response.status === 200 && Array.isArray(response.data) && response.data.length > 0 && ((_a = response.data[0]) === null || _a === void 0 ? void 0 : _a.src)) {
                const imagePathSegment = response.data[0].src;
                // Construct the full URL based on the upload URL's origin
                const parsedUploadUrl = new URL(config_1.CF_IMGBED_UPLOAD_URL);
                const baseUrlStr = `${parsedUploadUrl.protocol}//${parsedUploadUrl.host}`;
                const fullUrl = new URL(imagePathSegment, baseUrlStr).toString();
                console.info(`[openai-image-gen-mcp] Image uploaded successfully: ${fullUrl}`);
                return fullUrl;
            }
            else {
                console.error(`[openai-image-gen-mcp] Unexpected response format from ImgBed. Status: ${response.status}. Headers: ${JSON.stringify(response.headers)}. Data: ${JSON.stringify(response.data)}`);
                return null;
            }
        }
        catch (error) {
            let errorMessage = 'Unknown error during ImgBed upload.';
            if (axios_1.default.isAxiosError(error)) {
                const responseInfo = error.response ? ` Status: ${error.response.status}. Headers: ${JSON.stringify(error.response.headers)}. Data: ${JSON.stringify(error.response.data)}` : ' No response received.';
                const requestInfo = error.request ? ` Request data: ${JSON.stringify((_b = error.config) === null || _b === void 0 ? void 0 : _b.data)}.` : ' No request object found.';
                errorMessage = `Axios error: ${error.message}.${responseInfo}${requestInfo}`;
            }
            else if (error instanceof Error) {
                errorMessage = `Generic error: ${error.message}. Stack: ${error.stack}`;
            }
            else {
                errorMessage = `Caught non-Error object: ${String(error)}`;
            }
            console.error(`[openai-image-gen-mcp] Failed to upload image to ImgBed: ${errorMessage}`);
            return null;
        }
    });
}
// Function to validate and read image
function readImageFile(imagePath) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // Check if file exists and is readable
            yield fs_1.default.promises.access(imagePath, fs_1.default.constants.R_OK);
            // Read the file
            const imageBuffer = yield (0, promises_1.readFile)(imagePath);
            return imageBuffer;
        }
        catch (error) {
            throw new Error(`Failed to read image file: ${error.message}`);
        }
    });
}
// Print API key status on startup
console.log(`[openai-image-gen-mcp] Environment variables:`, {
    OPENAI_API_KEY_SET: !!process.env.OPENAI_API_KEY,
    API_KEY_SET: !!process.env.API_KEY,
    ENV_KEYS: Object.keys(process.env).filter(key => key.includes('KEY') || key.includes('key'))
});
if (config_1.API_KEY) {
    const maskedKey = `${config_1.API_KEY.substring(0, 5)}...${config_1.API_KEY.substring(config_1.API_KEY.length - 4)}`;
    console.log(`[openai-image-gen-mcp] Using API key: ${maskedKey}`);
}
else {
    console.error(`[openai-image-gen-mcp] WARNING: No API key found. Please provide OPENAI_API_KEY environment variable.`);
}
const server = new mcp_js_1.McpServer({
    name: 'openai-image-gen-mcp',
    version: '1.0.0'
});
// Define the generateImage tool
server.tool('oai_generate_image', {
    prompt: zod_1.z.string().max(32000).describe('A text description of the desired image(s). Maximum length is 32000 characters.'),
    background: zod_1.z.enum(['transparent', 'opaque', 'auto']).nullable().optional().describe('Allows to set transparency for the background. Must be one of transparent, opaque or auto (default value).'),
    moderation: zod_1.z.enum(['low', 'auto']).nullable().optional().describe('Control the content-moderation level for images generated by gpt-image-1. Must be either low for less restrictive filtering or auto (default value).'),
    n: zod_1.z.number().int().min(1).max(10).nullable().optional().describe('The number of images to generate. Must be between 1 and 10.'),
    output_compression: zod_1.z.number().int().min(0).max(100).nullable().optional().describe('The compression level (0-100%) for the generated images. This parameter is only supported for gpt-image-1 with the webp or jpeg output formats, and defaults to 100.'),
    output_format: zod_1.z.enum(['png', 'jpeg', 'webp']).nullable().optional().describe('The format in which the generated images are returned. Must be one of png, jpeg, or webp.'),
    quality: zod_1.z.enum(['auto', 'high', 'medium', 'low']).nullable().optional().describe('The quality of the image that will be generated. Must be one of auto, high, medium, or low for gpt-image-1.'),
    size: zod_1.z.enum(['1024x1024', '1536x1024', '1024x1536', 'auto']).nullable().optional().describe('The size of the generated images. Must be one of 1024x1024, 1536x1024 (landscape), 1024x1536 (portrait), or auto (default value) for gpt-image-1.'),
}, (parameters) => __awaiter(void 0, void 0, void 0, function* () {
    if (!config_1.API_KEY) {
        throw new Error('OpenAI API key is not configured.');
    }
    const payload = {
        prompt: parameters.prompt,
        model: config_1.DEFAULT_MODEL || 'gpt-image-1', // Default to gpt-image-1 if DEFAULT_MODEL is not set
    };
    // Add optional parameters if provided
    if (parameters.background !== undefined)
        payload.background = parameters.background;
    if (parameters.moderation !== undefined)
        payload.moderation = parameters.moderation;
    if (parameters.n !== undefined)
        payload.n = parameters.n;
    if (parameters.output_compression !== undefined)
        payload.output_compression = parameters.output_compression;
    if (parameters.output_format !== undefined)
        payload.output_format = parameters.output_format;
    if (parameters.quality !== undefined)
        payload.quality = parameters.quality;
    if (parameters.size !== undefined)
        payload.size = parameters.size;
    // Note: output_path is handled after fetching the image
    try {
        const response = yield (0, node_fetch_1.default)(config_1.API_GENERATIONS_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config_1.API_KEY}`
            },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const error = yield response.json();
            throw new Error(`API error: ${response.status} ${response.statusText} - ${error.error.message}`);
        }
        const data = yield response.json();
        const results = [];
        for (const item of data.data) {
            const base64Data = item.b64_json;
            const imageBuffer = Buffer.from(base64Data, 'base64');
            // Determine output directory and ensure it exists
            const outputDir = config_1.DEFAULT_OUTPUT_DIR;
            yield ensureDirectoryExists(outputDir);
            // Generate a unique filename
            const filename = `openai_${(0, crypto_1.randomUUID)()}.png`; // Assuming png format for saving
            const outputPath = path_1.default.join(outputDir, filename);
            // Save image to local file
            try {
                yield (0, sharp_1.default)(imageBuffer).toFile(outputPath);
                console.info(`[openai-image-gen-mcp] Image saved to local path: ${outputPath}`);
            }
            catch (saveError) {
                console.error(`[openai-image-gen-mcp] Failed to save image to local path ${outputPath}: ${saveError.message}`);
                // Continue even if local save fails
            }
            // Upload to CF ImgBed if configured
            let uploadedUrl = null;
            if (config_1.CF_IMGBED_UPLOAD_URL && config_1.CF_IMGBED_API_KEY) {
                uploadedUrl = yield uploadToCfImgbed(imageBuffer, filename);
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
    }
    catch (error) {
        console.error('Error generating image:', error);
        throw new Error(`Failed to generate image: ${error.message}`);
    }
}));
// Define the image editing tool
server.tool('oai_edit_image', {
    image_path: zod_1.z.string().describe('Path to the image file to edit'),
    prompt: zod_1.z.string().max(32000).describe('A text description of the desired edits'),
    mask_path: zod_1.z.string().optional().describe('Optional path to the mask image file'),
    n: zod_1.z.number().int().min(1).max(10).nullable().optional().describe('The number of images to generate. Must be between 1 and 10.'),
    size: zod_1.z.enum(['1024x1024', '1536x1024', '1024x1536']).nullable().optional().describe('The size of the generated images'),
    output_format: zod_1.z.enum(['png', 'jpeg', 'webp']).nullable().optional().describe('The format in which the edited images are returned'),
}, (parameters) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (!config_1.API_KEY) {
        throw new Error('OpenAI API key is not configured.');
    }
    try {
        // Read the image file
        const imageBuffer = yield readImageFile(parameters.image_path);
        // Read mask file if provided
        let maskBuffer = null;
        if (parameters.mask_path) {
            maskBuffer = yield readImageFile(parameters.mask_path);
        }
        // Create form data
        const form = new form_data_1.default();
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
        form.append('model', config_1.DEFAULT_MODEL || 'gpt-image-1');
        if (parameters.n !== undefined && parameters.n !== null)
            form.append('n', parameters.n.toString());
        if (parameters.size !== undefined && parameters.size !== null)
            form.append('size', parameters.size);
        if (parameters.output_format !== undefined && parameters.output_format !== null)
            form.append('response_format', parameters.output_format);
        // Make API request
        const response = yield (0, node_fetch_1.default)(config_1.API_EDITS_URL, {
            method: 'POST',
            headers: Object.assign({ 'Authorization': `Bearer ${config_1.API_KEY}` }, form.getHeaders()),
            body: form
        });
        if (!response.ok) {
            const error = yield response.json();
            throw new Error(`API error: ${response.status} ${response.statusText} - ${((_a = error.error) === null || _a === void 0 ? void 0 : _a.message) || JSON.stringify(error)}`);
        }
        const data = yield response.json();
        const results = [];
        for (const item of data.data) {
            const base64Data = item.b64_json;
            const imageBuffer = Buffer.from(base64Data, 'base64');
            // Determine output directory and ensure it exists
            const outputDir = config_1.DEFAULT_OUTPUT_DIR;
            yield ensureDirectoryExists(outputDir);
            // Generate a unique filename
            const filename = `openai_edit_${(0, crypto_1.randomUUID)()}.png`; // Assuming png format for saving
            const outputPath = path_1.default.join(outputDir, filename);
            // Save image to local file
            try {
                yield (0, sharp_1.default)(imageBuffer).toFile(outputPath);
                console.info(`[openai-image-gen-mcp] Edited image saved to local path: ${outputPath}`);
            }
            catch (saveError) {
                console.error(`[openai-image-gen-mcp] Failed to save edited image to local path ${outputPath}: ${saveError.message}`);
                // Continue even if local save fails
            }
            // Upload to CF ImgBed if configured
            let uploadedUrl = null;
            if (config_1.CF_IMGBED_UPLOAD_URL && config_1.CF_IMGBED_API_KEY) {
                uploadedUrl = yield uploadToCfImgbed(imageBuffer, filename);
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
    }
    catch (error) {
        console.error('Error editing image:', error);
        throw new Error(`Failed to edit image: ${error.message}`);
    }
}));
// Add health check endpoint
server.tool('health_check', {}, () => __awaiter(void 0, void 0, void 0, function* () {
    return {
        content: [{
                type: 'text',
                text: JSON.stringify({
                    status: 'ok',
                    version: '1.0.0',
                    api_status: config_1.API_KEY ? 'configured' : 'missing',
                    imgbed_status: (config_1.CF_IMGBED_UPLOAD_URL && config_1.CF_IMGBED_API_KEY) ? 'configured' : 'missing'
                })
            }]
    };
}));
const transport = new stdio_js_1.StdioServerTransport();
server.connect(transport);
console.log('OpenAI Image Generation MCP Server started.');
