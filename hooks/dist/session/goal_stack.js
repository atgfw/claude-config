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
export function getSessionId(input) {
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
export function setSessionIdEnv(sessionId) {
    process.env['CLAUDE_SESSION_ID'] = sessionId;
}
// ============================================================================
// Session Directory Management
// ============================================================================
/**
 * Get the path to a session's directory.
 */
export function getSessionDir(sessionId) {
    return path.join(getClaudeDir(), 'sessions', sessionId);
}
/**
 * Get the path to a session's goal stack file.
 */
export function getGoalStackPath(sessionId) {
    return path.join(getSessionDir(sessionId), 'goal-stack.json');
}
/**
 * Ensure session directory exists.
 */
export function ensureSessionDir(sessionId) {
    const sessionDir = getSessionDir(sessionId);
    fs.mkdirSync(sessionDir, { recursive: true });
}
// ============================================================================
// Goal Stack CRUD
// ============================================================================
/**
 * Create an empty goal stack for a session.
 */
export function createEmptyStack(sessionId, workingDirectory) {
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
export function loadGoalStack(sessionId) {
    const stackPath = getGoalStackPath(sessionId);
    try {
        const raw = fs.readFileSync(stackPath, 'utf-8');
        return JSON.parse(raw);
    }
    catch {
        return createEmptyStack(sessionId);
    }
}
/**
 * Save goal stack to session directory.
 */
export function saveGoalStack(stack) {
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
export function pushGoal(sessionId, goal) {
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
        syncGoalToActiveGoalJson(goal);
    }
}
/**
 * Sync the current focus goal to active-goal.json.
 * This maintains backward compatibility with CLAUDE.md's requirement
 * that "EVERY response MUST end with the active goal from active-goal.json".
 */
function syncGoalToActiveGoalJson(goal) {
    const activeGoalPath = path.join(getClaudeDir(), 'ledger', 'active-goal.json');
    try {
        // Load existing to preserve history
        let existing = {
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
        }
        catch {
            // File doesn't exist or is invalid - use default
        }
        // Update with current goal
        existing.goal = goal.summary;
        existing.summary = goal.summary;
        existing.fields = goal.fields;
        existing.updatedAt = new Date().toISOString();
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
    }
    catch {
        // Non-fatal - session stack is primary, active-goal.json is secondary
    }
}
/**
 * Pop the current focus goal from the stack.
 * Records in history with completion status.
 * Syncs active-goal.json to new focus or clears if empty.
 */
export function popGoal(sessionId, completedSuccessfully, poppedBy = 'TaskUpdate') {
    const stack = loadGoalStack(sessionId);
    if (stack.stack.length === 0) {
        return null;
    }
    // Remove from front
    const popped = stack.stack.shift();
    if (!popped)
        return null;
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
    }
    else if (!newFocus && (popped.type === 'issue' || popped.type === 'epic')) {
        // Only clear if we popped an issue/epic (not a task)
        clearActiveGoalJson(popped.summary);
    }
    return popped;
}
/**
 * Clear active-goal.json when goal stack becomes empty.
 * Preserves history for continuity.
 */
function clearActiveGoalJson(lastSummary) {
    const activeGoalPath = path.join(getClaudeDir(), 'ledger', 'active-goal.json');
    try {
        let existing = {
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
        }
        catch {
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
    }
    catch {
        // Non-fatal
    }
}
/**
 * Pop a specific goal by ID (if it's the current focus).
 * Returns null if the goal is not the current focus.
 */
export function popGoalById(sessionId, goalId, completedSuccessfully, poppedBy = 'TaskUpdate') {
    const stack = loadGoalStack(sessionId);
    if (stack.stack.length === 0 || stack.stack[0]?.id !== goalId) {
        return null;
    }
    return popGoal(sessionId, completedSuccessfully, poppedBy);
}
/**
 * Get the current focus goal (top of stack).
 */
export function getCurrentGoal(sessionId) {
    const stack = loadGoalStack(sessionId);
    return stack.stack[0] ?? null;
}
/**
 * Get the full goal hierarchy.
 */
export function getGoalHierarchy(sessionId) {
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
export function hasGlobalOverride() {
    const globalPath = path.join(getClaudeDir(), 'ledger', 'active-goal.json');
    try {
        const raw = fs.readFileSync(globalPath, 'utf-8');
        const data = JSON.parse(raw);
        return Boolean(data.goal) || Boolean(data.summary);
    }
    catch {
        return false;
    }
}
/**
 * Load the global override goal if present.
 */
export function loadGlobalOverride() {
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
    }
    catch {
        return null;
    }
}
// ============================================================================
// Goal Display Formatting
// ============================================================================
const TYPE_LABELS = {
    epic: 'EPIC',
    issue: 'ISSUE',
    task: 'TASK',
    subtask: 'SUBTASK',
};
/**
 * Format the goal hierarchy for display in additionalContext.
 * Now project-scoped: only shows goals relevant to current working directory.
 */
export function formatGoalHierarchy(sessionId) {
    const stack = loadGoalStack(sessionId);
    // Build hierarchy (epic at top, subtask at bottom)
    const hierarchy = [...stack.stack].reverse();
    // IMPORTANT: Do NOT include global override by default anymore.
    // Global goals should only apply to the specific project they were set for.
    // Session-scoped goals take full precedence.
    if (hierarchy.length === 0) {
        return 'NO ACTIVE GOAL SET. Define a session goal using TaskCreate or set focus with "set goal: <description>"';
    }
    const lines = ['ACTIVE GOAL HIERARCHY:'];
    // Render hierarchy with tree structure
    for (let i = 0; i < hierarchy.length; i++) {
        const goal = hierarchy[i];
        if (!goal)
            continue;
        const indent = '  '.repeat(i);
        const prefix = i === 0 ? '' : '\\--';
        const issueRef = goal.source.github_issue ? ` #${goal.source.github_issue}` : '';
        const focusMarker = i === hierarchy.length - 1 ? ' <- CURRENT FOCUS' : '';
        lines.push(`${indent}${prefix}[${TYPE_LABELS[goal.type]}${issueRef}] ${goal.summary}${focusMarker}`);
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
export function createDefaultFields(summary) {
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
export function createTaskGoal(taskId, subject, description) {
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
export function createIssueGoal(issueNumber, title, body) {
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
export function extractFieldsFromDescription(description) {
    const fields = createDefaultFields('');
    // Patterns to match field definitions (handles **WHO:** and WHO: formats)
    // Using greedy .+ with explicit boundary to capture full line
    // Task Specification v1.0 - All 11 sections
    const patterns = [
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
//# sourceMappingURL=goal_stack.js.map