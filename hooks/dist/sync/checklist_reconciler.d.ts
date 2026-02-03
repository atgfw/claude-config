/**
 * Checklist Reconciler
 *
 * Core reconciliation engine for bidirectional checklist sync.
 * Coordinates between registry and artifact types.
 */
import { type ChecklistItem, type SyncEntry, type SyncRegistry, type SyncSourceType } from '../github/task_source_sync.js';
import { type ClaudeTask } from './checklist_parsers.js';
/**
 * Result of a reconciliation operation.
 */
export interface ReconciliationResult {
    entryId: string;
    artifactType: SyncSourceType;
    driftDetected: boolean;
    itemsAdded: number;
    itemsRemoved: number;
    statusChanges: number;
    newHash: string;
    mergedItems: ChecklistItem[];
}
/**
 * Compute content hash for drift detection.
 */
export declare function computeContentHash(content: string): string;
/**
 * Parse checklist items from content based on artifact type.
 */
export declare function parseByType(artifactType: SyncSourceType, content: string | ClaudeTask[]): ChecklistItem[];
/**
 * Detect if an artifact has drifted from the registry.
 * Returns true if the content hash differs from last sync.
 */
export declare function detectDrift(entry: SyncEntry, artifactType: SyncSourceType, content: string): boolean;
/**
 * Find or create a sync entry for an artifact.
 */
export declare function findOrCreateEntry(registry: SyncRegistry, artifactType: SyncSourceType, artifactId: string): SyncEntry;
/**
 * Update sync source record for an artifact.
 */
export declare function updateSyncSource(entry: SyncEntry, artifactType: SyncSourceType, artifactId: string, contentHash: string): void;
/**
 * Reconcile an artifact with the registry.
 * Merges checklist items using newest-wins strategy.
 */
export declare function reconcileArtifact(artifactType: SyncSourceType, artifactId: string, content: string | ClaudeTask[]): ReconciliationResult;
/**
 * Get current checklist state from registry for an artifact.
 */
export declare function getRegistryState(artifactType: SyncSourceType, artifactId: string): ChecklistItem[] | null;
/**
 * Link multiple artifacts to the same registry entry.
 * Useful when a GitHub issue, OpenSpec change, and plan file all relate to the same work.
 */
export declare function linkArtifacts(primaryType: SyncSourceType, primaryId: string, links: Array<{
    type: SyncSourceType;
    id: string;
}>): void;
/**
 * Get all linked artifact IDs for an entry.
 */
export declare function getLinkedArtifacts(artifactType: SyncSourceType, artifactId: string): Record<SyncSourceType, string | null>;
/**
 * Check all linked artifacts for drift.
 * Returns list of artifact types that have drifted.
 */
export declare function checkAllDrift(artifactType: SyncSourceType, artifactId: string, currentContents: Partial<Record<SyncSourceType, string>>): SyncSourceType[];
//# sourceMappingURL=checklist_reconciler.d.ts.map