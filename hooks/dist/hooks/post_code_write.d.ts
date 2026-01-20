/**
 * Post-Code-Write Hook
 * BLOCKS until code-reviewer is invoked after writing code
 * Enforces: "After writing code | code-reviewer | Immediately after Write/Edit"
 */
import type { PostToolUseInput, PostToolUseOutput } from '../types.js';
/**
 * Post-Code-Write Hook Implementation
 *
 * After Write/Edit operations, enforces that code review was performed.
 * Uses a flag file to track whether code-reviewer was invoked.
 * Also sets visual-validation-needed flag for frontend files.
 */
export declare function postCodeWriteHook(input: PostToolUseInput): Promise<PostToolUseOutput>;
export default postCodeWriteHook;
//# sourceMappingURL=post_code_write.d.ts.map