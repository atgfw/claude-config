/**
 * Post-Tool-Use Hook
 * ENFORCES Scrapling MCP preference over Playwright for browser automation
 * Enforces: "USE SCRAPLING MCP for all browser automation tasks"
 */
import type { PostToolUseInput, PostToolUseOutput } from '../types.js';
/**
 * Post-Tool-Use Hook Implementation
 *
 * After any tool execution, checks for browser automation usage
 * and enforces Scrapling preference over Playwright.
 */
export declare function postToolUseHook(input: PostToolUseInput): Promise<PostToolUseOutput>;
export default postToolUseHook;
//# sourceMappingURL=post_tool_use.d.ts.map