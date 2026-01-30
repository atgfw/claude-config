/**
 * Issue Kanban Board
 * Builds a kanban-style table from GitHub issues, grouped by lifecycle label
 * and sorted by priority within each column.
 */
import { execSync } from 'node:child_process';
import { logTerse, logWarn } from '../utils.js';
import { syncFromGitHub } from './task_source_sync.js';
const LIFECYCLE_COLUMNS = [
    'triage',
    'specced',
    'in-progress',
    'blocked',
    'needs-review',
    'done',
];
const PRIORITY_ORDER = {
    'priority/p0-critical': 0,
    'priority/p1-high': 1,
    'priority/p2-medium': 2,
    'priority/p3-low': 3,
};
// ---------------------------------------------------------------------------
// Label parsing
// ---------------------------------------------------------------------------
export function extractLifecycle(labels, state) {
    if (state !== 'OPEN')
        return 'done';
    for (const label of labels) {
        const name = label.name;
        if (name === 'lifecycle/triage')
            return 'triage';
        if (name === 'lifecycle/specced')
            return 'specced';
        if (name === 'lifecycle/in-progress')
            return 'in-progress';
        if (name === 'lifecycle/blocked')
            return 'blocked';
        if (name === 'lifecycle/needs-review')
            return 'needs-review';
    }
    // Open issues without a lifecycle label default to triage
    return 'triage';
}
export function extractPriority(labels) {
    for (const label of labels) {
        if (label.name in PRIORITY_ORDER) {
            return label.name.replace('priority/', '');
        }
    }
    return '--';
}
export function priorityRank(labels) {
    for (const label of labels) {
        const rank = PRIORITY_ORDER[label.name];
        if (rank !== undefined) {
            return rank;
        }
    }
    return 99; // unlabeled last
}
export function buildRows(issues) {
    return issues
        .map((issue) => ({
        number: issue.number,
        title: issue.title.length > 50 ? issue.title.slice(0, 47) + '...' : issue.title,
        priority: extractPriority(issue.labels),
        column: extractLifecycle(issue.labels, issue.state),
        rank: priorityRank(issue.labels),
    }))
        .sort((a, b) => a.rank - b.rank);
}
export function renderKanban(rows) {
    if (rows.length === 0)
        return 'No issues found.';
    // Group by column
    const grouped = {
        triage: [],
        specced: [],
        'in-progress': [],
        blocked: [],
        'needs-review': [],
        done: [],
    };
    for (const row of rows) {
        grouped[row.column].push(row);
    }
    // Build compact table - only show columns that have issues
    const activeColumns = LIFECYCLE_COLUMNS.filter((col) => grouped[col].length > 0);
    if (activeColumns.length === 0)
        return 'No issues found.';
    const lines = ['## Issue Board'];
    // Column header labels
    const colLabels = {
        triage: 'Triage',
        specced: 'Specced',
        'in-progress': 'In Prog',
        blocked: 'Blocked',
        'needs-review': 'Review',
        done: 'Done',
    };
    // Render as grouped sections (more compact than a wide table)
    for (const col of activeColumns) {
        const issues = grouped[col];
        lines.push(`### ${colLabels[col]} (${issues.length})`);
        lines.push('| # | Title | Pri |');
        lines.push('|---|-------|-----|');
        for (const row of issues) {
            lines.push(`| ${row.number} | ${row.title} | ${row.priority} |`);
        }
    }
    return lines.join('\n');
}
// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------
export function buildKanbanContext() {
    try {
        // Sync registry first (non-blocking on failure)
        try {
            syncFromGitHub();
        }
        catch {
            // Registry sync is secondary
        }
        const raw = execSync('gh issue list --state all --json number,title,state,labels --limit 100', {
            encoding: 'utf-8',
            timeout: 15_000,
        });
        const issues = JSON.parse(raw);
        const rows = buildRows(issues);
        const kanban = renderKanban(rows);
        const openCount = rows.filter((r) => r.column !== 'done').length;
        logTerse(`[+] Kanban: ${openCount} open, ${rows.length - openCount} done`);
        return kanban;
    }
    catch (error) {
        const msg = error instanceof Error ? error.message : 'Unknown error';
        logWarn(`Kanban build failed: ${msg}`);
        return '';
    }
}
//# sourceMappingURL=issue_kanban.js.map