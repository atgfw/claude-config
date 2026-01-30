/**
 * Task Source Sync
 * Bidirectional sync between GitHub issues and local state.
 */
export interface SyncEntry {
    unified_id: string;
    github_issue: number | null;
    claude_task_id: string | null;
    openspec_change_id: string | null;
    plan_step: number | null;
    status: 'open' | 'closed';
    last_synced: string;
    sync_hash: string;
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