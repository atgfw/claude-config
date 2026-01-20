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

import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
import {
  log,
  logAllowed,
  isScraplingAvailable,
  isScraplingConfigured,
  getMcpServerHealth,
} from '../utils.js';
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
export async function browserAutomationGateHook(input: PreToolUseInput): Promise<PreToolUseOutput> {
  const toolName = input.tool_name;

  log(`[browser-automation-gate] Checking tool: ${toolName}`);

  // Only intercept Playwright tools
  if (!isPlaywrightTool(toolName)) {
    logAllowed('Not a Playwright tool - passing through');
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  // Check if this is an interaction tool (click, type) - always allow Playwright for these
  if (INTERACTION_TOOLS.includes(toolName)) {
    log(`[browser-automation-gate] Interaction tool detected - Playwright required`);
    logAllowed('Playwright allowed - interaction tools require Playwright MCP');

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason:
          'Interaction tools (click, type, screenshot) require Playwright MCP',
      },
    };
  }

  // For fetch-only tools, check if Scrapling is available
  const scraplingHealth = getMcpServerHealth('scrapling');
  const scraplingConfigured = isScraplingConfigured();
  const scraplingAvailable = isScraplingAvailable();

  log(`[browser-automation-gate] Fetch tool - checking Scrapling:`);
  log(`  - Configured: ${scraplingConfigured}`);
  log(`  - Health: ${scraplingHealth}`);
  log(`  - Available: ${scraplingAvailable}`);

  // If Scrapling is healthy, suggest it for fetch operations but allow Playwright
  if (scraplingAvailable) {
    log('');
    log('SCRAPLING AVAILABLE - Consider using for anti-bot fetching:');
    log('  MCP: mcp__scrapling__s-fetch-page(url, mode)');
    log('  CLI: scrapling extract fetch "URL" output.md');
    log('');
    log('Allowing Playwright for full browser automation capabilities.');

    logAllowed('Playwright allowed - Scrapling suggested for fetch-only operations');

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason:
          'Playwright allowed. For anti-bot fetching, consider: mcp__scrapling__s-fetch-page or scrapling CLI',
      },
    };
  }

  // Scrapling not available - allow Playwright
  logAllowed('Playwright allowed - Scrapling not available');

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
function isPlaywrightTool(toolName: string): boolean {
  return toolName.toLowerCase().startsWith('mcp__playwright__');
}

// Register the hook
registerHook('browser-automation-gate', 'PreToolUse', browserAutomationGateHook);

export default browserAutomationGateHook;
