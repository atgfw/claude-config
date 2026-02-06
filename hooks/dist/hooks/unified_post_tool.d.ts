/**
 * Unified Post Tool - Consolidates PostToolUse hooks into 1
 *
 * Includes:
 * - API key leak detection
 * - Throttled auto-commit (max once per 5 minutes)
 */
import type { PostToolUseInput, PostToolUseOutput } from '../types.js';
declare function unifiedPostTool(input: PostToolUseInput): Promise<PostToolUseOutput>;
export default unifiedPostTool;
//# sourceMappingURL=unified_post_tool.d.ts.map