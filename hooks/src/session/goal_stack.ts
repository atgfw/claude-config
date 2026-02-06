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
import { getClaudeDir, isPathMatch } from '../utils.js';
import type { HookInput } from '../types.js';

// ============================================================================
// Types
// ============================================================================

export type GoalType = 'epic' | 'issue' | 'task' | 'subtask';
export type GoalPushedBy = 'TaskUpdate' | 'IssueDetection' | 'Manual' | 'SessionStart';

/**
 * Task Specification v1.0 - 11 Section Schema
 * All fields are required for compliance.
 */
export interface GoalFields {
  // §2 WHO - Stakeholder Matrix
  who: string;
  // §3 WHAT - Declarative Outcome Specification
  what: string;
  // §4 WHEN - Temporal & Conditional Constraints
  when: string;
  // §5 WHERE - Artifact Location Registry
  where: string;
  // §6 WHY - Purpose & Value Alignment
  why: string;
  // §7 HOW - Implementation Reference
  how: string;
  // §8 WHICH - Target Object Specification
  which: string;
  // §9 LEST - Failure Modes & Preventive Constraints
  lest: string;
  // §10 WITH - Resources, Tools & Dependencies
  with: string;
  // §11 MEASURED BY - Success Metrics & Observability
  measuredBy: string;
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
 * Detects and updates working_directory if it has drifted from current cwd.
 */
export function loadGoalStack(sessionId: string): SessionGoalStack {
  const stackPath = getGoalStackPath(sessionId);
  try {
    const raw = fs.readFileSync(stackPath, 'utf-8');
    const stack = JSON.parse(raw) as SessionGoalStack;

    // Detect working directory drift - update if cwd has changed
    const currentCwd = process.cwd();
    if (stack.working_directory !== currentCwd) {
      stack.working_directory = currentCwd;
      // Save immediately to persist the update
      saveGoalStack(stack);
    }

    return stack;
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
 * Only syncs issue/epic goals to active-goal.json (not ephemeral task goals).
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

  // Only sync issue/epic goals to active-goal.json (not task goals)
  // Task goals are ephemeral session work; issue goals are the primary context
  if (goal.type === 'issue' || goal.type === 'epic') {
    syncGoalToActiveGoalJson(goal, stack.working_directory);
  }
}

/**
 * Sync the current focus goal to active-goal.json.
 * This maintains backward compatibility with CLAUDE.md's requirement
 * that "EVERY response MUST end with the active goal from active-goal.json".
 *
 * IMPORTANT: Includes project scope tracking to prevent cross-session bleeding.
 * The `fields.where` field is used to track which project owns this goal.
 */
function syncGoalToActiveGoalJson(goal: GoalLevel, workingDir?: string): void {
  const activeGoalPath = path.join(getClaudeDir(), 'ledger', 'active-goal.json');

  try {
    // Load existing to preserve history
    let existing: {
      goal: string | null;
      fields: GoalFields | null;
      summary: string | null;
      updatedAt: string;
      sessionId?: string;
      projectScope?: string;
      linkedArtifacts: {
        openspec: string | null;
        plan_files: string[];
        github_issues: number[];
      };
      history: Array<{ summary: string; clearedAt: string }>;
    } = {
      goal: null,
      fields: null,
      summary: null,
      updatedAt: new Date().toISOString(),
      linkedArtifacts: {
        openspec: null,
        plan_files: [],
        github_issues: [],
      },
      history: [],
    };

    try {
      const raw = fs.readFileSync(activeGoalPath, 'utf-8');
      existing = JSON.parse(raw);
    } catch {
      // File doesn't exist or is invalid - use default
    }

    // Update with current goal
    existing.goal = goal.summary;
    existing.summary = goal.summary;
    existing.fields = goal.fields;
    existing.updatedAt = new Date().toISOString();

    // Track project scope for session isolation
    // Only update projectScope if:
    // 1. Not already set, OR
    // 2. Current session's cwd is within the existing projectScope (same project)
    // This prevents race conditions when two sessions work on the same issue from different projects
    const currentProjectScope = existing.projectScope;
    const goalProjectDir = goal.fields.where !== 'unknown' ? goal.fields.where : null;

    if (!currentProjectScope || isPathMatch(process.cwd(), currentProjectScope)) {
      existing.projectScope = goalProjectDir ?? process.cwd();
    }
    // If projectScope is set and doesn't match current cwd, do NOT overwrite

    // Track linked GitHub issue if present
    if (goal.source.github_issue) {
      if (!existing.linkedArtifacts) {
        existing.linkedArtifacts = { openspec: null, plan_files: [], github_issues: [] };
      }
      if (!existing.linkedArtifacts.github_issues) {
        existing.linkedArtifacts.github_issues = [];
      }
      if (!existing.linkedArtifacts.github_issues.includes(goal.source.github_issue)) {
        existing.linkedArtifacts.github_issues.push(goal.source.github_issue);
      }
    }

    // Track linked OpenSpec if present
    if (goal.source.openspec_change) {
      if (!existing.linkedArtifacts) {
        existing.linkedArtifacts = { openspec: null, plan_files: [], github_issues: [] };
      }
      existing.linkedArtifacts.openspec = goal.source.openspec_change;
    }

    fs.writeFileSync(activeGoalPath, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
  } catch {
    // Non-fatal - session stack is primary, active-goal.json is secondary
  }
}

/**
 * Pop the current focus goal from the stack.
 * Records in history with completion status.
 * Syncs active-goal.json to new focus or clears if empty.
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

  // Sync active-goal.json to new focus (only issue/epic) or clear if empty
  const newFocus = stack.stack[0];
  if (newFocus && (newFocus.type === 'issue' || newFocus.type === 'epic')) {
    syncGoalToActiveGoalJson(newFocus);
  } else if (!newFocus && (popped.type === 'issue' || popped.type === 'epic')) {
    // Only clear if we popped an issue/epic (not a task)
    clearActiveGoalJson(popped.summary);
  }

  return popped;
}

/**
 * Clear active-goal.json when goal stack becomes empty.
 * Preserves history for continuity.
 */
function clearActiveGoalJson(lastSummary: string): void {
  const activeGoalPath = path.join(getClaudeDir(), 'ledger', 'active-goal.json');

  try {
    let existing: {
      goal: string | null;
      fields: GoalFields | null;
      summary: string | null;
      updatedAt: string;
      linkedArtifacts: {
        openspec: string | null;
        plan_files: string[];
        github_issues: number[];
      };
      history: Array<{ summary: string; clearedAt: string }>;
    } = {
      goal: null,
      fields: null,
      summary: null,
      updatedAt: new Date().toISOString(),
      linkedArtifacts: { openspec: null, plan_files: [], github_issues: [] },
      history: [],
    };

    try {
      const raw = fs.readFileSync(activeGoalPath, 'utf-8');
      existing = JSON.parse(raw);
    } catch {
      // File doesn't exist - use default
    }

    // Add to history before clearing
    if (!existing.history) {
      existing.history = [];
    }
    existing.history.push({
      summary: lastSummary,
      clearedAt: new Date().toISOString(),
    });

    // Keep history bounded
    if (existing.history.length > 10) {
      existing.history = existing.history.slice(-10);
    }

    // Clear current goal
    existing.goal = null;
    existing.summary = null;
    existing.fields = null;
    existing.updatedAt = new Date().toISOString();

    fs.writeFileSync(activeGoalPath, JSON.stringify(existing, null, 2) + '\n', 'utf-8');
  } catch {
    // Non-fatal
  }
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
        which: data.fields?.which ?? 'Target object not specified',
        lest: data.fields?.lest ?? 'Failure modes not defined',
        with: data.fields?.with ?? 'Dependencies not enumerated',
        measuredBy: data.fields?.measuredBy ?? 'Success metrics not defined',
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
 * Now project-scoped: only shows goals relevant to current working directory.
 */
export function formatGoalHierarchy(sessionId: string): string {
  const stack = loadGoalStack(sessionId);

  // Build hierarchy (epic at top, subtask at bottom)
  const hierarchy = [...stack.stack].reverse();

  // IMPORTANT: Do NOT include global override by default anymore.
  // Global goals should only apply to the specific project they were set for.
  // Session-scoped goals take full precedence.

  if (hierarchy.length === 0) {
    return 'NO ACTIVE GOAL SET. Define a session goal using TaskCreate or set focus with "set goal: <description>"';
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

  // Add Task Specification v1.0 fields for current focus (all 11 sections)
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
    lines.push(`  WHICH: ${focus.fields.which}`);
    lines.push(`  LEST: ${focus.fields.lest}`);
    lines.push(`  WITH: ${focus.fields.with}`);
    lines.push(`  MEASURED BY: ${focus.fields.measuredBy}`);
  }

  return lines.join('\n');
}

/**
 * Create default goal fields from a summary.
 * Task Specification v1.0 - All 11 sections initialized.
 */
export function createDefaultFields(summary: string): GoalFields {
  return {
    who: 'Claude Code session',
    what: summary,
    when: 'Current task',
    where: process.cwd(),
    why: 'Task in progress',
    how: 'Following implementation plan',
    which: 'Target object not specified',
    lest: 'Failure modes not defined',
    with: 'Dependencies not enumerated',
    measuredBy: 'Success metrics not defined',
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
 * Extract Task Specification v1.0 fields from a description/body text.
 * Looks for patterns like "WHO: ..." or "**WHO:**" in the text.
 * Supports all 11 sections.
 */
export function extractFieldsFromDescription(description: string): GoalFields {
  const fields = createDefaultFields('');

  // Patterns to match field definitions (handles **WHO:** and WHO: formats)
  // Using greedy .+ with explicit boundary to capture full line
  // Task Specification v1.0 - All 11 sections
  const patterns: Array<[keyof GoalFields, RegExp]> = [
    ['who', /\*{0,2}WHO\*{0,2}:\*{0,2}\s*(.+)$/im],
    ['what', /\*{0,2}WHAT\*{0,2}:\*{0,2}\s*(.+)$/im],
    ['when', /\*{0,2}WHEN\*{0,2}:\*{0,2}\s*(.+)$/im],
    ['where', /\*{0,2}WHERE\*{0,2}:\*{0,2}\s*(.+)$/im],
    ['why', /\*{0,2}WHY\*{0,2}:\*{0,2}\s*(.+)$/im],
    ['how', /\*{0,2}HOW\*{0,2}:\*{0,2}\s*(.+)$/im],
    ['which', /\*{0,2}WHICH\*{0,2}:\*{0,2}\s*(.+)$/im],
    ['lest', /\*{0,2}LEST\*{0,2}:\*{0,2}\s*(.+)$/im],
    ['with', /\*{0,2}WITH\*{0,2}:\*{0,2}\s*(.+)$/im],
    ['measuredBy', /\*{0,2}MEASURED\s*BY\*{0,2}:\*{0,2}\s*(.+)$/im],
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

// ============================================================================
// Session Cleanup
// ============================================================================

/**
 * Clean up stale session directories.
 * Archives sessions older than maxAgeDays to sessions/old/.
 * Returns the number of sessions archived.
 *
 * @param maxAgeDays - Maximum age in days before archiving (default: 7)
 */
export function cleanupStaleSessions(maxAgeDays: number = 7): number {
  const sessionsDir = path.join(getClaudeDir(), 'sessions');
  if (!fs.existsSync(sessionsDir)) {
    return 0;
  }

  const now = Date.now();
  const maxAgeMs = maxAgeDays * 24 * 60 * 60 * 1000;
  const oldDir = path.join(sessionsDir, 'old');
  let archived = 0;

  try {
    const entries = fs.readdirSync(sessionsDir, { withFileTypes: true });

    for (const entry of entries) {
      // Skip non-directories and the 'old' directory itself
      if (!entry.isDirectory() || entry.name === 'old') {
        continue;
      }

      const sessionDir = path.join(sessionsDir, entry.name);
      const stackPath = path.join(sessionDir, 'goal-stack.json');

      // Check modification time (prefer goal-stack.json if exists, else directory)
      const stat = fs.existsSync(stackPath) ? fs.statSync(stackPath) : fs.statSync(sessionDir);

      if (now - stat.mtimeMs > maxAgeMs) {
        // Archive to old/ directory
        fs.mkdirSync(oldDir, { recursive: true });
        const archivePath = path.join(oldDir, entry.name);

        // Handle collision by adding timestamp
        const finalPath = fs.existsSync(archivePath) ? `${archivePath}-${Date.now()}` : archivePath;

        fs.renameSync(sessionDir, finalPath);
        archived++;
      }
    }
  } catch {
    // Non-fatal - cleanup is best-effort
  }

  return archived;
}

/**
 * Check if session cleanup should run (throttled to once per day).
 * Uses a flag file to track last cleanup time.
 */
export function shouldRunSessionCleanup(): boolean {
  const flagPath = path.join(getClaudeDir(), '.session-cleanup-last');

  if (!fs.existsSync(flagPath)) {
    return true;
  }

  try {
    const stat = fs.statSync(flagPath);
    const oneDayMs = 24 * 60 * 60 * 1000;
    return Date.now() - stat.mtimeMs > oneDayMs;
  } catch {
    return true;
  }
}

/**
 * Mark session cleanup as completed.
 */
export function markSessionCleanupComplete(): void {
  const flagPath = path.join(getClaudeDir(), '.session-cleanup-last');
  fs.writeFileSync(flagPath, new Date().toISOString(), 'utf-8');
}
