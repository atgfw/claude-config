/**
 * Checklist Parsers
 *
 * Extract checklist items from various artifact types:
 * - GitHub issue bodies
 * - OpenSpec tasks.md files
 * - Plan .md files
 * - Claude Task tool output
 */
import { createChecklistItem, parseCheckboxStatus } from './checklist_utils.js';
/**
 * Regex to match markdown checkbox items.
 * Captures: [1] checkbox mark, [2] item text
 */
const CHECKBOX_REGEX = /^(?:\s*)[-*]\s*\[([ xX-])\]\s*(.+)$/gm;
/**
 * Parse checklist items from a GitHub issue body.
 * Extracts markdown checkbox items: - [ ] text, - [x] text
 */
export function parseGitHubChecklist(body) {
    const items = [];
    const regex = new RegExp(CHECKBOX_REGEX.source, 'gm');
    let match;
    while ((match = regex.exec(body)) !== null) {
        const checkMark = match[1] ?? ' ';
        const text = match[2]?.trim() ?? '';
        if (text) {
            const status = parseCheckboxStatus(checkMark);
            items.push(createChecklistItem(text, status, 'github_issue'));
        }
    }
    return items;
}
/**
 * Parse checklist items from an OpenSpec tasks.md file.
 * Handles both checkbox format and numbered format:
 * - [ ] 1.1 Task description
 * - [x] 1.2 Another task
 *
 * Also handles section headers (## 1. Section) which are NOT tasks.
 */
export function parseOpenSpecTasks(content) {
    const items = [];
    const lines = content.split('\n');
    for (const line of lines) {
        // Skip section headers (## 1. Section Name)
        if (/^#+\s*\d+\.?\s/.test(line)) {
            continue;
        }
        // Try checkbox format first
        const checkboxMatch = /^(?:\s*)[-*]\s*\[([ xX-])\]\s*(.+)$/.exec(line);
        if (checkboxMatch) {
            const checkMark = checkboxMatch[1] ?? ' ';
            const text = checkboxMatch[2]?.trim() ?? '';
            if (text) {
                const status = parseCheckboxStatus(checkMark);
                items.push(createChecklistItem(text, status, 'openspec'));
            }
        }
    }
    return items;
}
/**
 * Parse checklist items from a plan .md file.
 * Handles both checkbox and numbered list formats.
 */
export function parsePlanChecklist(content) {
    const items = [];
    const lines = content.split('\n');
    for (const line of lines) {
        // Skip headers
        if (/^#+\s/.test(line)) {
            continue;
        }
        // Checkbox format: - [ ] text
        const checkboxMatch = /^(?:\s*)[-*]\s*\[([ xX-])\]\s*(.+)$/.exec(line);
        if (checkboxMatch) {
            const checkMark = checkboxMatch[1] ?? ' ';
            const text = checkboxMatch[2]?.trim() ?? '';
            if (text) {
                const status = parseCheckboxStatus(checkMark);
                items.push(createChecklistItem(text, status, 'plan'));
            }
            continue;
        }
        // Numbered format: 1. text (treat as pending unless marked)
        const numberedMatch = /^(?:\s*)(\d+)\.\s+(.+)$/.exec(line);
        if (numberedMatch) {
            const text = numberedMatch[2]?.trim() ?? '';
            if (text && !text.startsWith('[')) {
                // Don't double-capture checkbox items
                items.push(createChecklistItem(text, 'pending', 'plan'));
            }
        }
    }
    return items;
}
/**
 * Parse checklist items from Claude TaskList output.
 * Maps Claude task statuses to checklist item statuses.
 */
export function parseClaudeTasks(tasks) {
    return tasks.map((task) => {
        const item = createChecklistItem(task.subject, task.status, 'claude_task');
        // Override ID to use Claude's task ID for linking
        return {
            ...item,
            id: `claude-${task.id}`,
        };
    });
}
/**
 * Render checklist items back to GitHub markdown format.
 */
export function renderToGitHubChecklist(items) {
    return items
        .map((item) => {
        const mark = item.status === 'completed' ? 'x' : item.status === 'in_progress' ? '-' : ' ';
        return `- [${mark}] ${item.text}`;
    })
        .join('\n');
}
/**
 * Render checklist items to OpenSpec tasks.md format.
 * Preserves numbered task format if text starts with a number.
 */
export function renderToOpenSpecTasks(items) {
    return items
        .map((item) => {
        const mark = item.status === 'completed' ? 'x' : item.status === 'in_progress' ? '-' : ' ';
        return `- [${mark}] ${item.text}`;
    })
        .join('\n');
}
/**
 * Render checklist items to plan markdown format.
 */
export function renderToPlanChecklist(items) {
    return items
        .map((item) => {
        const mark = item.status === 'completed' ? 'x' : item.status === 'in_progress' ? '-' : ' ';
        return `- [${mark}] ${item.text}`;
    })
        .join('\n');
}
/**
 * Extract the checklist section from a GitHub issue body.
 * Returns the section between "## Acceptance Criteria" (or similar) and the next section.
 */
export function extractChecklistSection(body) {
    // Common checklist section headers
    const sectionHeaders = [/^## (?:Acceptance Criteria|Tasks|Checklist|TODO|To Do)/im];
    let checklistStart = -1;
    let checklistEnd = body.length;
    // Find checklist section start
    for (const pattern of sectionHeaders) {
        const match = pattern.exec(body);
        if (match && match.index !== undefined) {
            checklistStart = match.index + match[0].length;
            break;
        }
    }
    // If no section header, look for first checkbox
    if (checklistStart === -1) {
        const firstCheckbox = /^[-*]\s*\[[ xX-]\]/m.exec(body);
        if (firstCheckbox && firstCheckbox.index !== undefined) {
            checklistStart = firstCheckbox.index;
        }
    }
    if (checklistStart === -1) {
        return { before: body, checklist: '', after: '' };
    }
    // Find next section header after checklist
    const afterChecklist = body.slice(checklistStart);
    const nextSection = /^## /m.exec(afterChecklist);
    if (nextSection && nextSection.index !== undefined && nextSection.index > 0) {
        checklistEnd = checklistStart + nextSection.index;
    }
    return {
        before: body.slice(0, checklistStart),
        checklist: body.slice(checklistStart, checklistEnd).trim(),
        after: body.slice(checklistEnd),
    };
}
/**
 * Replace the checklist section in a GitHub issue body with updated items.
 */
export function replaceChecklistSection(body, newChecklist) {
    const { before, after } = extractChecklistSection(body);
    return `${before}\n${newChecklist}\n${after}`.trim();
}
//# sourceMappingURL=checklist_parsers.js.map