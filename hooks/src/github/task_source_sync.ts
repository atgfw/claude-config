/**
 * Task Source Sync
 * Bidirectional sync between GitHub issues and local state.
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { logTerse, logWarn, getClaudeDir } from '../utils.js';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Re-entrancy guard
// ---------------------------------------------------------------------------

let _syncing = false;

// ---------------------------------------------------------------------------
// Registry I/O
// ---------------------------------------------------------------------------

function registryPath(): string {
  return path.join(getClaudeDir(), 'ledger', 'issue-sync-registry.json');
}

export function loadRegistry(): SyncRegistry {
  const p = registryPath();
  if (!fs.existsSync(p)) {
    return { version: 1, entries: [] };
  }
  try {
    const raw = fs.readFileSync(p, 'utf-8');
    return JSON.parse(raw) as SyncRegistry;
  } catch {
    return { version: 1, entries: [] };
  }
}

export function saveRegistry(registry: SyncRegistry): void {
  const p = registryPath();
  const dir = path.dirname(p);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(p, JSON.stringify(registry, null, 2), 'utf-8');
}

// ---------------------------------------------------------------------------
// Query helpers
// ---------------------------------------------------------------------------

export function findEntry(
  registry: SyncRegistry,
  query: Partial<SyncEntry>
): SyncEntry | undefined {
  return registry.entries.find((entry) => {
    for (const key of Object.keys(query) as Array<keyof SyncEntry>) {
      if (query[key] !== undefined && entry[key] !== query[key]) {
        return false;
      }
    }
    return true;
  });
}

export function upsertEntry(
  registry: SyncRegistry,
  entry: Partial<SyncEntry> & { github_issue: number }
): SyncRegistry {
  const existing = findEntry(registry, { github_issue: entry.github_issue });
  const now = new Date().toISOString();

  if (existing) {
    Object.assign(existing, {
      ...entry,
      last_synced: now,
    });
  } else {
    registry.entries.push({
      unified_id: `issue-${entry.github_issue}`,
      github_issue: entry.github_issue,
      claude_task_id: entry.claude_task_id ?? null,
      openspec_change_id: entry.openspec_change_id ?? null,
      plan_step: entry.plan_step ?? null,
      status: entry.status ?? 'open',
      last_synced: now,
      sync_hash: entry.sync_hash ?? '',
    });
  }

  return registry;
}

// ---------------------------------------------------------------------------
// GitHub sync
// ---------------------------------------------------------------------------

interface GhIssue {
  number: number;
  title: string;
  state: string;
  labels: Array<{ name: string }>;
}

export function syncFromGitHub(): { created: number; updated: number; closed: number } {
  if (_syncing) {
    return { created: 0, updated: 0, closed: 0 };
  }
  _syncing = true;

  try {
    let issues: GhIssue[] = [];
    try {
      const raw = execSync(
        'gh issue list --state all --json number,title,state,labels --limit 100',
        { encoding: 'utf-8', timeout: 30_000 }
      );
      issues = JSON.parse(raw) as GhIssue[];
    } catch {
      logWarn('gh issue list failed');
      return { created: 0, updated: 0, closed: 0 };
    }

    const registry = loadRegistry();
    let created = 0;
    let updated = 0;
    let closed = 0;

    const remoteNumbers = new Set<number>();

    for (const issue of issues) {
      remoteNumbers.add(issue.number);
      const ghStatus: 'open' | 'closed' = issue.state === 'OPEN' ? 'open' : 'closed';
      const existing = findEntry(registry, { github_issue: issue.number });

      if (!existing) {
        upsertEntry(registry, { github_issue: issue.number, status: ghStatus });
        created++;
      } else if (existing.status !== ghStatus) {
        existing.status = ghStatus;
        existing.last_synced = new Date().toISOString();
        updated++;
      }
    }

    for (const entry of registry.entries) {
      if (
        entry.github_issue !== null &&
        !remoteNumbers.has(entry.github_issue) &&
        entry.status !== 'closed'
      ) {
        entry.status = 'closed';
        entry.last_synced = new Date().toISOString();
        closed++;
      }
    }

    saveRegistry(registry);
    logTerse(`[+] Sync: ${created} new, ${updated} updated, ${closed} closed`);

    return { created, updated, closed };
  } finally {
    _syncing = false;
  }
}

// ---------------------------------------------------------------------------
// Task lifecycle
// ---------------------------------------------------------------------------

export function onTaskComplete(taskId: string): void {
  if (_syncing) {
    return;
  }
  _syncing = true;

  try {
    const registry = loadRegistry();
    const entry = findEntry(registry, { claude_task_id: taskId });

    if (!entry || entry.github_issue === null) {
      return;
    }

    try {
      execSync(`gh issue close ${entry.github_issue}`, {
        encoding: 'utf-8',
        timeout: 15_000,
      });
    } catch {
      logWarn(`Failed to close #${entry.github_issue}`);
      return;
    }

    entry.status = 'closed';
    entry.last_synced = new Date().toISOString();
    saveRegistry(registry);
    logTerse(`[+] Closed #${entry.github_issue} (task complete)`);
  } finally {
    _syncing = false;
  }
}

// ---------------------------------------------------------------------------
// Linking helpers
// ---------------------------------------------------------------------------

export function linkTask(githubIssue: number, claudeTaskId: string): void {
  const registry = loadRegistry();
  upsertEntry(registry, { github_issue: githubIssue, claude_task_id: claudeTaskId });
  saveRegistry(registry);
}

export function linkOpenSpec(githubIssue: number, changeId: string): void {
  const registry = loadRegistry();
  upsertEntry(registry, { github_issue: githubIssue, openspec_change_id: changeId });
  saveRegistry(registry);
}

// Exported for testing
export function _resetSyncFlag(): void {
  _syncing = false;
}

export function _setSyncFlag(): void {
  _syncing = true;
}
