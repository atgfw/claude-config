/**
 * Hook Utilities
 * Common functions for all hooks
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
// ============================================================================
// Path Utilities
// ============================================================================
/**
 * Get the Claude configuration directory
 * Uses CLAUDE_DIR env var or defaults to ~/.claude
 */
export function getClaudeDir() {
    return process.env['CLAUDE_DIR'] ?? path.join(os.homedir(), '.claude');
}
/**
 * Get the hooks directory
 */
export function getHooksDir() {
    return path.join(getClaudeDir(), 'hooks');
}
/**
 * Get the old/ archive directory (for deletion ban compliance)
 */
export function getOldDir() {
    return path.join(getClaudeDir(), 'old');
}
/**
 * Get the .env file path
 */
export function getEnvPath() {
    return path.join(getClaudeDir(), '.env');
}
// ============================================================================
// File Operations (Deletion Ban Compliant)
// ============================================================================
/**
 * Move a file to the old/ directory instead of deleting
 * Complies with the deletion ban directive
 */
export function archiveFile(filePath) {
    if (!fs.existsSync(filePath)) {
        return;
    }
    const oldDir = getOldDir();
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = path.basename(filePath);
    const archivePath = path.join(oldDir, `${fileName}-${timestamp}`);
    fs.mkdirSync(oldDir, { recursive: true });
    fs.renameSync(filePath, archivePath);
}
/**
 * Check if a flag file exists
 */
export function flagExists(flagName) {
    const flagPath = path.join(getClaudeDir(), flagName);
    return fs.existsSync(flagPath);
}
/**
 * Create a flag file
 */
export function createFlag(flagName) {
    const flagPath = path.join(getClaudeDir(), flagName);
    fs.writeFileSync(flagPath, new Date().toISOString());
}
/**
 * Archive a flag file (instead of deleting)
 */
export function setFlag(flagName) {
    createFlag(flagName);
}
/**
 * Archive a flag file (instead of deleting)
 */
export function archiveFlag(flagName) {
    const flagPath = path.join(getClaudeDir(), flagName);
    archiveFile(flagPath);
}
// ============================================================================
// Environment Variables
// ============================================================================
/**
 * Load environment variables from .env file
 */
export function loadEnv() {
    const envPath = getEnvPath();
    if (!fs.existsSync(envPath)) {
        return;
    }
    const content = fs.readFileSync(envPath, 'utf-8');
    const lines = content.split('\n');
    for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('#') || !trimmed.includes('=')) {
            continue;
        }
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').trim();
        if (key && value) {
            process.env[key.trim()] = value;
        }
    }
}
/**
 * Check if an API key is configured
 */
export function hasApiKey(keyName) {
    loadEnv();
    const value = process.env[keyName];
    return value !== undefined && value !== '';
}
// ============================================================================
// JSON I/O
// ============================================================================
/**
 * Read JSON from stdin
 * Hooks receive input as JSON via stdin
 */
export async function readStdin() {
    return new Promise((resolve) => {
        let data = '';
        if (process.stdin.isTTY) {
            resolve('{}');
            return;
        }
        process.stdin.setEncoding('utf8');
        process.stdin.on('data', (chunk) => {
            data += chunk;
        });
        process.stdin.on('end', () => {
            resolve(data || '{}');
        });
        // Timeout after 1 second if no input
        setTimeout(() => {
            resolve(data || '{}');
        }, 1000);
    });
}
/**
 * Parse JSON safely with type checking
 */
export function parseJson(json) {
    try {
        return JSON.parse(json);
    }
    catch {
        return null;
    }
}
/**
 * Output JSON to stdout for Claude Code
 */
export function outputJson(data) {
    console.log(JSON.stringify(data));
}
// ============================================================================
// Logging (stderr for diagnostics)
// ============================================================================
/**
 * Log diagnostic information to stderr
 * This is visible to users but doesn't interfere with JSON output
 */
export function log(message) {
    console.error(message);
}
/**
 * Log a separator line
 */
export function logSeparator(title) {
    const line = '='.repeat(50);
    log(line);
    log(title);
    log(line);
}
/**
 * Log an error with context
 */
export function logError(error, context) {
    log('');
    log('[ERROR]' + (context ? ` ${context}` : ''));
    log(`  Message: ${error.message}`);
    if (error.stack) {
        log(`  Stack: ${error.stack.split('\n').slice(1, 4).join('\n        ')}`);
    }
}
/**
 * Log a blocked action
 */
export function logBlocked(reason, directive) {
    log('');
    log(`[BLOCKED] ${reason}`);
    if (directive) {
        log('');
        log('From CLAUDE.md:');
        log(`> ${directive}`);
    }
}
/**
 * Log an allowed action
 */
export function logAllowed(message) {
    log(`[OK] ${message ?? 'Action allowed'}`);
}
// ============================================================================
// Pattern Matching
// ============================================================================
/**
 * Check if a string contains emojis
 */
export function containsEmoji(text) {
    // Comprehensive emoji regex
    const emojiRegex = /[\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]|[\u{1F600}-\u{1F64F}]|[\u{1F680}-\u{1F6FF}]/u;
    return emojiRegex.test(text);
}
/**
 * Check if a command contains deletion commands
 */
export function containsDeletionCommand(command) {
    const deletionPattern = /\b(rm|del|Remove-Item|rmdir|rd)\b/i;
    return deletionPattern.test(command);
}
/**
 * Extract file extension from path
 */
export function getFileExtension(filePath) {
    return path.extname(filePath).toLowerCase();
}
/**
 * Check if a file is a code file
 */
export function isCodeFile(filePath) {
    const codeExtensions = [
        '.ts',
        '.tsx',
        '.js',
        '.jsx',
        '.mjs',
        '.cjs',
        '.py',
        '.rb',
        '.go',
        '.rs',
        '.java',
        '.kt',
        '.c',
        '.cpp',
        '.h',
        '.hpp',
        '.cs',
        '.php',
        '.swift',
        '.scala',
        '.sh',
        '.bash',
        '.json',
        '.yaml',
        '.yml',
        '.toml',
        '.xml',
        '.html',
        '.css',
        '.scss',
        '.less',
        '.vue',
        '.svelte',
    ];
    return codeExtensions.includes(getFileExtension(filePath));
}
// ============================================================================
// Session Validation
// ============================================================================
/**
 * Check if session was recently validated (compact mode)
 * Returns true if validation flag exists and is less than 1 hour old
 */
export function isSessionRecentlyValidated() {
    const flagPath = path.join(getClaudeDir(), '.session-validated');
    if (!fs.existsSync(flagPath)) {
        return false;
    }
    const stats = fs.statSync(flagPath);
    const ageMs = Date.now() - stats.mtimeMs;
    const oneHourMs = 60 * 60 * 1000;
    return ageMs < oneHourMs;
}
/**
 * Mark session as validated
 */
export function markSessionValidated() {
    createFlag('.session-validated');
}
// ============================================================================
// MCP Detection
// ============================================================================
/**
 * Check if Morph MCP is available
 */
export function isMorphAvailable() {
    // First check if MORPH_API_KEY exists - if not, Morph isn't functional
    if (!hasApiKey('MORPH_API_KEY')) {
        return false;
    }
    // Check flag file
    if (flagExists('.morph-available')) {
        return true;
    }
    // Check environment variable
    if (process.env['MORPH_MCP_AVAILABLE'] === 'true') {
        return true;
    }
    // Check .mcp.json in current directory
    const localMcpPath = path.join(process.cwd(), '.mcp.json');
    if (fs.existsSync(localMcpPath)) {
        const content = fs.readFileSync(localMcpPath, 'utf-8');
        if (content.includes('filesystem-with-morph') || content.includes('"morph"')) {
            return true;
        }
    }
    // Check global .claude.json for morph server
    const globalClaudePath = path.join(getClaudeDir(), '.claude.json');
    if (fs.existsSync(globalClaudePath)) {
        try {
            const config = JSON.parse(fs.readFileSync(globalClaudePath, 'utf-8'));
            if (config.mcpServers?.morph || config.mcpServers?.['filesystem-with-morph']) {
                return true;
            }
        }
        catch {
            // Ignore parse errors
        }
    }
    // Check MCP registry
    const registryPath = path.join(getClaudeDir(), 'mcp', 'mcp-registry.json');
    if (fs.existsSync(registryPath)) {
        try {
            const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
            const morphServer = registry.servers?.find((s) => s.name === 'morph' || s.name === 'filesystem-with-morph');
            if (morphServer && morphServer.health?.status === 'healthy') {
                return true;
            }
        }
        catch {
            // Ignore parse errors
        }
    }
    return false;
}
/**
 * Get MCP server health from the registry
 * Returns the health status or 'unknown' if not found
 */
export function getMcpServerHealth(serverName) {
    const registryPath = path.join(getClaudeDir(), 'mcp', 'mcp-registry.json');
    if (!fs.existsSync(registryPath)) {
        return 'unknown';
    }
    try {
        const content = fs.readFileSync(registryPath, 'utf-8');
        const registry = JSON.parse(content);
        const server = registry.servers.find((s) => s.name === serverName);
        return server?.health?.status ?? 'unknown';
    }
    catch {
        return 'unknown';
    }
}
/**
 * Check if an MCP server is configured (exists in .mcp.json)
 */
export function isMcpServerConfigured(serverName) {
    const localMcpPath = path.join(process.cwd(), '.mcp.json');
    const globalMcpPath = path.join(getClaudeDir(), '.mcp.json');
    for (const mcpPath of [localMcpPath, globalMcpPath]) {
        if (fs.existsSync(mcpPath)) {
            const content = fs.readFileSync(mcpPath, 'utf-8');
            if (content.includes(serverName)) {
                return true;
            }
        }
    }
    return false;
}
/**
 * Check if Scrapling MCP is available AND healthy
 * Now checks live health status from MCP registry
 */
export function isScraplingAvailable() {
    // First check if configured
    if (!isMcpServerConfigured('scrapling')) {
        return false;
    }
    // Then check live health status
    const health = getMcpServerHealth('scrapling');
    // Only return true if explicitly healthy
    // 'unknown' or 'degraded' should trigger health check, not assume available
    return health === 'healthy';
}
/**
 * Check if Scrapling MCP is configured (regardless of health)
 * Use this for soft checks where we want to prefer Scrapling but allow fallback
 */
export function isScraplingConfigured() {
    return isMcpServerConfigured('scrapling');
}
/**
 * Check if Playwright MCP is available AND healthy
 */
export function isPlaywrightAvailable() {
    if (!isMcpServerConfigured('playwright')) {
        return false;
    }
    const health = getMcpServerHealth('playwright');
    return health === 'healthy';
}
//# sourceMappingURL=utils.js.map