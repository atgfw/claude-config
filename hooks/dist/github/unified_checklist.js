/**
 * Unified Checklist Format Engine
 *
 * Bridges 4 task sources: GitHub Issues, Claude Tasks, OpenSpec changes, and Plan steps.
 * Utility module only - no hook registration.
 */
import * as crypto from 'node:crypto';
/**
 * Create a UnifiedChecklistItem with defaults and a generated UUID.
 */
export function createItem(opts) {
    const now = new Date().toISOString();
    return {
        id: opts.id ?? crypto.randomUUID(),
        title: opts.title,
        status: opts.status ?? 'pending',
        priority: opts.priority ?? 'p2',
        system: opts.system ?? '',
        type: opts.type ?? '',
        sources: {
            github_issue: opts.sources?.github_issue ?? null,
            claude_task: opts.sources?.claude_task ?? null,
            openspec_change: opts.sources?.openspec_change ?? null,
            plan_step: opts.sources?.plan_step ?? null,
        },
        acceptance_criteria: opts.acceptance_criteria ?? [],
        created: opts.created ?? now,
        updated: opts.updated ?? now,
    };
}
/**
 * Render a checklist item to a GitHub issue body.
 */
export function renderToGitHubBody(item) {
    const criteriaLines = item.acceptance_criteria
        .map((c) => `- [${c.done ? 'x' : ' '}] ${c.text}`)
        .join('\n');
    const openspecValue = item.sources.openspec_change ?? 'N/A';
    return [
        '## Problem',
        item.title,
        '',
        '## Solution',
        '<pending implementation>',
        '',
        '## Acceptance Criteria',
        criteriaLines || '_No criteria defined._',
        '',
        '## Source',
        `- Correction ledger: N/A`,
        `- Escalation: N/A`,
        `- OpenSpec: ${openspecValue}`,
    ].join('\n');
}
/**
 * Render a checklist item to Claude Code TaskCreate parameters.
 */
export function renderToTaskCreate(item) {
    const criteriaText = item.acceptance_criteria
        .map((c) => `- [${c.done ? 'x' : ' '}] ${c.text}`)
        .join('\n');
    const description = [
        `Priority: ${item.priority}`,
        `System: ${item.system || 'N/A'}`,
        `Type: ${item.type || 'N/A'}`,
        '',
        'Acceptance Criteria:',
        criteriaText || 'None',
    ].join('\n');
    return {
        subject: item.title,
        description,
        activeForm: item.status === 'in_progress' ? 'active' : 'backlog',
    };
}
/**
 * Render multiple checklist items to a markdown task list.
 */
export function renderToTasksMd(items) {
    return items
        .map((item) => {
        const checked = item.status === 'completed' ? 'x' : ' ';
        return `- [${checked}] ${item.title}`;
    })
        .join('\n');
}
/**
 * Render multiple checklist items to numbered plan steps.
 */
export function renderToPlanSteps(items) {
    return items.map((item, i) => `${i + 1}. ${item.title}`).join('\n');
}
/**
 * Parse a GitHub issue into a UnifiedChecklistItem.
 */
export function parseFromGitHubIssue(issue) {
    // Extract system and type from labels
    let system = '';
    let type = '';
    let priority = 'p2';
    for (const label of issue.labels) {
        const name = label.name.toLowerCase();
        if (name.startsWith('system:')) {
            system = name.slice('system:'.length).trim();
        }
        else if (name.startsWith('type:')) {
            type = name.slice('type:'.length).trim();
        }
        else if (/^p[0-3]$/.test(name)) {
            priority = name;
        }
    }
    // Parse acceptance criteria from body checkboxes
    const criteria = [];
    const body = issue.body || '';
    const checkboxRegex = /^- \[([ xX])\] (.+)$/gm;
    let match;
    while ((match = checkboxRegex.exec(body)) !== null) {
        criteria.push({
            done: match[1] !== ' ',
            text: match[2].trim(),
        });
    }
    // Parse openspec from body
    let openspecChange = null;
    const openspecMatch = body.match(/- OpenSpec:\s*(.+)/);
    if (openspecMatch?.[1] && openspecMatch[1].trim() !== 'N/A') {
        openspecChange = openspecMatch[1].trim();
    }
    // Map GitHub state to status
    let status = 'pending';
    if (issue.state === 'closed') {
        status = 'completed';
    }
    else if (criteria.some((c) => c.done)) {
        status = 'in_progress';
    }
    const now = new Date().toISOString();
    return {
        id: crypto.randomUUID(),
        title: issue.title,
        status,
        priority,
        system,
        type,
        sources: {
            github_issue: issue.number,
            claude_task: null,
            openspec_change: openspecChange,
            plan_step: null,
        },
        acceptance_criteria: criteria,
        created: now,
        updated: now,
    };
}
/**
 * Parse markdown task list lines into UnifiedChecklistItems.
 */
export function parseFromTasksMd(markdown) {
    const items = [];
    const lines = markdown.split('\n');
    const taskRegex = /^- \[([ xX])\] (.+)$/;
    for (const line of lines) {
        const match = taskRegex.exec(line.trim());
        if (match) {
            items.push(createItem({
                title: match[2].trim(),
                status: match[1] !== ' ' ? 'completed' : 'pending',
            }));
        }
    }
    return items;
}
//# sourceMappingURL=unified_checklist.js.map