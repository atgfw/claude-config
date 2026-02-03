/**
 * Goal Injector - Injects sharp pointed goal into ALL hook event types
 * Registers for: UserPromptSubmit, PostToolUse, SessionStart
 * Ensures every turn has goal context via additionalContext.
 *
 * Goal management is EXPLICIT via direct file edit only.
 * This hook is READ-ONLY - it never modifies the goal file.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getClaudeDir } from '../utils.js';
import { registerHook } from '../runner.js';
const GOAL_FIELDS = ['who', 'what', 'when', 'where', 'why', 'how'];
export function getGoalPath() {
    return path.join(getClaudeDir(), 'ledger', 'active-goal.json');
}
export function loadGoal() {
    const goalPath = getGoalPath();
    try {
        const raw = fs.readFileSync(goalPath, 'utf-8');
        return JSON.parse(raw);
    }
    catch {
        return createEmptyGoal();
    }
}
export function createEmptyGoal() {
    return {
        goal: null,
        fields: {
            who: 'unknown',
            what: 'unknown',
            when: 'unknown',
            where: 'unknown',
            why: 'unknown',
            how: 'unknown',
        },
        summary: null,
        updatedAt: null,
        history: [],
    };
}
export function saveGoal(goal) {
    const goalPath = getGoalPath();
    fs.writeFileSync(goalPath, JSON.stringify(goal, null, 2) + '\n', 'utf-8');
}
export function formatGoalContext(goal) {
    if (!goal.goal && !goal.summary)
        return '';
    const lines = [`ACTIVE GOAL: ${goal.summary ?? goal.goal}`];
    for (const field of GOAL_FIELDS) {
        const value = goal.fields[field];
        const display = value === 'unknown' ? 'UNKNOWN - rehydrate' : value;
        lines.push(`  ${field.toUpperCase()}: ${display}`);
    }
    return lines.join('\n');
}
export function hasDehydratedFields(goal) {
    return GOAL_FIELDS.some((f) => goal.fields[f] === 'unknown');
}
/**
 * UserPromptSubmit hook - inject goal context on every user prompt
 * READ-ONLY: Does not modify goal file
 */
async function goalInjector(_input) {
    const goal = loadGoal();
    if (goal.goal || goal.summary) {
        const context = formatGoalContext(goal);
        return { hookEventName: 'UserPromptSubmit', additionalContext: context };
    }
    return { hookEventName: 'UserPromptSubmit' };
}
/**
 * Get active goal context for embedding in other systems.
 * Returns null if no goal is active.
 */
export function getActiveGoalContext() {
    const goal = loadGoal();
    if (!goal.goal && !goal.summary)
        return null;
    return {
        summary: goal.summary ?? goal.goal,
        fields: { ...goal.fields },
    };
}
/**
 * PostToolUse hook - inject goal context after every tool use
 */
async function goalInjectorPostToolUse(_input) {
    const goal = loadGoal();
    if (goal.goal || goal.summary) {
        const context = formatGoalContext(goal);
        return {
            hookSpecificOutput: {
                hookEventName: 'PostToolUse',
                additionalContext: context,
            },
        };
    }
    return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
}
/**
 * SessionStart hook - inject goal context at session start
 */
async function goalInjectorSessionStart(_input) {
    const goal = loadGoal();
    if (goal.goal || goal.summary) {
        const context = formatGoalContext(goal);
        return { hookEventName: 'SessionStart', additionalContext: context };
    }
    return { hookEventName: 'SessionStart' };
}
registerHook('goal-injector', 'UserPromptSubmit', goalInjector);
registerHook('goal-injector-post', 'PostToolUse', goalInjectorPostToolUse);
registerHook('goal-injector-session', 'SessionStart', goalInjectorSessionStart);
export { goalInjector as goalInjectorHook, goalInjectorPostToolUse, goalInjectorSessionStart };
export default goalInjector;
//# sourceMappingURL=goal_injector.js.map