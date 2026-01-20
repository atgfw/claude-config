/**
 * Changelog Generator Hook
 * Tracks commits for changelog generation
 * Event: PostToolUse (Bash git commit)
 */
import type { PostToolUseInput, PostToolUseOutput } from '../types.js';
/**
 * Changelog Generator Hook Implementation
 */
export declare function changelogGeneratorHook(input: PostToolUseInput): Promise<PostToolUseOutput>;
export default changelogGeneratorHook;
//# sourceMappingURL=changelog_generator.d.ts.map