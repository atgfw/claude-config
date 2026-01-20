/**
 * Escalation Trigger Hook (PostToolUse)
 *
 * Monitors tool use results for patterns that indicate systematic issues.
 * Auto-escalates when warnings, repeated errors, or governance violations occur.
 */
import type { PostToolUseInput, PostToolUseOutput } from '../types.js';
/**
 * Escalation Trigger Hook
 *
 * Monitors PostToolUse events for patterns that indicate systematic issues.
 * When patterns are detected, escalates to the registry for tracking.
 */
export declare function escalationTriggerHook(input: PostToolUseInput): Promise<PostToolUseOutput>;
export default escalationTriggerHook;
//# sourceMappingURL=escalation_trigger.d.ts.map