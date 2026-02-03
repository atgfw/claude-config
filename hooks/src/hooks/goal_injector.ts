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
import type {
  UserPromptSubmitInput,
  UserPromptSubmitOutput,
  PostToolUseInput,
  PostToolUseOutput,
  SessionStartInput,
  SessionStartOutput,
  StopInput,
  StopOutput,
} from '../types.js';
import { getClaudeDir } from '../utils.js';
import { registerHook } from '../runner.js';
import {
  getSessionId,
  formatGoalHierarchy,
  hasGlobalOverride,
  loadGlobalOverride,
  loadGoalStack,
} from '../session/goal_stack.js';

const GOAL_FIELDS = ['who', 'what', 'when', 'where', 'why', 'how'] as const;
type GoalField = (typeof GOAL_FIELDS)[number];

export interface ActiveGoal {
  goal: string | null;
  fields: Record<GoalField, string>;
  summary: string | null;
  updatedAt: string | null;
  history: Array<{ summary: string; clearedAt: string }>;
}

export function getGoalPath(): string {
  return path.join(getClaudeDir(), 'ledger', 'active-goal.json');
}

export function loadGoal(): ActiveGoal {
  const goalPath = getGoalPath();
  try {
    const raw = fs.readFileSync(goalPath, 'utf-8');
    return JSON.parse(raw) as ActiveGoal;
  } catch {
    return createEmptyGoal();
  }
}

export function createEmptyGoal(): ActiveGoal {
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

export function saveGoal(goal: ActiveGoal): void {
  const goalPath = getGoalPath();
  fs.writeFileSync(goalPath, JSON.stringify(goal, null, 2) + '\n', 'utf-8');
}

/**
 * Format goal context using the new hierarchical session-scoped system.
 * Falls back to global override if no session goals exist.
 */
export function formatGoalContext(goal: ActiveGoal, sessionId?: string): string {
  // Try session-scoped hierarchy first
  if (sessionId) {
    const stack = loadGoalStack(sessionId);
    if (stack.stack.length > 0 || hasGlobalOverride()) {
      return formatGoalHierarchy(sessionId);
    }
  }

  // Fall back to legacy global goal format
  if (!goal.goal && !goal.summary) return '';

  const lines: string[] = [`ACTIVE GOAL: ${goal.summary ?? goal.goal}`];
  for (const field of GOAL_FIELDS) {
    const value = goal.fields[field];
    const display = value === 'unknown' ? 'UNKNOWN - rehydrate' : value;
    lines.push(`  ${field.toUpperCase()}: ${display}`);
  }
  return lines.join('\n');
}

/**
 * Get the best available goal context.
 * Prefers session-scoped hierarchy, falls back to global.
 */
function getGoalContextForHook(sessionId?: string): string {
  // Check session stack first
  if (sessionId) {
    const stack = loadGoalStack(sessionId);
    if (stack.stack.length > 0) {
      return formatGoalHierarchy(sessionId);
    }
  }

  // Check global override
  if (hasGlobalOverride()) {
    const globalGoal = loadGlobalOverride();
    if (globalGoal) {
      // Format as simple hierarchy with just the global goal
      const sessionIdToUse = sessionId ?? getSessionId();
      return formatGoalHierarchy(sessionIdToUse);
    }
  }

  // Legacy fallback
  const goal = loadGoal();
  if (goal.goal || goal.summary) {
    return formatGoalContext(goal, sessionId);
  }

  return '';
}

export function hasDehydratedFields(goal: ActiveGoal): boolean {
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
async function goalInjector(input: UserPromptSubmitInput): Promise<UserPromptSubmitOutput> {
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
 * Returns null if no goal is active.
 */
export function getActiveGoalContext(): {
  summary: string;
  fields: Record<string, string>;
} | null {
  // Check session stack first
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

  // Check global override
  const globalGoal = loadGlobalOverride();
  if (globalGoal) {
    return {
      summary: globalGoal.summary,
      fields: { ...globalGoal.fields },
    };
  }

  // Legacy fallback
  const goal = loadGoal();
  if (!goal.goal && !goal.summary) return null;
  const summary = goal.summary ?? goal.goal ?? '';
  return {
    summary,
    fields: { ...goal.fields },
  };
}

/**
 * PostToolUse hook - inject goal context after every tool use
 */
async function goalInjectorPostToolUse(_input: PostToolUseInput): Promise<PostToolUseOutput> {
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
async function goalInjectorSessionStart(input: SessionStartInput): Promise<SessionStartOutput> {
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
async function goalInjectorStop(input: StopInput): Promise<StopOutput> {
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

export {
  goalInjector as goalInjectorHook,
  goalInjectorPostToolUse,
  goalInjectorSessionStart,
  goalInjectorStop,
};
export default goalInjector;
