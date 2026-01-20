/**
 * Pre-Bash Hook
 * BLOCKS deletion commands, emoji usage, file write redirections, and direct browser automation
 * Enforces: "Deletion is banned - move to old/", "Never use emojis", "Use MCP for file writes", "Use MCP for browser automation"
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
/** * Pre-Bash Hook Implementation
 *
 * Checks bash commands before execution for:
 * 1. File write redirections (cat >, echo >, printf >, heredoc)
 * 2. Deletion commands (rm, del, Remove-Item, rmdir, rd)
 * 3. Emoji content
 * 4. Direct browser automation (must use MCP instead)
 */
export declare function preBashHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default preBashHook;
//# sourceMappingURL=pre_bash.d.ts.map