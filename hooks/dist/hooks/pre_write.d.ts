/**
 * Pre-Write Hook
 * BLOCKS Write/Edit when Morph MCP is available
 * BLOCKS emoji content
 * WARNS on file governance violations (non-blocking)
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
/**
 * Pre-Write Hook Implementation
 *
 * Checks Write/Edit operations for:
 * 1. Emoji content (BLOCK)
 * 2. Morph MCP availability (BLOCK - should use edit_file instead)
 * 3. File governance rules (WARN - non-blocking)
 */
export declare function preWriteHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default preWriteHook;
//# sourceMappingURL=pre_write.d.ts.map