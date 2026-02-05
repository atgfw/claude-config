/**
 * Session-Scoped Goal Stack Management
 *
 * Provides session-isolated goal state with hierarchical tracking.
 * Goals auto-populate from TaskUpdate operations and GitHub issue context.
 *
 * Storage: ~/.claude/sessions/{session_id}/goal-stack.json
 */
import type { HookInput } from '../types.js';
export type GoalType = 'epic' | 'issue' | 'task' | 'subtask';
export type GoalPushedBy = 'TaskUpdate' | 'IssueDetection' | 'Manual' | 'SessionStart';
/**
 * Task Specification v1.0 - 11 Section Schema
 * All fields are required for compliance.
 */
export interface GoalFields {
    who: string;
    what: string;
    when: string;
    where: string;
    why: string;
    how: string;
    which: string;
    lest: string;
    with: string;
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
    stack: GoalLevel[];
    history: GoalHistoryEntry[];
    lastModified: string;
}
/**
 * Resolve session ID from hook input, environment, or process context.
 *
 * Priority:
 * 1. input.session_id (from Claude Code)
 * 2. CLAUDE_SESSION_ID environment variable
 * 3. Hash of process.ppid + working directory
 */
export declare function getSessionId(input?: HookInput): string;
/**
 * Set the session ID in environment for subsequent hook calls.
 */
export declare function setSessionIdEnv(sessionId: string): void;
/**
 * Get the path to a session's directory.
 */
export declare function getSessionDir(sessionId: string): string;
/**
 * Get the path to a session's goal stack file.
 */
export declare function getGoalStackPath(sessionId: string): string;
/**
 * Ensure session directory exists.
 */
export declare function ensureSessionDir(sessionId: string): void;
/**
 * Create an empty goal stack for a session.
 */
export declare function createEmptyStack(sessionId: string, workingDirectory?: string): SessionGoalStack;
/**
 * Load goal stack from session directory.
 * Returns empty stack if not found.
 * Detects and updates working_directory if it has drifted from current cwd.
 */
export declare function loadGoalStack(sessionId: string): SessionGoalStack;
/**
 * Save goal stack to session directory.
 */
export declare function saveGoalStack(stack: SessionGoalStack): void;
/**
 * Push a goal onto the stack (becomes current focus).
 * Only syncs issue/epic goals to active-goal.json (not ephemeral task goals).
 */
export declare function pushGoal(sessionId: string, goal: GoalLevel): void;
/**
 * Pop the current focus goal from the stack.
 * Records in history with completion status.
 * Syncs active-goal.json to new focus or clears if empty.
 */
export declare function popGoal(sessionId: string, completedSuccessfully: boolean, poppedBy?: string): GoalLevel | null;
/**
 * Pop a specific goal by ID (if it's the current focus).
 * Returns null if the goal is not the current focus.
 */
export declare function popGoalById(sessionId: string, goalId: string, completedSuccessfully: boolean, poppedBy?: string): GoalLevel | null;
/**
 * Get the current focus goal (top of stack).
 */
export declare function getCurrentGoal(sessionId: string): GoalLevel | null;
/**
 * Get the full goal hierarchy.
 */
export declare function getGoalHierarchy(sessionId: string): GoalLevel[];
/**
 * Check if global active-goal.json has an explicit goal set.
 */
export declare function hasGlobalOverride(): boolean;
/**
 * Load the global override goal if present.
 */
export declare function loadGlobalOverride(): GoalLevel | null;
/**
 * Format the goal hierarchy for display in additionalContext.
 * Now project-scoped: only shows goals relevant to current working directory.
 */
export declare function formatGoalHierarchy(sessionId: string): string;
/**
 * Create default goal fields from a summary.
 * Task Specification v1.0 - All 11 sections initialized.
 */
export declare function createDefaultFields(summary: string): GoalFields;
/**
 * Create a task-level goal from TaskCreate/TaskUpdate data.
 */
export declare function createTaskGoal(taskId: string, subject: string, description?: string): GoalLevel;
/**
 * Create an issue-level goal from GitHub issue data.
 */
export declare function createIssueGoal(issueNumber: number, title: string, body?: string): GoalLevel;
/**
 * Extract Task Specification v1.0 fields from a description/body text.
 * Looks for patterns like "WHO: ..." or "**WHO:**" in the text.
 * Supports all 11 sections.
 */
export declare function extractFieldsFromDescription(description: string): GoalFields;
/**
 * Clean up stale session directories.
 * Archives sessions older than maxAgeDays to sessions/old/.
 * Returns the number of sessions archived.
 *
 * @param maxAgeDays - Maximum age in days before archiving (default: 7)
 */
export declare function cleanupStaleSessions(maxAgeDays?: number): number;
/**
 * Check if session cleanup should run (throttled to once per day).
 * Uses a flag file to track last cleanup time.
 */
export declare function shouldRunSessionCleanup(): boolean;
/**
 * Mark session cleanup as completed.
 */
export declare function markSessionCleanupComplete(): void;
//# sourceMappingURL=goal_stack.d.ts.map