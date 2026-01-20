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
/**
 * Browser Automation Gate Hook
 *
 * Routes browser automation based on operation type:
 * - Fetch operations: Suggest Scrapling MCP/CLI (anti-bot)
 * - Interaction operations: Allow Playwright MCP
 */
export declare function browserAutomationGateHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default browserAutomationGateHook;
//# sourceMappingURL=browser_automation_gate.d.ts.map