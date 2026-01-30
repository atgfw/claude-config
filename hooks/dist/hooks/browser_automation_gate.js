/**
 * Browser Automation Gate Hook (PreToolUse)
 *
 * Enforces Scrapling MCP preference over Playwright for browser automation.
 * This is a PreToolUse hook that intercepts Playwright calls BEFORE execution
 * and redirects to Scrapling when available.
 *
 * Escalation chain:
 * 1. Child wants browser automation
 * 2. This hook intercepts Playwright calls
 * 3. If Scrapling healthy -> DENY with redirect instructions
 * 4. If Scrapling not healthy -> ALLOW Playwright (fallback)
 */
import { logVerbose, logTerse, isScraplingAvailable, isScraplingConfigured, getMcpServerHealth, } from '../utils.js';
import { registerHook } from '../runner.js';
// ============================================================================
// Tool Mapping
// ============================================================================
/**
 * Scrapling vs Playwright capabilities:
 *
 * SCRAPLING (anti-bot page fetching):
 *   - mcp__scrapling__s-fetch-page(url, mode) - Fetch page content with bot bypass
 *   - mcp__scrapling__s-fetch-pattern(url, mode, search_pattern, context_chars) - Extract with regex
 *
 * PLAYWRIGHT (full browser automation):
 *   - mcp__playwright__browser_navigate - Navigate to URL
 *   - mcp__playwright__browser_click - Click elements
 *   - mcp__playwright__browser_type - Type text
 *   - mcp__playwright__browser_screenshot - Take screenshots
 *   - mcp__playwright__browser_snapshot - Get page content
 *
 * ROUTING LOGIC:
 *   - For page fetching (read-only): Prefer Scrapling (anti-bot)
 *   - For interactions (click, type): Must use Playwright
 */
const INTERACTION_TOOLS = [
    'mcp__playwright__browser_click',
    'mcp__playwright__browser_type',
    'mcp__playwright__browser_screenshot',
    'mcp__playwright__browser_evaluate',
];
// ============================================================================
// Hook Implementation
// ============================================================================
/**
 * Browser Automation Gate Hook
 *
 * Routes browser automation based on operation type:
 * - Fetch operations: Suggest Scrapling MCP/CLI (anti-bot)
 * - Interaction operations: Allow Playwright MCP
 */
export async function browserAutomationGateHook(input) {
    const toolName = input.tool_name;
    logVerbose(`[browser-automation-gate] Checking: ${toolName}`);
    // Only intercept Playwright tools
    if (!isPlaywrightTool(toolName)) {
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    // Interaction tools (click, type) - always allow Playwright
    if (INTERACTION_TOOLS.includes(toolName)) {
        logVerbose(`[browser-automation-gate] Interaction tool - Playwright required`);
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
                permissionDecisionReason: 'Interaction tools require Playwright',
            },
        };
    }
    // For fetch-only tools, check Scrapling availability
    const scraplingHealth = getMcpServerHealth('scrapling');
    const scraplingConfigured = isScraplingConfigured();
    const scraplingAvailable = isScraplingAvailable();
    logVerbose(`[browser-automation-gate] Scrapling: configured=${scraplingConfigured} health=${scraplingHealth}`);
    // If Scrapling healthy, suggest it but allow Playwright
    if (scraplingAvailable) {
        logTerse('[!] Scrapling available - consider mcp__scrapling__s-fetch-page for anti-bot');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
                permissionDecisionReason: 'For anti-bot fetching, consider Scrapling MCP',
            },
        };
    }
    return {
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'allow',
        },
    };
}
/**
 * Check if a tool name is a Playwright MCP tool
 */
function isPlaywrightTool(toolName) {
    return toolName.toLowerCase().startsWith('mcp__playwright__');
}
// Register the hook
registerHook('browser-automation-gate', 'PreToolUse', browserAutomationGateHook);
export default browserAutomationGateHook;
//# sourceMappingURL=browser_automation_gate.js.map