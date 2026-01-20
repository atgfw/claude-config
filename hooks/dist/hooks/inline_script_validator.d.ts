/**
 * Inline Script Validator Hook
 * BLOCKS complex inline scripts that fail due to quote/escape issues
 * Enforces: "Never use complex inline scripts - They WILL fail. Use temp file pattern."
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
/**
 * Inline Script Validator Hook Implementation
 *
 * Checks bash commands for complex inline scripts that will fail:
 * - node -e with JSON, template literals, or mixed quotes
 * - powershell -Command with $ variables
 * - heredoc with backticks or $() substitution
 * - Multiple levels of quote nesting
 */
export declare function inlineScriptValidatorHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default inlineScriptValidatorHook;
//# sourceMappingURL=inline_script_validator.d.ts.map