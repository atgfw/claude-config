/**
 * Checklist Reconciler
 *
 * Core reconciliation engine for bidirectional checklist sync.
 * Coordinates between registry and artifact types.
 */

import * as crypto from 'node:crypto';
import type {
  ChecklistItem,
  SyncEntry,
  SyncRegistry,
  SyncSource,
  SyncSourceType,
} from '../github/task_source_sync.js';
import { loadRegistry, saveRegistry, findEntry } from '../github/task_source_sync.js';
import {
  computeChecklistHash,
  mergeChecklists,
  diffChecklists,
  type ChecklistDiff,
} from './checklist_utils.js';
import {
  parseGitHubChecklist,
  parseOpenSpecTasks,
  parsePlanChecklist,
  parseClaudeTasks,
  type ClaudeTask,
} from './checklist_parsers.js';

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
export function computeContentHash(content: string): string {
  return crypto.createHash('sha256').update(content).digest('hex').slice(0, 16);
}

/**
 * Parse checklist items from content based on artifact type.
 */
export function parseByType(
  artifactType: SyncSourceType,
  content: string | ClaudeTask[]
): ChecklistItem[] {
  switch (artifactType) {
    case 'github_issue':
      return parseGitHubChecklist(content as string);
    case 'openspec':
      return parseOpenSpecTasks(content as string);
    case 'plan':
      return parsePlanChecklist(content as string);
    case 'claude_task':
      return parseClaudeTasks(content as ClaudeTask[]);
    default:
      return [];
  }
}

/**
 * Detect if an artifact has drifted from the registry.
 * Returns true if the content hash differs from last sync.
 */
export function detectDrift(
  entry: SyncEntry,
  artifactType: SyncSourceType,
  content: string
): boolean {
  const source = entry.sync_sources.find((s) => s.type === artifactType);
  if (!source) {
    // No previous sync record - consider it drifted
    return true;
  }

  const currentHash = computeContentHash(content);
  return source.content_hash !== currentHash;
}

/**
 * Find or create a sync entry for an artifact.
 */
export function findOrCreateEntry(
  registry: SyncRegistry,
  artifactType: SyncSourceType,
  artifactId: string
): SyncEntry {
  // Try to find existing entry by artifact ID
  let entry: SyncEntry | undefined;

  if (artifactType === 'github_issue') {
    const issueNum = Number.parseInt(artifactId, 10);
    entry = findEntry(registry, { github_issue: issueNum });
  } else if (artifactType === 'openspec') {
    entry = findEntry(registry, { openspec_change_id: artifactId });
  } else if (artifactType === 'plan') {
    entry = registry.entries.find((e) => e.plan_file === artifactId);
  }

  if (entry) {
    return entry;
  }

  // Create new entry
  const now = new Date().toISOString();
  const newEntry: SyncEntry = {
    unified_id: `${artifactType}-${artifactId}`,
    github_issue: artifactType === 'github_issue' ? Number.parseInt(artifactId, 10) : null,
    claude_task_id: null,
    openspec_change_id: artifactType === 'openspec' ? artifactId : null,
    plan_step: null,
    goal_summary: null,
    status: 'open',
    last_synced: now,
    sync_hash: '',
    plan_file: artifactType === 'plan' ? artifactId : null,
    checklist_items: [],
    checklist_hash: '',
    sync_sources: [],
  };

  registry.entries.push(newEntry);
  return newEntry;
}

/**
 * Update sync source record for an artifact.
 */
export function updateSyncSource(
  entry: SyncEntry,
  artifactType: SyncSourceType,
  artifactId: string,
  contentHash: string
): void {
  const now = new Date().toISOString();
  const existingIndex = entry.sync_sources.findIndex((s) => s.type === artifactType);

  const source: SyncSource = {
    type: artifactType,
    artifact_id: artifactId,
    last_read: now,
    content_hash: contentHash,
  };

  if (existingIndex >= 0) {
    entry.sync_sources[existingIndex] = source;
  } else {
    entry.sync_sources.push(source);
  }
}

/**
 * Reconcile an artifact with the registry.
 * Merges checklist items using newest-wins strategy.
 */
export function reconcileArtifact(
  artifactType: SyncSourceType,
  artifactId: string,
  content: string | ClaudeTask[]
): ReconciliationResult {
  const registry = loadRegistry();
  const entry = findOrCreateEntry(registry, artifactType, artifactId);

  // Parse items from artifact
  const artifactItems = parseByType(artifactType, content);

  // Check for drift
  const contentStr = typeof content === 'string' ? content : JSON.stringify(content);
  const driftDetected = detectDrift(entry, artifactType, contentStr);

  // Get diff for reporting
  const diff: ChecklistDiff = diffChecklists(entry.checklist_items, artifactItems);

  // Merge items
  const mergedItems = mergeChecklists(entry.checklist_items, artifactItems);

  // Update entry
  const newHash = computeChecklistHash(mergedItems);
  entry.checklist_items = mergedItems;
  entry.checklist_hash = newHash;
  entry.last_synced = new Date().toISOString();

  // Update sync source
  const contentHash = computeContentHash(contentStr);
  updateSyncSource(entry, artifactType, artifactId, contentHash);

  // Save registry
  saveRegistry(registry);

  return {
    entryId: entry.unified_id,
    artifactType,
    driftDetected,
    itemsAdded: diff.added.length,
    itemsRemoved: diff.removed.length,
    statusChanges: diff.statusChanged.length,
    newHash,
    mergedItems,
  };
}

/**
 * Get current checklist state from registry for an artifact.
 */
export function getRegistryState(
  artifactType: SyncSourceType,
  artifactId: string
): ChecklistItem[] | null {
  const registry = loadRegistry();

  let entry: SyncEntry | undefined;

  if (artifactType === 'github_issue') {
    const issueNum = Number.parseInt(artifactId, 10);
    entry = findEntry(registry, { github_issue: issueNum });
  } else if (artifactType === 'openspec') {
    entry = findEntry(registry, { openspec_change_id: artifactId });
  } else if (artifactType === 'plan') {
    entry = registry.entries.find((e) => e.plan_file === artifactId);
  }

  if (!entry) {
    return null;
  }

  return entry.checklist_items;
}

/**
 * Link multiple artifacts to the same registry entry.
 * Useful when a GitHub issue, OpenSpec change, and plan file all relate to the same work.
 */
export function linkArtifacts(
  primaryType: SyncSourceType,
  primaryId: string,
  links: Array<{ type: SyncSourceType; id: string }>
): void {
  const registry = loadRegistry();
  const entry = findOrCreateEntry(registry, primaryType, primaryId);

  for (const link of links) {
    switch (link.type) {
      case 'github_issue':
        entry.github_issue = Number.parseInt(link.id, 10);
        break;
      case 'openspec':
        entry.openspec_change_id = link.id;
        break;
      case 'plan':
        entry.plan_file = link.id;
        break;
      case 'claude_task':
        entry.claude_task_id = link.id;
        break;
    }
  }

  saveRegistry(registry);
}

/**
 * Get all linked artifact IDs for an entry.
 */
export function getLinkedArtifacts(
  artifactType: SyncSourceType,
  artifactId: string
): Record<SyncSourceType, string | null> {
  const registry = loadRegistry();
  const entry = findOrCreateEntry(registry, artifactType, artifactId);

  return {
    github_issue: entry.github_issue?.toString() ?? null,
    openspec: entry.openspec_change_id,
    plan: entry.plan_file,
    claude_task: entry.claude_task_id,
  };
}

/**
 * Check all linked artifacts for drift.
 * Returns list of artifact types that have drifted.
 */
export function checkAllDrift(
  artifactType: SyncSourceType,
  artifactId: string,
  currentContents: Partial<Record<SyncSourceType, string>>
): SyncSourceType[] {
  const registry = loadRegistry();
  const entry = findOrCreateEntry(registry, artifactType, artifactId);

  const drifted: SyncSourceType[] = [];

  for (const [type, content] of Object.entries(currentContents) as Array<
    [SyncSourceType, string]
  >) {
    if (content && detectDrift(entry, type, content)) {
      drifted.push(type);
    }
  }

  return drifted;
}
