/**
 * Unified Checklist Format Engine
 *
 * Bridges 4 task sources: GitHub Issues, Claude Tasks, OpenSpec changes, and Plan steps.
 * Utility module only - no hook registration.
 */
export interface UnifiedChecklistItem {
    id: string;
    title: string;
    status: 'pending' | 'in_progress' | 'completed' | 'blocked';
    priority: 'p0' | 'p1' | 'p2' | 'p3';
    system: string;
    type: string;
    sources: {
        github_issue: number | null;
        claude_task: string | null;
        openspec_change: string | null;
        plan_step: number | null;
    };
    acceptance_criteria: Array<{
        text: string;
        done: boolean;
    }>;
    created: string;
    updated: string;
}
/**
 * Create a UnifiedChecklistItem with defaults and a generated UUID.
 */
export declare function createItem(opts: Partial<UnifiedChecklistItem> & {
    title: string;
}): UnifiedChecklistItem;
/**
 * Render a checklist item to a GitHub issue body.
 */
export declare function renderToGitHubBody(item: UnifiedChecklistItem): string;
/**
 * Render a checklist item to Claude Code TaskCreate parameters.
 */
export declare function renderToTaskCreate(item: UnifiedChecklistItem): {
    subject: string;
    description: string;
    activeForm: string;
};
/**
 * Render multiple checklist items to a markdown task list.
 */
export declare function renderToTasksMd(items: UnifiedChecklistItem[]): string;
/**
 * Render multiple checklist items to numbered plan steps.
 */
export declare function renderToPlanSteps(items: UnifiedChecklistItem[]): string;
/**
 * Parse a GitHub issue into a UnifiedChecklistItem.
 */
export declare function parseFromGitHubIssue(issue: {
    number: number;
    title: string;
    body: string;
    state: string;
    labels: Array<{
        name: string;
    }>;
}): UnifiedChecklistItem;
/**
 * Parse markdown task list lines into UnifiedChecklistItems.
 */
export declare function parseFromTasksMd(markdown: string): UnifiedChecklistItem[];
//# sourceMappingURL=unified_checklist.d.ts.map