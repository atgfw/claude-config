/**
 * Pre-Bash Hook
 * BLOCKS deletion commands, emoji usage, file write redirections, and direct browser automation
 * Enforces: "Deletion is banned - move to old/", "Never use emojis", "Use MCP for file writes", "Use MCP for browser automation"
 */
import { log, logBlocked, logAllowed, containsEmoji, containsDeletionCommand, getMcpServerHealth, isMorphAvailable, } from '../utils.js';
import { registerHook } from '../runner.js';
/**
 * Patterns that indicate file write redirection via Bash
 * These should use MCP tools instead (mcp__morph__edit_file or mcp__desktop-commander__write_file)
 */
const WRITE_REDIRECTION_PATTERNS = [
    /cat\s+>\s*["']?[\w\/.-]+\.(?:json|js|ts|md|txt|yaml|yml|toml|xml|html|css|py|rb|go|rs|java|kt|c|cpp|h|hpp|cs|php|swift|scala|sh|bash)["']?/i,
    /echo\s+.+\s+>\s*["']?[\w\/.-]+\.(?:json|js|ts|md|txt|yaml|yml|toml|xml|html|css|py|rb|go|rs|java|kt|c|cpp|h|hpp|cs|php|swift|scala|sh|bash)["']?/i,
    /printf\s+.+\s+>\s*["']?[\w\/.-]+\.(?:json|js|ts|md|txt|yaml|yml|toml|xml|html|css|py|rb|go|rs|java|kt|c|cpp|h|hpp|cs|php|swift|scala|sh|bash)["']?/i,
    /cat\s+<<['"]?EOF['"]?\s*>\s*["']?[\w\/.-]+/i, // Heredoc redirections
    /tee\s+["']?[\w\/.-]+\.(?:json|js|ts|md|txt|yaml|yml|toml|xml|html|css|py|rb|go|rs|java|kt|c|cpp|h|hpp|cs|php|swift|scala|sh|bash)["']?/i,
];
/**
 * Patterns that indicate direct browser automation via Bash
 * NOTE: Scrapling CLI is ALLOWED (scrapling extract, scrapling shell)
 * Only blocking direct Playwright/Puppeteer/Selenium Python/Node usage
 */
const DIRECT_BROWSER_PATTERNS = [
    /from\s+playwright\.sync_api/i,
    /from\s+playwright\.async_api/i,
    /import\s+playwright/i,
    /require\s*\(\s*['"]playwright['"]\s*\)/i,
    /playwright\.sync_api/i,
    /playwright\.async_api/i,
    /puppeteer/i,
    /from\s+selenium/i,
    /import\s+selenium/i,
    /webdriver/i,
    /chromium\.launch\s*\(/i,
    /firefox\.launch\s*\(/i,
    /webkit\.launch\s*\(/i,
];
/**
 * Patterns that are ALLOWED (Scrapling CLI, npx playwright for MCP)
 */
const ALLOWED_BROWSER_PATTERNS = [
    /scrapling\s+(extract|shell)/i,
    /npx\s+.*@playwright\/mcp/i,
    /uvx\s+scrapling/i,
];
/**
 * Check if command contains file write redirection (blocked)
 */
function containsWriteRedirection(command) {
    return WRITE_REDIRECTION_PATTERNS.some((pattern) => pattern.test(command));
}
/**
 * Check if command is an allowed browser pattern
 */ function isAllowedBrowserPattern(command) {
    return ALLOWED_BROWSER_PATTERNS.some((pattern) => pattern.test(command));
}
/**
 * Check if command contains direct browser automation (blocked)
 */
function containsDirectBrowserAutomation(command) {
    // First check if it's an allowed pattern
    if (isAllowedBrowserPattern(command)) {
        return false;
    }
    return DIRECT_BROWSER_PATTERNS.some((pattern) => pattern.test(command));
}
/**
 * Extract command from various input formats
 */
function extractCommand(input) {
    // Try tool_input.command first
    const toolInput = input.tool_input;
    if (toolInput && typeof toolInput === 'object') {
        const cmd = toolInput['command'];
        if (typeof cmd === 'string') {
            return cmd;
        }
    }
    return undefined;
}
/** * Pre-Bash Hook Implementation
 *
 * Checks bash commands before execution for:
 * 1. File write redirections (cat >, echo >, printf >, heredoc)
 * 2. Deletion commands (rm, del, Remove-Item, rmdir, rd)
 * 3. Emoji content
 * 4. Direct browser automation (must use MCP instead)
 */
export async function preBashHook(input) {
    // Extract command from input
    const command = extractCommand(input);
    log(`Command to execute: ${command || '(empty)'}`);
    log('');
    // Check for file write redirections (new check)
    if (command && containsWriteRedirection(command)) {
        const morphAvailable = isMorphAvailable();
        const desktopCommanderHealthy = getMcpServerHealth('desktop-commander') === 'healthy';
        const tools = [];
        if (morphAvailable) {
            tools.push('mcp__morph__edit_file');
        }
        if (desktopCommanderHealthy) {
            tools.push('mcp__desktop-commander__write_file');
        }
        logBlocked('File write redirection detected', 'NEVER use cat >, echo >, printf >, or heredoc to write files. Use MCP tools instead.');
        log('');
        if (tools.length > 0) {
            log('REQUIRED: Use one of the following MCP tools:');
            for (const tool of tools) {
                log(`  - ${tool}`);
            }
        }
        else {
            log('ERROR: No MCP file tools available');
            log('  Check MCP server health with: claude mcp list');
        }
        log('');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'deny',
                permissionDecisionReason: `File write redirection banned - use MCP tools instead${tools.length > 0 ? ': ' + tools.join(' or ') : ''}`,
            },
        };
    }
    // Check for direct browser automation
    if (command && containsDirectBrowserAutomation(command)) {
        logBlocked('Direct browser automation detected', 'NEVER use Playwright/Puppeteer/Selenium directly via Bash. Use MCP tools instead.');
        log('');
        log('CORRECT USAGE - Use MCP tools:');
        log('  mcp__scrapling__navigate(url)      - Navigate to URL');
        log('  mcp__scrapling__screenshot()       - Take screenshot');
        log('  mcp__scrapling__click(selector)    - Click element');
        log('  mcp__scrapling__type(selector, text) - Type text');
        log('');
        log('If Scrapling unavailable, use Playwright MCP:');
        log('  mcp__playwright__browser_navigate');
        log('  mcp__playwright__browser_screenshot');
        log('');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'deny',
                permissionDecisionReason: 'Direct browser automation banned - use Scrapling MCP or Playwright MCP instead',
            },
        };
    }
    // Check for deletion commands
    if (command && containsDeletionCommand(command)) {
        logBlocked('File deletion detected', 'Deletion is banned - Never use rm, del, Remove-Item. Always move files to old/ directory instead.');
        log('');
        log('CORRECT USAGE:');
        log('  mkdir -p ~/.claude/old/path/to/file');
        log('  mv file.txt ~/.claude/old/path/to/file/');
        log('');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'deny',
                permissionDecisionReason: 'Deletion banned - use mv to old/ directory instead',
            },
        };
    }
    // Check for emojis
    if (command && containsEmoji(command)) {
        logBlocked('Emoji detected in command', 'Never use emojis anywhere for any reason.');
        log('');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'deny',
                permissionDecisionReason: 'Emojis banned per CLAUDE.md',
            },
        };
    }
    // Command is allowed
    logAllowed('Command allowed');
    return {
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'allow',
        },
    };
}
// Register the hook
registerHook('pre-bash', 'PreToolUse', preBashHook);
export default preBashHook;
//# sourceMappingURL=pre_bash.js.map