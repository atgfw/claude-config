/**
 * Checklist Utilities
 *
 * Core utilities for checklist reconciliation:
 * - Hash generation for drift detection
 * - ID generation for item tracking
 * - Text normalization for comparison
 */
import type { ChecklistItem, ChecklistItemStatus } from '../github/task_source_sync.js';
/**
 * Normalize checklist item text for comparison and ID generation.
 * Strips formatting differences while preserving semantic content.
 *
 * Operations:
 * - Trim whitespace
 * - Collapse multiple spaces
 * - Remove leading/trailing markdown formatting
 * - Lowercase for comparison
 */
export declare function normalizeItemText(text: string): string;
/**
 * Generate a stable ID for a checklist item based on its normalized text.
 * Uses SHA-256 hash truncated to 12 characters.
 */
export declare function generateItemId(text: string): string;
/**
 * Compute a hash of checklist items for drift detection.
 * Hash is based on sorted item IDs and statuses.
 */
export declare function computeChecklistHash(items: ChecklistItem[]): string;
/**
 * Create a ChecklistItem from text with default values.
 */
export declare function createChecklistItem(text: string, status?: ChecklistItemStatus, modifiedBy?: ChecklistItem['modified_by']): ChecklistItem;
/**
 * Determine item status from markdown checkbox format.
 * - [ ] = pending
 * - [x] or [X] = completed
 * - [-] = in_progress (convention)
 */
export declare function parseCheckboxStatus(checkbox: string): ChecklistItemStatus;
/**
 * Format item status as markdown checkbox.
 */
export declare function formatCheckboxStatus(status: ChecklistItemStatus): string;
/**
 * Compare two sets of checklist items and identify differences.
 * Returns items that need to be added, removed, or have status changes.
 */
export interface ChecklistDiff {
    added: ChecklistItem[];
    removed: ChecklistItem[];
    statusChanged: Array<{
        item: ChecklistItem;
        oldStatus: ChecklistItemStatus;
        newStatus: ChecklistItemStatus;
    }>;
    unchanged: ChecklistItem[];
}
export declare function diffChecklists(registryItems: ChecklistItem[], artifactItems: ChecklistItem[]): ChecklistDiff;
/**
 * Resolve conflicts using newest-wins strategy.
 * Returns the item with the most recent last_modified timestamp.
 */
export declare function resolveConflict(item1: ChecklistItem, item2: ChecklistItem): ChecklistItem;
/**
 * Merge two sets of checklist items with conflict resolution.
 * Uses newest-wins for status conflicts.
 */
export declare function mergeChecklists(registryItems: ChecklistItem[], artifactItems: ChecklistItem[]): ChecklistItem[];
//# sourceMappingURL=checklist_utils.d.ts.map