/**
 * Checklist Parsers
 *
 * Extract checklist items from various artifact types:
 * - GitHub issue bodies
 * - OpenSpec tasks.md files
 * - Plan .md files
 * - Claude Task tool output
 */
import type { ChecklistItem } from '../github/task_source_sync.js';
/**
 * Parse checklist items from a GitHub issue body.
 * Extracts markdown checkbox items: - [ ] text, - [x] text
 */
export declare function parseGitHubChecklist(body: string): ChecklistItem[];
/**
 * Parse checklist items from an OpenSpec tasks.md file.
 * Handles both checkbox format and numbered format:
 * - [ ] 1.1 Task description
 * - [x] 1.2 Another task
 *
 * Also handles section headers (## 1. Section) which are NOT tasks.
 */
export declare function parseOpenSpecTasks(content: string): ChecklistItem[];
/**
 * Parse checklist items from a plan .md file.
 * Handles both checkbox and numbered list formats.
 */
export declare function parsePlanChecklist(content: string): ChecklistItem[];
/**
 * Claude Task interface matching TaskList output
 */
export interface ClaudeTask {
    id: string;
    subject: string;
    status: 'pending' | 'in_progress' | 'completed';
    description?: string;
}
/**
 * Parse checklist items from Claude TaskList output.
 * Maps Claude task statuses to checklist item statuses.
 */
export declare function parseClaudeTasks(tasks: ClaudeTask[]): ChecklistItem[];
/**
 * Render checklist items back to GitHub markdown format.
 */
export declare function renderToGitHubChecklist(items: ChecklistItem[]): string;
/**
 * Render checklist items to OpenSpec tasks.md format.
 * Preserves numbered task format if text starts with a number.
 */
export declare function renderToOpenSpecTasks(items: ChecklistItem[]): string;
/**
 * Render checklist items to plan markdown format.
 */
export declare function renderToPlanChecklist(items: ChecklistItem[]): string;
/**
 * Extract the checklist section from a GitHub issue body.
 * Returns the section between "## Acceptance Criteria" (or similar) and the next section.
 */
export declare function extractChecklistSection(body: string): {
    before: string;
    checklist: string;
    after: string;
};
/**
 * Replace the checklist section in a GitHub issue body with updated items.
 */
export declare function replaceChecklistSection(body: string, newChecklist: string): string;
//# sourceMappingURL=checklist_parsers.d.ts.map