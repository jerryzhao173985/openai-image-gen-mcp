// Helper function to parse arguments in the format "-e KEY VALUE"
function parseCliArgs(argv) {
  const args = argv.slice(2); // Skip node executable and script path
  const parsed = {};
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '-e' && i + 2 < args.length) {
      const key = args[i + 1];
      const value = args[i + 2];
      parsed[key] = value;
      i += 2; // Move index past the key and value
    }
  }
  return parsed;
}

const cliArgs = parseCliArgs(process.argv);

// Display all environment variables 
console.log('[openai-image-gen-mcp] DEBUGGING: Process arguments:', process.argv);

// Check the raw environment variables directly
console.log('[openai-image-gen-mcp] DEBUGGING: Environment variables:');
console.log('OPENAI_API_KEY exists:', !!process.env.OPENAI_API_KEY);
console.log('API_KEY exists:', !!process.env.API_KEY);
if (process.env.OPENAI_API_KEY) {
    console.log('OPENAI_API_KEY starts with:', process.env.OPENAI_API_KEY.substring(0, 5));
}
if (process.env.API_KEY) {
    console.log('API_KEY starts with:', process.env.API_KEY.substring(0, 5));
}

// Prioritize command-line args (-e or direct flags), fall back to environment variables
console.log('[openai-image-gen-mcp] DEBUGGING: Command-line args:', cliArgs);

let API_KEY = cliArgs.API_KEY || cliArgs.OPENAI_API_KEY || process.env.OPENAI_API_KEY || process.env.API_KEY;

// Check for API key from command line
if (!API_KEY) {
    console.error('[openai-image-gen-mcp] No API key found in environment variables or command-line args');
    
    // Try to find any command-line argument that looks like an API key
    const possibleApiKey = process.argv.find(arg => arg.startsWith('sk-'));
    if (possibleApiKey) {
        console.log('[openai-image-gen-mcp] Found possible API key in command-line args');
        API_KEY = possibleApiKey;
    }
}

// Fix for environment variables containing ${env:...} format
if (API_KEY && API_KEY.includes('${env:')) {
    console.error(`[openai-image-gen-mcp] API_KEY contains an unresolved environment variable: ${API_KEY}`);
    console.error(`[openai-image-gen-mcp] Getting API key directly from process.env.OPENAI_API_KEY`);
    API_KEY = process.env.OPENAI_API_KEY;
}

// Check final result
if (API_KEY) {
    console.log('[openai-image-gen-mcp] Using API key starting with:', API_KEY.substring(0, 5));
} else {
    console.error('[openai-image-gen-mcp] No valid API key found after all checks!');
}
const API_GENERATIONS_URL = cliArgs.API_GENERATIONS_URL || process.env.API_GENERATIONS_URL || 'https://api.openai.com/v1/images/generations';  // 图像生成的API端点，默认的端点路径
const API_EDITS_URL = cliArgs.API_EDITS_URL || process.env.API_EDITS_URL || 'https://api.openai.com/v1/images/edits';   // 编辑图像的API端点，这个端点暂时不用，只暂时构建出来后续使用
const DEFAULT_MODEL = cliArgs.DEFAULT_MODEL || process.env.DEFAULT_MODEL;  // 默认使用的画图模型

// Cloudflare ImgBed Configuration
const CF_IMGBED_UPLOAD_URL = cliArgs.CF_IMGBED_UPLOAD_URL || process.env.CF_IMGBED_UPLOAD_URL;
const CF_IMGBED_API_KEY = cliArgs.CF_IMGBED_API_KEY || process.env.CF_IMGBED_API_KEY;

// Default output directory for local saves
const DEFAULT_OUTPUT_DIR = cliArgs.DEFAULT_OUTPUT_DIR || process.env.DEFAULT_OUTPUT_DIR || './output';

module.exports = {
    API_KEY,
    API_GENERATIONS_URL,
    API_EDITS_URL,
    DEFAULT_MODEL,
    CF_IMGBED_UPLOAD_URL,
    CF_IMGBED_API_KEY,
    DEFAULT_OUTPUT_DIR
};