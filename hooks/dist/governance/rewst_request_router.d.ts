/**
 * Rewst Request Router Hook
 *
 * Routes incoming requests to appropriate subagents based on content analysis.
 * Only activates when CLAUDE_PROJECT_DIR matches Rewst project patterns.
 */
import type { UserPromptSubmitInput, UserPromptSubmitOutput } from '../types.js';
export declare function rewstRequestRouterHook(input: UserPromptSubmitInput): Promise<UserPromptSubmitOutput>;
//# sourceMappingURL=rewst_request_router.d.ts.map