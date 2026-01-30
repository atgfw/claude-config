/**
 * Goal Injector - UserPromptSubmit hook
 * Maintains and injects a "sharp pointed goal" into every turn via additionalContext.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { UserPromptSubmitInput, UserPromptSubmitOutput } from '../types.js';
import { getClaudeDir } from '../utils.js';
import { registerHook } from '../runner.js';

const GOAL_FIELDS = ['who', 'what', 'when', 'where', 'why', 'how'] as const;
type GoalField = (typeof GOAL_FIELDS)[number];

export interface ActiveGoal {
  goal: string | null;
  fields: Record<GoalField, string>;
  summary: string | null;
  updatedAt: string | null;
  history: Array<{ summary: string; clearedAt: string }>;
}

const GOAL_SET_PATTERNS = [
  /\bthe\s+goal\s+is\b/i,
  /\bwe(?:'re| are)\s+working\s+on\b/i,
  /\bthe\s+task\s+is\b/i,
  /\bour\s+objective\s+is\b/i,
  /\bfocus(?:ing)?\s+on\b/i,
  /\bset\s+goal\s*:/i,
];

const GOAL_CLEAR_PATTERNS = [
  /\b(?:we(?:'re| are)\s+)?done\b/i,
  /\b(?:we(?:'re| are)\s+)?finished\b/i,
  /\bnew\s+task\b/i,
  /\bclear\s+goal\b/i,
  /\breset\s+goal\b/i,
];

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

export function detectGoalSet(prompt: string): boolean {
  return GOAL_SET_PATTERNS.some((p) => p.test(prompt));
}

export function detectGoalClear(prompt: string): boolean {
  return GOAL_CLEAR_PATTERNS.some((p) => p.test(prompt));
}

export function extractGoalText(prompt: string): string {
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

export function formatGoalContext(goal: ActiveGoal): string {
  if (!goal.goal && !goal.summary) return '';

  const lines: string[] = [`ACTIVE GOAL: ${goal.summary ?? goal.goal}`];
  for (const field of GOAL_FIELDS) {
    const value = goal.fields[field];
    const display = value === 'unknown' ? 'UNKNOWN - rehydrate' : value;
    lines.push(`  ${field.toUpperCase()}: ${display}`);
  }
  return lines.join('\n');
}

export function hasDehydratedFields(goal: ActiveGoal): boolean {
  return GOAL_FIELDS.some((f) => goal.fields[f] === 'unknown');
}

async function goalInjector(input: UserPromptSubmitInput): Promise<UserPromptSubmitOutput> {
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

registerHook('goal-injector', 'UserPromptSubmit', goalInjector);
export { goalInjector as goalInjectorHook };
export default goalInjector;
