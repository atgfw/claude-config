/**
 * Checklist Utilities
 *
 * Core utilities for checklist reconciliation:
 * - Hash generation for drift detection
 * - ID generation for item tracking
 * - Text normalization for comparison
 */

import * as crypto from 'node:crypto';
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
export function normalizeItemText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, ' ') // Collapse whitespace
    .replace(/^[\s*_~`#-]+/, '') // Strip leading markdown
    .replace(/[\s*_~`]+$/, '') // Strip trailing markdown
    .toLowerCase();
}

/**
 * Generate a stable ID for a checklist item based on its normalized text.
 * Uses SHA-256 hash truncated to 12 characters.
 */
export function generateItemId(text: string): string {
  const normalized = normalizeItemText(text);
  const hash = crypto.createHash('sha256').update(normalized).digest('hex');
  return hash.slice(0, 12);
}

/**
 * Compute a hash of checklist items for drift detection.
 * Hash is based on sorted item IDs and statuses.
 */
export function computeChecklistHash(items: ChecklistItem[]): string {
  if (items.length === 0) {
    return '';
  }

  // Sort by ID for stable ordering
  const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));

  // Create hash input from ID:status pairs
  const hashInput = sorted.map((item) => `${item.id}:${item.status}`).join('|');

  return crypto.createHash('sha256').update(hashInput).digest('hex').slice(0, 16);
}

/**
 * Create a ChecklistItem from text with default values.
 */
export function createChecklistItem(
  text: string,
  status: ChecklistItemStatus = 'pending',
  modifiedBy: ChecklistItem['modified_by'] = 'claude_task'
): ChecklistItem {
  return {
    id: generateItemId(text),
    text: text.trim(),
    status,
    last_modified: new Date().toISOString(),
    modified_by: modifiedBy,
  };
}

/**
 * Determine item status from markdown checkbox format.
 * - [ ] = pending
 * - [x] or [X] = completed
 * - [-] = in_progress (convention)
 */
export function parseCheckboxStatus(checkbox: string): ChecklistItemStatus {
  const mark = checkbox.trim().toLowerCase();
  if (mark === 'x') return 'completed';
  if (mark === '-') return 'in_progress';
  return 'pending';
}

/**
 * Format item status as markdown checkbox.
 */
export function formatCheckboxStatus(status: ChecklistItemStatus): string {
  switch (status) {
    case 'completed':
      return 'x';
    case 'in_progress':
      return '-';
    default:
      return ' ';
  }
}

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

export function diffChecklists(
  registryItems: ChecklistItem[],
  artifactItems: ChecklistItem[]
): ChecklistDiff {
  const registryMap = new Map(registryItems.map((item) => [item.id, item]));
  const artifactMap = new Map(artifactItems.map((item) => [item.id, item]));

  const added: ChecklistItem[] = [];
  const removed: ChecklistItem[] = [];
  const statusChanged: ChecklistDiff['statusChanged'] = [];
  const unchanged: ChecklistItem[] = [];

  // Find added and changed items
  for (const [id, artifactItem] of artifactMap) {
    const registryItem = registryMap.get(id);
    if (!registryItem) {
      added.push(artifactItem);
    } else if (registryItem.status !== artifactItem.status) {
      statusChanged.push({
        item: artifactItem,
        oldStatus: registryItem.status,
        newStatus: artifactItem.status,
      });
    } else {
      unchanged.push(registryItem);
    }
  }

  // Find removed items
  for (const [id, registryItem] of registryMap) {
    if (!artifactMap.has(id)) {
      removed.push(registryItem);
    }
  }

  return { added, removed, statusChanged, unchanged };
}

/**
 * Resolve conflicts using newest-wins strategy.
 * Returns the item with the most recent last_modified timestamp.
 */
export function resolveConflict(item1: ChecklistItem, item2: ChecklistItem): ChecklistItem {
  const time1 = new Date(item1.last_modified).getTime();
  const time2 = new Date(item2.last_modified).getTime();
  return time1 >= time2 ? item1 : item2;
}

/**
 * Merge two sets of checklist items with conflict resolution.
 * Uses newest-wins for status conflicts.
 */
export function mergeChecklists(
  registryItems: ChecklistItem[],
  artifactItems: ChecklistItem[]
): ChecklistItem[] {
  const diff = diffChecklists(registryItems, artifactItems);
  const merged: ChecklistItem[] = [];

  // Add unchanged items
  merged.push(...diff.unchanged);

  // Add new items from artifact
  merged.push(...diff.added);

  // Resolve status changes - use newest timestamp
  for (const change of diff.statusChanged) {
    const registryItem = registryItems.find((i) => i.id === change.item.id);
    if (registryItem) {
      merged.push(resolveConflict(registryItem, change.item));
    } else {
      merged.push(change.item);
    }
  }

  // Note: removed items are NOT added back - removal is intentional

  // Sort by original order if possible, otherwise by ID
  return merged.sort((a, b) => a.id.localeCompare(b.id));
}
