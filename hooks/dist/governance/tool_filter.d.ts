/**
 * Generic Tool Filter Hook
 *
 * Blocks or allows MCP tools based on patterns defined in tool-filter-config.json.
 * This is the "usual whitelisting/blacklisting" mechanism for Claude Code tools.
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
export declare function toolFilterHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
//# sourceMappingURL=tool_filter.d.ts.map