/**
 * Commit Message Validator Hook
 * Validates commit messages follow Conventional Commits 1.0.0
 * Enforcement: WARN - Display warning but allow commit
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
/**
 * Commit Message Validator Hook Implementation
 */
export declare function commitMessageValidatorHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default commitMessageValidatorHook;
//# sourceMappingURL=commit_message_validator.d.ts.map