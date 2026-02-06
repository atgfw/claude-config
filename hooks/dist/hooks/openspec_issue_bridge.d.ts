/**
 * OpenSpec Issue Bridge Hook (PostToolUse)
 *
 * Detects when an OpenSpec proposal.md is written and auto-creates
 * a corresponding GitHub issue. Links the issue to the OpenSpec change
 * in the sync registry.
 *
 * This bridges manual OpenSpec creation (via /openspec:proposal skill)
 * to the GitHub issue tracking system.
 */
import type { PostToolUseInput, PostToolUseOutput } from '../types.js';
/** Extract the OpenSpec change ID from a proposal.md file path */
export declare function extractChangeId(filePath: string): string | null;
/**
 * PostToolUse hook - auto-create GitHub issue when proposal.md is written.
 */
declare function openspecIssueBridge(input: PostToolUseInput): Promise<PostToolUseOutput>;
export { openspecIssueBridge };
export default openspecIssueBridge;
//# sourceMappingURL=openspec_issue_bridge.d.ts.map