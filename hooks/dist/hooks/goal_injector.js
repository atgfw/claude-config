/**
 * Goal Injector - Injects hierarchical goal context into ALL hook event types
 * Registers for: UserPromptSubmit, PostToolUse, SessionStart
 * Ensures every turn has goal context via additionalContext.
 *
 * Priority:
 * 1. Global override (active-goal.json with explicit goal) - backward compat
 * 2. Session-scoped goal stack (hierarchical)
 *
 * This hook is READ-ONLY - it never modifies goal files.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getClaudeDir } from '../utils.js';
import { registerHook } from '../runner.js';
import { getSessionId, formatGoalHierarchy, loadGoalStack } from '../session/goal_stack.js';
// Task Specification v1.0 - All 11 sections
const GOAL_FIELDS = [
    'who',
    'what',
    'when',
    'where',
    'why',
    'how',
    'which',
    'lest',
    'with',
    'measuredBy',
];
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
            which: 'Target object not specified',
            lest: 'Failure modes not defined',
            with: 'Dependencies not enumerated',
            measuredBy: 'Success metrics not defined',
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
/**
 * Format goal context using the session-scoped system.
 * NO GLOBAL FALLBACK - each session has its own goals.
 */
export function formatGoalContext(_goal, sessionId) {
    // Session-scoped hierarchy only (legacy goal param ignored)
    const resolvedSessionId = sessionId ?? getSessionId();
    const stack = loadGoalStack(resolvedSessionId);
    if (stack.stack.length > 0) {
        return formatGoalHierarchy(resolvedSessionId);
    }
    // No session goals - return empty
    return '';
}
/**
 * Get the best available goal context.
 * SESSION-SCOPED ONLY - no global fallback to prevent cross-project/session bleeding.
 */
function getGoalContextForHook(sessionId) {
    // Session-scoped goals ONLY - no global fallback
    const resolvedSessionId = sessionId ?? getSessionId();
    const stack = loadGoalStack(resolvedSessionId);
    if (stack.stack.length > 0) {
        return formatGoalHierarchy(resolvedSessionId);
    }
    // No session goal - return empty (will trigger soft prompt)
    return '';
}
export function hasDehydratedFields(goal) {
    return GOAL_FIELDS.some((f) => goal.fields[f] === 'unknown');
}
const NO_GOAL_SOFT_PROMPT = `NO ACTIVE GOAL SET. Consider defining a goal before proceeding:
  - Use "set goal: <description>" to define what you're working toward
  - Goals provide focus and traceability across sessions
  - Include WHO/WHAT/WHEN/WHERE/WHY/HOW for complete context`;
/**
 * UserPromptSubmit hook - inject goal context on every user prompt
 * READ-ONLY: Does not modify goal file
 */
async function goalInjector(input) {
    const sessionId = getSessionId(input);
    const context = getGoalContextForHook(sessionId);
    if (context) {
        return { hookEventName: 'UserPromptSubmit', additionalContext: context };
    }
    // No goal set - inject soft prompt suggestion
    return { hookEventName: 'UserPromptSubmit', additionalContext: NO_GOAL_SOFT_PROMPT };
}
/**
 * Get active goal context for embedding in other systems.
 * SESSION-SCOPED ONLY - returns null if no session goal is active.
 */
export function getActiveGoalContext() {
    // Session stack only - no global fallback
    const sessionId = getSessionId();
    const stack = loadGoalStack(sessionId);
    if (stack.stack.length > 0) {
        const current = stack.stack[0];
        if (current) {
            return {
                summary: current.summary,
                fields: { ...current.fields },
            };
        }
    }
    // No session goal - return null
    return null;
}
/**
 * PostToolUse hook - inject goal context after every tool use
 */
async function goalInjectorPostToolUse(_input) {
    // PostToolUseInput doesn't have session_id, derive from env
    const sessionId = getSessionId();
    const context = getGoalContextForHook(sessionId);
    if (context) {
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
async function goalInjectorSessionStart(input) {
    const sessionId = getSessionId(input);
    const context = getGoalContextForHook(sessionId);
    if (context) {
        return { hookEventName: 'SessionStart', additionalContext: context };
    }
    // No goal set - inject soft prompt suggestion
    return { hookEventName: 'SessionStart', additionalContext: NO_GOAL_SOFT_PROMPT };
}
/**
 * Stop hook - inject goal context at session stop
 * Allows final context to include goal state for session summary
 */
async function goalInjectorStop(input) {
    const sessionId = getSessionId(input);
    const context = getGoalContextForHook(sessionId);
    // Stop hooks return decision + reason, we approve and include goal context in reason
    if (context) {
        return {
            decision: 'approve',
            reason: `Session ending with active goal:\n${context}`,
        };
    }
    return { decision: 'approve' };
}
registerHook('goal-injector', 'UserPromptSubmit', goalInjector);
registerHook('goal-injector-post', 'PostToolUse', goalInjectorPostToolUse);
registerHook('goal-injector-session', 'SessionStart', goalInjectorSessionStart);
registerHook('goal-injector-stop', 'Stop', goalInjectorStop);
export { goalInjector as goalInjectorHook, goalInjectorPostToolUse, goalInjectorSessionStart, goalInjectorStop, };
export default goalInjector;
//# sourceMappingURL=goal_injector.js.map