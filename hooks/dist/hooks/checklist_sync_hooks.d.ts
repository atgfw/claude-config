/**
 * Checklist Sync Hooks
 *
 * PostToolUse hooks that trigger checklist reconciliation on file operations.
 * - Read triggers: reconcile when tasks.md or plan files are read
 * - Write triggers: reconcile and propagate when files are written
 */
import type { PostToolUseInput, PostToolUseOutput } from '../types.js';
import type { SyncSourceType } from '../github/task_source_sync.js';
declare const OPENSPEC_TASKS_PATTERN: RegExp;
declare const PLAN_FILE_PATTERN: RegExp;
/**
 * Determine artifact type and ID from file path.
 */
declare function parseFilePath(filePath: string): {
    type: SyncSourceType;
    id: string;
} | null;
/**
 * PostToolUse hook for Read operations.
 * Triggers reconciliation when tasks.md or plan files are read.
 */
declare function checklistReadHook(input: PostToolUseInput): Promise<PostToolUseOutput>;
/**
 * PostToolUse hook for Write/Edit operations.
 * Triggers reconciliation and propagation when checklist files are written.
 */
declare function checklistWriteHook(input: PostToolUseInput): Promise<PostToolUseOutput>;
export { checklistReadHook, checklistWriteHook, parseFilePath, OPENSPEC_TASKS_PATTERN, PLAN_FILE_PATTERN, };
//# sourceMappingURL=checklist_sync_hooks.d.ts.map