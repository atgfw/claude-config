/**
 * Checklist Propagator
 *
 * Pushes reconciled checklist changes back to linked artifacts:
 * - GitHub issues via gh CLI
 * - OpenSpec tasks.md files
 * - Plan .md files
 */
import type { SyncSourceType, ChecklistItem } from '../github/task_source_sync.js';
/**
 * Propagate checklist state to a GitHub issue.
 * Updates the issue body with the current checklist state.
 */
export declare function propagateToGitHub(issueNumber: number, items: ChecklistItem[]): Promise<boolean>;
/**
 * Propagate checklist state to a file (OpenSpec or plan).
 */
export declare function propagateToFile(filePath: string, items: ChecklistItem[], artifactType: 'openspec' | 'plan'): Promise<boolean>;
/**
 * Propagate checklist changes to all linked artifacts.
 * Returns list of artifact types that were successfully updated.
 */
export declare function propagateToLinkedArtifacts(sourceType: SyncSourceType, sourceId: string): Promise<string[]>;
//# sourceMappingURL=checklist_propagator.d.ts.map