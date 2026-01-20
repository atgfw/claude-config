/**
 * Post-Tool-Use Hook
 * ENFORCES Scrapling MCP preference over Playwright for browser automation
 * Enforces: "USE SCRAPLING MCP for all browser automation tasks"
 */
import { log, logBlocked, logAllowed, isScraplingAvailable } from '../utils.js';
import { registerHook } from '../runner.js';
/**
 * Post-Tool-Use Hook Implementation
 *
 * After any tool execution, checks for browser automation usage
 * and enforces Scrapling preference over Playwright.
 */
export async function postToolUseHook(input) {
    const toolName = input.tool_name;
    log(`Tool executed: ${toolName || '(unknown)'}`);
    log('');
    // Check if Playwright was used
    if (toolName && isPlaywrightTool(toolName)) {
        // Check if Scrapling is available
        if (isScraplingAvailable()) {
            logBlocked('Playwright used when Scrapling is available', 'USE SCRAPLING MCP for all browser automation tasks. Scrapling is preferred over Playwright.');
            log('');
            log('PREFERRED USAGE:');
            log('  - mcp__scrapling__navigate(url)');
            log('  - mcp__scrapling__screenshot(filename)');
            log('  - mcp__scrapling__extract(selector)');
            log('  - mcp__scrapling__click(selector)');
            log('');
            log('Only use Playwright if Scrapling cannot handle the specific use case.');
            log('');
            // Log violation but don't block (soft preference)
            return {
                hookSpecificOutput: {
                    hookEventName: 'PostToolUse',
                    additionalContext: 'WARNING: Playwright used when Scrapling available - prefer Scrapling MCP',
                },
            };
        }
    }
    // Check for direct Python Playwright usage in Bash
    if (toolName === 'Bash') {
        const command = extractCommand(input);
        if (command && containsDirectPlaywright(command)) {
            logBlocked('Direct Python Playwright detected', 'USE SCRAPLING MCP for all browser automation tasks.');
            log('');
            log('You attempted to use Python Playwright directly instead of MCP tools.');
            log('');
            log('REQUIRED USAGE:');
            log('  Use Scrapling MCP tools:');
            log('  - mcp__scrapling__navigate(url)');
            log('  - mcp__scrapling__screenshot(filename)');
            log('');
            log('  OR use Playwright MCP (if Scrapling cannot handle):');
            log('  - mcp__playwright__browser_navigate(url)');
            log('  - mcp__playwright__browser_screenshot(filename)');
            log('');
            return {
                hookSpecificOutput: {
                    hookEventName: 'PostToolUse',
                    decision: 'block',
                    reason: 'Direct Python Playwright blocked - use Scrapling MCP',
                },
            };
        }
    }
    // Tool usage is compliant
    logAllowed('Tool usage compliant');
    return {
        hookSpecificOutput: {
            hookEventName: 'PostToolUse',
        },
    };
}
/**
 * Check if a tool name is a Playwright MCP tool
 */
function isPlaywrightTool(toolName) {
    return toolName.toLowerCase().includes('playwright');
}
/**
 * Extract command from Bash tool input
 */
function extractCommand(input) {
    const toolInput = input.tool_input;
    if (toolInput && typeof toolInput === 'object') {
        const cmd = toolInput['command'];
        if (typeof cmd === 'string') {
            return cmd;
        }
    }
    return undefined;
}
/**
 * Check if a command contains direct Playwright imports
 */
function containsDirectPlaywright(command) {
    const patterns = [
        /from playwright/i,
        /import playwright/i,
        /playwright\.sync_api/i,
        /playwright\.async_api/i,
    ];
    return patterns.some((pattern) => pattern.test(command));
}
// Register the hook
registerHook('post-tool-use', 'PostToolUse', postToolUseHook);
export default postToolUseHook;
//# sourceMappingURL=post_tool_use.js.map