/**
 * Pre-Task-Complete Hook
 * BLOCKS task completion until:
 * 1. Visual validation is performed (when frontend code was written)
 * 2. Warns about unverified success criteria in PROJECT-DIRECTIVE.md
 *
 * Enforces:
 * - "Task completion requires visual validation using MCP tools"
 * - "All success criteria must be verified before project completion"
 */
import type { StopInput, StopOutput } from '../types.js';
/**
 * Pre-Task-Complete Hook Implementation
 *
 * Before allowing task completion:
 * 1. Checks if visual validation is needed (frontend code was written)
 * 2. Checks success criteria verification status from PROJECT-DIRECTIVE.md
 */
export declare function preTaskCompleteHook(_input: StopInput): Promise<StopOutput>;
export default preTaskCompleteHook;
//# sourceMappingURL=pre_task_complete.d.ts.map