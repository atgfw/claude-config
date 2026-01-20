/**
 * Quality Check Hook
 * PostToolUse hook that runs TypeScript, ESLint (via XO), and Prettier checks
 * on edited files. Integrates bartolli/claude-code-typescript-hooks patterns.
 *
 * EXIT BEHAVIOR:
 *   - allow: All checks passed
 *   - block: Quality issues found that must be fixed
 */
import type { PostToolUseInput, PostToolUseOutput } from '../types.js';
export declare function qualityCheckHook(input: PostToolUseInput): Promise<PostToolUseOutput>;
//# sourceMappingURL=quality_check.d.ts.map