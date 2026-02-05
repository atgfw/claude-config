/**
 * Rewst Jinja Validator Hook
 *
 * Validates Jinja expressions in files for Rewst-specific anti-patterns.
 * Only activates when CLAUDE_PROJECT_DIR matches Rewst project patterns.
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
export declare function rewstJinjaValidatorHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
//# sourceMappingURL=rewst_jinja_validator.d.ts.map