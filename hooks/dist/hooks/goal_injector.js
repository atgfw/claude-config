/**
 * Goal Injector - Injects sharp pointed goal into ALL hook event types
 * Registers for: UserPromptSubmit, PostToolUse, SessionStart
 * Ensures every turn has goal context via additionalContext.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getClaudeDir } from '../utils.js';
import { registerHook } from '../runner.js';
const GOAL_FIELDS = ['who', 'what', 'when', 'where', 'why', 'how'];
const GOAL_SET_PATTERNS = [
    /\bthe\s+goal\s+is\b/i,
    /\bwe(?:'re| are)\s+working\s+on\b/i,
    /\bthe\s+task\s+is\b/i,
    /\bour\s+objective\s+is\b/i,
    /\bfocus(?:ing)?\s+on\b/i,
    /\bset\s+goal\s*:/i,
];
const GOAL_CLEAR_PATTERNS = [
    /\b(?:we(?:'re| are)\s+)?done\s+(?:with\s+)?(?:this|that|the)\s+(?:goal|task|project)\b/i,
    /\b(?:we(?:'re| are)\s+)?finished\s+(?:with\s+)?(?:this|that|the)\s+(?:goal|task|project)\b/i,
    /\bnew\s+(?:goal|task|project)\b/i,
    /\bclear\s+(?:the\s+)?goal\b/i,
    /\breset\s+(?:the\s+)?goal\b/i,
    /\bgoal\s+(?:is\s+)?(?:done|complete|finished)\b/i,
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
export function detectGoalSet(prompt) {
    return GOAL_SET_PATTERNS.some((p) => p.test(prompt));
}
export function detectGoalClear(prompt) {
    return GOAL_CLEAR_PATTERNS.some((p) => p.test(prompt));
}
export function extractGoalText(prompt) {
    // Try to extract the goal statement after the trigger phrase
    for (const pattern of GOAL_SET_PATTERNS) {
        const match = prompt.match(pattern);
        if (match && match.index !== undefined) {
            const after = prompt.slice(match.index + match[0].length).trim();
            // Take up to the first sentence boundary or end
            const sentence = after.match(/^[^.!?\n]+/);
            return sentence ? sentence[0].trim() : after.trim();
        }
    }
    return prompt.trim();
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
async function goalInjector(input) {
    const prompt = input.prompt || '';
    const goal = loadGoal();
    // Check for goal-clearing language first
    if (goal.goal && detectGoalClear(prompt)) {
        if (goal.summary) {
            goal.history.push({ summary: goal.summary, clearedAt: new Date().toISOString() });
        }
        const cleared = createEmptyGoal();
        cleared.history = goal.history;
        saveGoal(cleared);
        return { hookEventName: 'UserPromptSubmit' };
    }
    // Check for goal-setting language
    if (detectGoalSet(prompt)) {
        const text = extractGoalText(prompt);
        goal.goal = text;
        goal.summary = text;
        goal.updatedAt = new Date().toISOString();
        saveGoal(goal);
        const context = formatGoalContext(goal);
        return { hookEventName: 'UserPromptSubmit', additionalContext: context };
    }
    // Inject existing goal if active
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