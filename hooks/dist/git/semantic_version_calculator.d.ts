/**
 * Semantic Version Calculator Hook
 * Tracks releases and calculates version bumps
 * Event: PostToolUse (Bash git tag)
 */
import type { PostToolUseInput, PostToolUseOutput } from '../types.js';
/**
 * Semantic Version Calculator Hook Implementation
 */
export declare function semanticVersionCalculatorHook(input: PostToolUseInput): Promise<PostToolUseOutput>;
export default semanticVersionCalculatorHook;
//# sourceMappingURL=semantic_version_calculator.d.ts.map