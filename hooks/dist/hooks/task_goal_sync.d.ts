/**
 * Task-Goal Synchronization Hook
 *
 * Synchronizes Claude Code Task tool operations with the session goal stack.
 * - On TaskCreate: Push task as goal
 * - On TaskUpdate (in_progress): Push if not on stack
 * - On TaskUpdate (completed): Pop from stack
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
/**
 * PreToolUse hook for TaskCreate - push new task as goal
 */
declare function taskGoalSyncCreate(input: PreToolUseInput): Promise<PreToolUseOutput>;
/**
 * PreToolUse hook for TaskUpdate - handle status transitions
 */
declare function taskGoalSyncUpdate(input: PreToolUseInput): Promise<PreToolUseOutput>;
export { taskGoalSyncCreate, taskGoalSyncUpdate };
//# sourceMappingURL=task_goal_sync.d.ts.map