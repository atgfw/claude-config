/**
 * Task Source Sync
 * Bidirectional sync between GitHub issues and local state.
 */
export type ChecklistItemStatus = 'pending' | 'in_progress' | 'completed';
export type ChecklistModifiedBy = 'claude_task' | 'github_issue' | 'openspec' | 'plan';
export type SyncSourceType = 'github_issue' | 'claude_task' | 'openspec' | 'plan';
/**
 * A single checklist item tracked across all artifact types.
 * Text is stored VERBATIM - no normalization except for ID generation.
 */
export interface ChecklistItem {
    /** Stable ID based on hash of normalized text */
    id: string;
    /** Verbatim task text (e.g., "1.1 Add checklist_items field") */
    text: string;
    /** Current status */
    status: ChecklistItemStatus;
    /** ISO timestamp of last modification */
    last_modified: string;
    /** Which artifact type last modified this item */
    modified_by: ChecklistModifiedBy;
}
/**
 * Tracks the sync state of a specific artifact type.
 */
export interface SyncSource {
    /** Artifact type */
    type: SyncSourceType;
    /** Artifact identifier (issue number, file path, task ID) */
    artifact_id: string;
    /** ISO timestamp of last read */
    last_read: string;
    /** Hash of content at last read (for drift detection) */
    content_hash: string;
}
export interface SyncEntry {
    unified_id: string;
    github_issue: number | null;
    claude_task_id: string | null;
    openspec_change_id: string | null;
    plan_step: number | null;
    goal_summary: string | null;
    status: 'open' | 'closed';
    last_synced: string;
    sync_hash: string;
    /** Path to linked plan file (e.g., "~/.claude/plans/my-plan.md") */
    plan_file: string | null;
    /** Verbatim checklist items tracked across all artifacts */
    checklist_items: ChecklistItem[];
    /** Hash of checklist_items for quick drift detection */
    checklist_hash: string;
    /** Per-artifact sync state for drift detection */
    sync_sources: SyncSource[];
}
export interface SyncRegistry {
    version: number;
    entries: SyncEntry[];
}
export declare function loadRegistry(): SyncRegistry;
export declare function saveRegistry(registry: SyncRegistry): void;
export declare function findEntry(registry: SyncRegistry, query: Partial<SyncEntry>): SyncEntry | undefined;
export declare function upsertEntry(registry: SyncRegistry, entry: Partial<SyncEntry> & {
    github_issue: number;
}): SyncRegistry;
export declare function syncFromGitHub(): {
    created: number;
    updated: number;
    closed: number;
};
export declare function onTaskComplete(taskId: string): void;
export declare function linkTask(githubIssue: number, claudeTaskId: string): void;
export declare function linkOpenSpec(githubIssue: number, changeId: string): void;
export declare function _resetSyncFlag(): void;
export declare function _setSyncFlag(): void;
//# sourceMappingURL=task_source_sync.d.ts.map