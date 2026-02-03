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
import { registerHook } from '../runner.js';
import { log } from '../utils.js';
import {
  getSessionId,
  loadGoalStack,
  pushGoal,
  popGoalById,
  createTaskGoal,
  getCurrentGoal,
  type GoalLevel,
} from '../session/goal_stack.js';

// ============================================================================
// Types
// ============================================================================

interface TaskCreateInput {
  subject: string;
  description?: string;
  activeForm?: string;
  metadata?: Record<string, unknown>;
}

interface TaskUpdateInput {
  taskId: string;
  status?: 'pending' | 'in_progress' | 'completed' | 'deleted';
  subject?: string;
  description?: string;
  activeForm?: string;
  metadata?: Record<string, unknown>;
}

interface TaskToolOutput {
  id?: string;
  subject?: string;
  description?: string;
  status?: string;
}

// ============================================================================
// PostToolUse Hook Implementation
// ============================================================================

/**
 * PostToolUse hook for Task tools - sync goals after successful operations.
 */
async function taskGoalSync(input: PostToolUseInput): Promise<PostToolUseOutput> {
  const { tool_name, tool_input, tool_output } = input;

  // Only process Task tools
  if (tool_name !== 'TaskCreate' && tool_name !== 'TaskUpdate') {
    return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
  }

  const sessionId = getSessionId();
  const output = tool_output as TaskToolOutput | undefined;

  if (tool_name === 'TaskCreate') {
    return handleTaskCreate(tool_input as unknown as TaskCreateInput, output);
  }

  return handleTaskUpdate(sessionId, tool_input as unknown as TaskUpdateInput, output);
}

/**
 * Handle TaskCreate - note that a task was created.
 * The task becomes the goal focus when marked in_progress.
 */
function handleTaskCreate(
  input: TaskCreateInput,
  output: TaskToolOutput | undefined
): PostToolUseOutput {
  const taskId = output?.id ?? `temp-${Date.now()}`;
  const subject = input.subject;

  log(`[task-goal-sync] TaskCreate: "${subject}" (id: ${taskId})`);

  // Don't push as goal yet - wait for in_progress status
  // This avoids cluttering the goal stack with pending tasks

  return {
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: `Task created: "${subject}". Set status to in_progress to make it the current goal focus.`,
    },
  };
}

/**
 * Handle TaskUpdate - push/pop goals based on status transitions.
 */
function handleTaskUpdate(
  sessionId: string,
  input: TaskUpdateInput,
  output: TaskToolOutput | undefined
): PostToolUseOutput {
  const { taskId, status, subject, description } = input;

  if (!status) {
    // No status change - nothing to do for goal sync
    return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
  }

  const goalId = `task-${taskId}`;

  switch (status) {
    case 'in_progress': {
      // Push task as current goal focus
      const taskSubject = subject ?? output?.subject ?? `Task #${taskId}`;
      const taskDescription = description ?? output?.description;

      // Check if already on stack
      const currentGoal = getCurrentGoal(sessionId);
      if (currentGoal?.id === goalId) {
        log(`[task-goal-sync] Task ${taskId} already current focus`);
        return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
      }

      // Check if already in stack (not at top)
      const stack = loadGoalStack(sessionId);
      const existingGoal = stack.stack.find((g) => g.id === goalId);
      if (existingGoal) {
        log(`[task-goal-sync] Task ${taskId} already in goal stack`);
        return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
      }

      // Create and push new goal
      const goal = createTaskGoal(taskId, taskSubject, taskDescription);
      pushGoal(sessionId, goal);
      log(`[task-goal-sync] Pushed goal: "${taskSubject}"`);

      return {
        hookSpecificOutput: {
          hookEventName: 'PostToolUse',
          additionalContext: `Goal focus set: "${taskSubject}"`,
        },
      };
    }

    case 'completed': {
      // Pop task from goal stack if it's the current focus
      const popped = popGoalById(sessionId, goalId, true, 'TaskGoalSync');

      if (popped) {
        log(`[task-goal-sync] Completed and popped: "${popped.summary}"`);

        // Check if there's a parent goal to return focus to
        const stack = loadGoalStack(sessionId);
        const parentGoal = stack.stack[0];

        if (parentGoal) {
          return {
            hookSpecificOutput: {
              hookEventName: 'PostToolUse',
              additionalContext: `Task completed. Focus returned to: "${parentGoal.summary}"`,
            },
          };
        }

        return {
          hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext: `Task completed. Goal stack is now empty.`,
          },
        };
      }

      log(`[task-goal-sync] Task ${taskId} completed but was not current focus`);
      return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
    }

    case 'deleted': {
      // Remove task from goal stack if present
      const deleted = popGoalById(sessionId, goalId, false, 'TaskGoalSync');

      if (deleted) {
        log(`[task-goal-sync] Deleted from goal stack: "${deleted.summary}"`);
        return {
          hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext: `Task deleted from goal focus.`,
          },
        };
      }

      return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
    }

    case 'pending': {
      // Task returned to pending - pop from active goals if present
      const pendingPopped = popGoalById(sessionId, goalId, false, 'TaskGoalSync');

      if (pendingPopped) {
        log(`[task-goal-sync] Returned to pending: "${pendingPopped.summary}"`);
        return {
          hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext: `Task returned to pending. Removed from goal focus.`,
          },
        };
      }

      return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get the current task goal if one is active.
 */
export function getCurrentTaskGoal(sessionId?: string): GoalLevel | null {
  const resolvedSessionId = sessionId ?? getSessionId();
  const stack = loadGoalStack(resolvedSessionId);
  const current = stack.stack[0];

  if (current && current.source.claude_task_id) {
    return current;
  }

  return null;
}

/**
 * Check if a specific task is the current goal focus.
 */
export function isTaskCurrentFocus(taskId: string, sessionId?: string): boolean {
  const resolvedSessionId = sessionId ?? getSessionId();
  const stack = loadGoalStack(resolvedSessionId);
  const current = stack.stack[0];

  return current?.id === `task-${taskId}`;
}

// Register the hook
registerHook('task-goal-sync', 'PostToolUse', taskGoalSync);

export { taskGoalSync };
export default taskGoalSync;
