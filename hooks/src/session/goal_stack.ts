/**
 * Session-Scoped Goal Stack Management
 *
 * Provides session-isolated goal state with hierarchical tracking.
 * Goals auto-populate from TaskUpdate operations and GitHub issue context.
 *
 * Storage: ~/.claude/sessions/{session_id}/goal-stack.json
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { getClaudeDir } from '../utils.js';
import type { HookInput } from '../types.js';

// ============================================================================
// Types
// ============================================================================

export type GoalType = 'epic' | 'issue' | 'task' | 'subtask';
export type GoalPushedBy = 'TaskUpdate' | 'IssueDetection' | 'Manual' | 'SessionStart';

export interface GoalFields {
  who: string;
  what: string;
  when: string;
  where: string;
  why: string;
  how: string;
}

export interface GoalSource {
  github_issue?: number;
  claude_task_id?: string;
  openspec_change?: string;
  manual?: boolean;
}

export interface GoalLevel {
  id: string;
  type: GoalType;
  summary: string;
  fields: GoalFields;
  source: GoalSource;
  pushedAt: string;
  pushedBy: GoalPushedBy;
}

export interface GoalHistoryEntry {
  goal: GoalLevel;
  poppedAt: string;
  poppedBy: string;
  completedSuccessfully: boolean;
}

export interface SessionGoalStack {
  session_id: string;
  working_directory: string;
  stack: GoalLevel[]; // index 0 = deepest (current focus), last = highest (epic)
  history: GoalHistoryEntry[];
  lastModified: string;
}

// ============================================================================
// Session ID Resolution
// ============================================================================

/**
 * Resolve session ID from hook input, environment, or process context.
 *
 * Priority:
 * 1. input.session_id (from Claude Code)
 * 2. CLAUDE_SESSION_ID environment variable
 * 3. Hash of process.ppid + working directory
 */
export function getSessionId(input?: HookInput): string {
  // 1. Check hook input for session_id
  if (input && 'session_id' in input && input.session_id) {
    return input.session_id;
  }

  // 2. Check environment variable
  const envSessionId = process.env['CLAUDE_SESSION_ID'];
  if (envSessionId) {
    return envSessionId;
  }

  // 3. Generate from ppid + working directory hash
  const ppid = process.ppid;
  const cwd = process.cwd();
  const hash = crypto.createHash('sha256').update(`${ppid}:${cwd}`).digest('hex').substring(0, 16);
  return `session-${hash}`;
}

/**
 * Set the session ID in environment for subsequent hook calls.
 */
export function setSessionIdEnv(sessionId: string): void {
  process.env['CLAUDE_SESSION_ID'] = sessionId;
}

// ============================================================================
// Session Directory Management
// ============================================================================

/**
 * Get the path to a session's directory.
 */
export function getSessionDir(sessionId: string): string {
  return path.join(getClaudeDir(), 'sessions', sessionId);
}

/**
 * Get the path to a session's goal stack file.
 */
export function getGoalStackPath(sessionId: string): string {
  return path.join(getSessionDir(sessionId), 'goal-stack.json');
}

/**
 * Ensure session directory exists.
 */
export function ensureSessionDir(sessionId: string): void {
  const sessionDir = getSessionDir(sessionId);
  fs.mkdirSync(sessionDir, { recursive: true });
}

// ============================================================================
// Goal Stack CRUD
// ============================================================================

/**
 * Create an empty goal stack for a session.
 */
export function createEmptyStack(sessionId: string, workingDirectory?: string): SessionGoalStack {
  return {
    session_id: sessionId,
    working_directory: workingDirectory ?? process.cwd(),
    stack: [],
    history: [],
    lastModified: new Date().toISOString(),
  };
}

/**
 * Load goal stack from session directory.
 * Returns empty stack if not found.
 */
export function loadGoalStack(sessionId: string): SessionGoalStack {
  const stackPath = getGoalStackPath(sessionId);
  try {
    const raw = fs.readFileSync(stackPath, 'utf-8');
    return JSON.parse(raw) as SessionGoalStack;
  } catch {
    return createEmptyStack(sessionId);
  }
}

/**
 * Save goal stack to session directory.
 */
export function saveGoalStack(stack: SessionGoalStack): void {
  ensureSessionDir(stack.session_id);
  const stackPath = getGoalStackPath(stack.session_id);
  stack.lastModified = new Date().toISOString();
  fs.writeFileSync(stackPath, JSON.stringify(stack, null, 2) + '\n', 'utf-8');
}

// ============================================================================
// Stack Operations
// ============================================================================

/**
 * Push a goal onto the stack (becomes current focus).
 */
export function pushGoal(sessionId: string, goal: GoalLevel): void {
  const stack = loadGoalStack(sessionId);

  // Prevent duplicates - don't push if same ID already on stack
  const existing = stack.stack.find((g) => g.id === goal.id);
  if (existing) {
    return;
  }

  // Push to front (index 0 = current focus)
  stack.stack.unshift(goal);
  saveGoalStack(stack);
}

/**
 * Pop the current focus goal from the stack.
 * Records in history with completion status.
 */
export function popGoal(
  sessionId: string,
  completedSuccessfully: boolean,
  poppedBy: string = 'TaskUpdate'
): GoalLevel | null {
  const stack = loadGoalStack(sessionId);

  if (stack.stack.length === 0) {
    return null;
  }

  // Remove from front
  const popped = stack.stack.shift();
  if (!popped) return null;

  // Record in history
  stack.history.push({
    goal: popped,
    poppedAt: new Date().toISOString(),
    poppedBy,
    completedSuccessfully,
  });

  // Keep history bounded (last 20 entries)
  if (stack.history.length > 20) {
    stack.history = stack.history.slice(-20);
  }

  saveGoalStack(stack);
  return popped;
}

/**
 * Pop a specific goal by ID (if it's the current focus).
 * Returns null if the goal is not the current focus.
 */
export function popGoalById(
  sessionId: string,
  goalId: string,
  completedSuccessfully: boolean,
  poppedBy: string = 'TaskUpdate'
): GoalLevel | null {
  const stack = loadGoalStack(sessionId);

  if (stack.stack.length === 0 || stack.stack[0]?.id !== goalId) {
    return null;
  }

  return popGoal(sessionId, completedSuccessfully, poppedBy);
}

/**
 * Get the current focus goal (top of stack).
 */
export function getCurrentGoal(sessionId: string): GoalLevel | null {
  const stack = loadGoalStack(sessionId);
  return stack.stack[0] ?? null;
}

/**
 * Get the full goal hierarchy.
 */
export function getGoalHierarchy(sessionId: string): GoalLevel[] {
  const stack = loadGoalStack(sessionId);
  // Return in display order: epic first, subtask last
  return [...stack.stack].reverse();
}

// ============================================================================
// Global Override Detection
// ============================================================================

/**
 * Check if global active-goal.json has an explicit goal set.
 */
export function hasGlobalOverride(): boolean {
  const globalPath = path.join(getClaudeDir(), 'ledger', 'active-goal.json');
  try {
    const raw = fs.readFileSync(globalPath, 'utf-8');
    const data = JSON.parse(raw);
    return Boolean(data.goal) || Boolean(data.summary);
  } catch {
    return false;
  }
}

/**
 * Load the global override goal if present.
 */
export function loadGlobalOverride(): GoalLevel | null {
  const globalPath = path.join(getClaudeDir(), 'ledger', 'active-goal.json');
  try {
    const raw = fs.readFileSync(globalPath, 'utf-8');
    const data = JSON.parse(raw);
    if (!data.goal && !data.summary) {
      return null;
    }
    return {
      id: 'global-override',
      type: 'epic',
      summary: data.summary ?? data.goal,
      fields: {
        who: data.fields?.who ?? 'unknown',
        what: data.fields?.what ?? 'unknown',
        when: data.fields?.when ?? 'unknown',
        where: data.fields?.where ?? 'unknown',
        why: data.fields?.why ?? 'unknown',
        how: data.fields?.how ?? 'unknown',
      },
      source: { manual: true },
      pushedAt: data.updatedAt ?? new Date().toISOString(),
      pushedBy: 'Manual',
    };
  } catch {
    return null;
  }
}

// ============================================================================
// Goal Display Formatting
// ============================================================================

const TYPE_LABELS: Record<GoalType, string> = {
  epic: 'EPIC',
  issue: 'ISSUE',
  task: 'TASK',
  subtask: 'SUBTASK',
};

/**
 * Format the goal hierarchy for display in additionalContext.
 */
export function formatGoalHierarchy(sessionId: string): string {
  const stack = loadGoalStack(sessionId);
  const globalOverride = loadGlobalOverride();

  // Build hierarchy (epic at top, subtask at bottom)
  const hierarchy = [...stack.stack].reverse();

  // If global override exists and not already in hierarchy, prepend it
  if (globalOverride && !hierarchy.some((g) => g.id === 'global-override')) {
    hierarchy.unshift(globalOverride);
  }

  if (hierarchy.length === 0) {
    return 'NO ACTIVE GOAL SET. Define one before proceeding with work.';
  }

  const lines: string[] = ['ACTIVE GOAL HIERARCHY:'];

  // Render hierarchy with tree structure
  for (let i = 0; i < hierarchy.length; i++) {
    const goal = hierarchy[i];
    if (!goal) continue;

    const indent = '  '.repeat(i);
    const prefix = i === 0 ? '' : '\\--';
    const issueRef = goal.source.github_issue ? ` #${goal.source.github_issue}` : '';
    const focusMarker = i === hierarchy.length - 1 ? ' <- CURRENT FOCUS' : '';

    lines.push(
      `${indent}${prefix}[${TYPE_LABELS[goal.type]}${issueRef}] ${goal.summary}${focusMarker}`
    );
  }

  // Add 5W1H fields for current focus
  const focus = hierarchy[hierarchy.length - 1];
  if (focus) {
    lines.push('');
    lines.push(`FOCUS: ${focus.summary}`);
    lines.push(`  WHO: ${focus.fields.who}`);
    lines.push(`  WHAT: ${focus.fields.what}`);
    lines.push(`  WHEN: ${focus.fields.when}`);
    lines.push(`  WHERE: ${focus.fields.where}`);
    lines.push(`  WHY: ${focus.fields.why}`);
    lines.push(`  HOW: ${focus.fields.how}`);
  }

  return lines.join('\n');
}

/**
 * Create default goal fields from a summary.
 */
export function createDefaultFields(summary: string): GoalFields {
  return {
    who: 'Claude Code session',
    what: summary,
    when: 'Current task',
    where: process.cwd(),
    why: 'Task in progress',
    how: 'Following implementation plan',
  };
}

// ============================================================================
// Goal Creation Helpers
// ============================================================================

/**
 * Create a task-level goal from TaskCreate/TaskUpdate data.
 */
export function createTaskGoal(taskId: string, subject: string, description?: string): GoalLevel {
  return {
    id: `task-${taskId}`,
    type: 'task',
    summary: subject,
    fields: description ? extractFieldsFromDescription(description) : createDefaultFields(subject),
    source: { claude_task_id: taskId },
    pushedAt: new Date().toISOString(),
    pushedBy: 'TaskUpdate',
  };
}

/**
 * Create an issue-level goal from GitHub issue data.
 */
export function createIssueGoal(issueNumber: number, title: string, body?: string): GoalLevel {
  return {
    id: `issue-${issueNumber}`,
    type: 'issue',
    summary: title,
    fields: body ? extractFieldsFromDescription(body) : createDefaultFields(title),
    source: { github_issue: issueNumber },
    pushedAt: new Date().toISOString(),
    pushedBy: 'IssueDetection',
  };
}

/**
 * Extract 5W1H fields from a description/body text.
 * Looks for patterns like "WHO: ..." or "**WHO:**" in the text.
 */
export function extractFieldsFromDescription(description: string): GoalFields {
  const fields = createDefaultFields('');

  // Patterns to match field definitions (handles **WHO:** and WHO: formats)
  // Using greedy .+ with explicit boundary to capture full line
  const patterns: Array<[keyof GoalFields, RegExp]> = [
    ['who', /\*{0,2}WHO\*{0,2}:\*{0,2}\s*(.+)$/im],
    ['what', /\*{0,2}WHAT\*{0,2}:\*{0,2}\s*(.+)$/im],
    ['when', /\*{0,2}WHEN\*{0,2}:\*{0,2}\s*(.+)$/im],
    ['where', /\*{0,2}WHERE\*{0,2}:\*{0,2}\s*(.+)$/im],
    ['why', /\*{0,2}WHY\*{0,2}:\*{0,2}\s*(.+)$/im],
    ['how', /\*{0,2}HOW\*{0,2}:\*{0,2}\s*(.+)$/im],
  ];

  for (const [field, pattern] of patterns) {
    const match = description.match(pattern);
    if (match?.[1]) {
      // Strip any remaining markdown formatting and trim whitespace
      fields[field] = match[1].replace(/^\*+\s*|\s*\*+$/g, '').trim();
    }
  }

  // If no WHAT found, use first non-empty line
  if (fields.what === '') {
    const firstLine = description.split('\n').find((l) => l.trim().length > 0);
    if (firstLine) {
      fields.what = firstLine.trim().substring(0, 100);
    }
  }

  return fields;
}
