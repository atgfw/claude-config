/**
 * Task-Goal Synchronization Hook
 *
 * Synchronizes Claude Code Task tool operations with the session goal stack.
 * - On TaskCreate: Note task creation (goal pushed when marked in_progress)
 * - On TaskUpdate (in_progress): Push task as current goal focus
 * - On TaskUpdate (completed): Pop task from goal stack
 * - On TaskUpdate (deleted): Remove from goal stack
 *
 * Uses PostToolUse to capture actual task IDs from tool output.
 */
import type { PostToolUseInput, PostToolUseOutput } from '../types.js';
import { type GoalLevel } from '../session/goal_stack.js';
/**
 * PostToolUse hook for Task tools - sync goals after successful operations.
 */
declare function taskGoalSync(input: PostToolUseInput): Promise<PostToolUseOutput>;
/**
 * Get the current task goal if one is active.
 */
export declare function getCurrentTaskGoal(sessionId?: string): GoalLevel | null;
/**
 * Check if a specific task is the current goal focus.
 */
export declare function isTaskCurrentFocus(taskId: string, sessionId?: string): boolean;
export { taskGoalSync };
export default taskGoalSync;
//# sourceMappingURL=task_goal_sync.d.ts.map