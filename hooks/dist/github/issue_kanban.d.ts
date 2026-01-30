/**
 * Issue Kanban Board
 * Builds a kanban-style table from GitHub issues, grouped by lifecycle label
 * and sorted by priority within each column.
 */
interface GhIssue {
    number: number;
    title: string;
    state: string;
    labels: Array<{
        name: string;
    }>;
}
export type LifecycleColumn = 'triage' | 'specced' | 'in-progress' | 'blocked' | 'needs-review' | 'done';
export declare function extractLifecycle(labels: Array<{
    name: string;
}>, state: string): LifecycleColumn;
export declare function extractPriority(labels: Array<{
    name: string;
}>): string;
export declare function priorityRank(labels: Array<{
    name: string;
}>): number;
export interface KanbanRow {
    number: number;
    title: string;
    priority: string;
    column: LifecycleColumn;
    rank: number;
}
export declare function buildRows(issues: GhIssue[]): KanbanRow[];
export declare function renderKanban(rows: KanbanRow[]): string;
export declare function buildKanbanContext(): string;
export {};
//# sourceMappingURL=issue_kanban.d.ts.map