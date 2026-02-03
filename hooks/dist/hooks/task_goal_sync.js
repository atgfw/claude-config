/**
 * Task-Goal Synchronization Hook
 *
 * Synchronizes Claude Code Task tool operations with the session goal stack.
 * - On TaskCreate: Push task as goal
 * - On TaskUpdate (in_progress): Push if not on stack
 * - On TaskUpdate (completed): Pop from stack
 */
import { registerHook } from '../runner.js';
import { log } from '../utils.js';
import { getSessionId, loadGoalStack, pushGoal, popGoalById, createTaskGoal, getCurrentGoal, } from '../session/goal_stack.js';
/**
 * Extract task ID from TaskCreate response or generate one.
 * Since PreToolUse runs BEFORE the tool, we need to predict/track the ID.
 */
function generateTaskGoalId(subject) {
    // Use a hash of subject + timestamp for uniqueness
    const timestamp = Date.now();
    const hash = Buffer.from(`${subject}:${timestamp}`).toString('base64').slice(0, 8);
    return `task-${hash}`;
}
/**
 * PreToolUse hook for TaskCreate - push new task as goal
 */
async function taskGoalSyncCreate(input) {
    if (input.tool_name !== 'TaskCreate') {
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    const taskInput = input.tool_input;
    const sessionId = getSessionId();
    log(`[task-goal-sync] TaskCreate detected: "${taskInput.subject}"`);
    // Create and push goal for the new task
    // Note: We use a temporary ID since the real task ID is assigned after creation
    const taskId = generateTaskGoalId(taskInput.subject);
    const goal = createTaskGoal(taskId, taskInput.subject, taskInput.description);
    pushGoal(sessionId, goal);
    log(`[task-goal-sync] Pushed goal: ${goal.summary}`);
    return {
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'allow',
            permissionDecisionReason: `Goal pushed for task: ${taskInput.subject}`,
        },
    };
}
/**
 * PreToolUse hook for TaskUpdate - handle status transitions
 */
async function taskGoalSyncUpdate(input) {
    if (input.tool_name !== 'TaskUpdate') {
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    const taskInput = input.tool_input;
    const sessionId = getSessionId();
    if (!taskInput.status) {
        // No status change, allow through
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    const goalId = `task-${taskInput.taskId}`;
    if (taskInput.status === 'in_progress') {
        // Check if task is already on stack
        const currentGoal = getCurrentGoal(sessionId);
        if (currentGoal?.id === goalId) {
            log(`[task-goal-sync] Task ${taskInput.taskId} already active`);
        }
        else {
            // Try to find task info from stack or create minimal goal
            const stack = loadGoalStack(sessionId);
            const existingGoal = stack.stack.find((g) => g.id === goalId);
            if (!existingGoal) {
                // Create new goal from task update
                const subject = taskInput.subject ?? `Task #${taskInput.taskId}`;
                const goal = createTaskGoal(taskInput.taskId, subject, taskInput.description);
                pushGoal(sessionId, goal);
                log(`[task-goal-sync] Pushed in_progress goal: ${subject}`);
            }
        }
    }
    else if (taskInput.status === 'completed') {
        // Pop the completed task from goal stack
        const popped = popGoalById(sessionId, goalId, true, 'TaskUpdate');
        if (popped) {
            log(`[task-goal-sync] Popped completed goal: ${popped.summary}`);
        }
        else {
            log(`[task-goal-sync] Task ${taskInput.taskId} was not current focus, no pop needed`);
        }
    }
    else if (taskInput.status === 'deleted') {
        // Pop without marking as successful completion
        const popped = popGoalById(sessionId, goalId, false, 'TaskUpdate');
        if (popped) {
            log(`[task-goal-sync] Popped deleted goal: ${popped.summary}`);
        }
    }
    return {
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'allow',
        },
    };
}
// Register hooks
registerHook('task-goal-sync-create', 'PreToolUse', taskGoalSyncCreate);
registerHook('task-goal-sync-update', 'PreToolUse', taskGoalSyncUpdate);
export { taskGoalSyncCreate, taskGoalSyncUpdate };
//# sourceMappingURL=task_goal_sync.js.map