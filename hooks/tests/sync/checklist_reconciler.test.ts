import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import {
  computeContentHash,
  parseByType,
  detectDrift,
  findOrCreateEntry,
  updateSyncSource,
  reconcileArtifact,
  getRegistryState,
  linkArtifacts,
  getLinkedArtifacts,
} from '../../src/sync/checklist_reconciler.js';
import {
  loadRegistry,
  saveRegistry,
  type SyncRegistry,
} from '../../src/github/task_source_sync.js';
import { createChecklistItem } from '../../src/sync/checklist_utils.js';

let tempDir: string;
let origClaudeDir: string | undefined;

beforeAll(() => {
  origClaudeDir = process.env['CLAUDE_DIR'];
  tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'reconciler-test-'));
  fs.mkdirSync(path.join(tempDir, 'ledger'), { recursive: true });
  process.env['CLAUDE_DIR'] = tempDir;
});

afterAll(() => {
  if (origClaudeDir !== undefined) {
    process.env['CLAUDE_DIR'] = origClaudeDir;
  } else {
    delete process.env['CLAUDE_DIR'];
  }
  fs.rmSync(tempDir, { recursive: true, force: true });
});

beforeEach(() => {
  // Reset registry
  const emptyRegistry: SyncRegistry = { version: 1, entries: [] };
  saveRegistry(emptyRegistry);
});

describe('computeContentHash', () => {
  it('returns consistent hash for same content', () => {
    const hash1 = computeContentHash('test content');
    const hash2 = computeContentHash('test content');
    expect(hash1).toBe(hash2);
  });

  it('returns different hash for different content', () => {
    const hash1 = computeContentHash('content A');
    const hash2 = computeContentHash('content B');
    expect(hash1).not.toBe(hash2);
  });

  it('returns 16 character hex string', () => {
    const hash = computeContentHash('test');
    expect(hash).toHaveLength(16);
    expect(hash).toMatch(/^[a-f0-9]{16}$/);
  });
});

describe('parseByType', () => {
  it('parses github_issue content', () => {
    const items = parseByType('github_issue', '- [ ] Task one\n- [x] Task two');
    expect(items).toHaveLength(2);
    expect(items[0]?.modified_by).toBe('github_issue');
  });

  it('parses openspec content', () => {
    const items = parseByType('openspec', '- [ ] 1.1 Task\n- [x] 1.2 Done');
    expect(items).toHaveLength(2);
    expect(items[0]?.modified_by).toBe('openspec');
  });

  it('parses plan content', () => {
    const items = parseByType('plan', '- [ ] Step one\n- [x] Step two');
    expect(items).toHaveLength(2);
    expect(items[0]?.modified_by).toBe('plan');
  });

  it('parses claude_task content', () => {
    const tasks = [{ id: '1', subject: 'Task', status: 'pending' as const }];
    const items = parseByType('claude_task', tasks);
    expect(items).toHaveLength(1);
    expect(items[0]?.modified_by).toBe('claude_task');
  });
});

describe('findOrCreateEntry', () => {
  it('creates new entry when not found', () => {
    const registry = loadRegistry();
    const entry = findOrCreateEntry(registry, 'github_issue', '123');
    expect(entry.unified_id).toBe('github_issue-123');
    expect(entry.github_issue).toBe(123);
  });

  it('returns existing entry when found', () => {
    const registry = loadRegistry();
    const entry1 = findOrCreateEntry(registry, 'github_issue', '42');
    entry1.goal_summary = 'Test goal';
    saveRegistry(registry);

    const registry2 = loadRegistry();
    const entry2 = findOrCreateEntry(registry2, 'github_issue', '42');
    expect(entry2.goal_summary).toBe('Test goal');
  });

  it('creates entry with correct type fields', () => {
    const registry = loadRegistry();

    const ghEntry = findOrCreateEntry(registry, 'github_issue', '1');
    expect(ghEntry.github_issue).toBe(1);

    const osEntry = findOrCreateEntry(registry, 'openspec', 'my-change');
    expect(osEntry.openspec_change_id).toBe('my-change');

    const planEntry = findOrCreateEntry(registry, 'plan', '/path/to/plan.md');
    expect(planEntry.plan_file).toBe('/path/to/plan.md');
  });
});

describe('updateSyncSource', () => {
  it('adds new sync source', () => {
    const registry = loadRegistry();
    const entry = findOrCreateEntry(registry, 'github_issue', '1');

    updateSyncSource(entry, 'github_issue', '1', 'abc123');

    expect(entry.sync_sources).toHaveLength(1);
    expect(entry.sync_sources[0]?.type).toBe('github_issue');
    expect(entry.sync_sources[0]?.content_hash).toBe('abc123');
  });

  it('updates existing sync source', () => {
    const registry = loadRegistry();
    const entry = findOrCreateEntry(registry, 'github_issue', '1');

    updateSyncSource(entry, 'github_issue', '1', 'hash1');
    updateSyncSource(entry, 'github_issue', '1', 'hash2');

    expect(entry.sync_sources).toHaveLength(1);
    expect(entry.sync_sources[0]?.content_hash).toBe('hash2');
  });
});

describe('detectDrift', () => {
  it('returns true when no previous sync', () => {
    const registry = loadRegistry();
    const entry = findOrCreateEntry(registry, 'github_issue', '1');

    expect(detectDrift(entry, 'github_issue', 'content')).toBe(true);
  });

  it('returns false when content unchanged', () => {
    const registry = loadRegistry();
    const entry = findOrCreateEntry(registry, 'github_issue', '1');
    const content = '- [ ] Task';
    const hash = computeContentHash(content);
    updateSyncSource(entry, 'github_issue', '1', hash);

    expect(detectDrift(entry, 'github_issue', content)).toBe(false);
  });

  it('returns true when content changed', () => {
    const registry = loadRegistry();
    const entry = findOrCreateEntry(registry, 'github_issue', '1');
    updateSyncSource(entry, 'github_issue', '1', 'oldhash');

    expect(detectDrift(entry, 'github_issue', 'new content')).toBe(true);
  });
});

describe('reconcileArtifact', () => {
  it('creates entry and parses items on first reconcile', () => {
    const content = '- [ ] Task one\n- [x] Task two';
    const result = reconcileArtifact('github_issue', '1', content);

    expect(result.entryId).toBe('github_issue-1');
    expect(result.driftDetected).toBe(true);
    expect(result.itemsAdded).toBe(2);
    expect(result.mergedItems).toHaveLength(2);
  });

  it('detects no drift on second reconcile with same content', () => {
    const content = '- [ ] Task one\n- [x] Task two';

    reconcileArtifact('github_issue', '1', content);
    const result2 = reconcileArtifact('github_issue', '1', content);

    expect(result2.driftDetected).toBe(false);
    expect(result2.itemsAdded).toBe(0);
  });

  it('merges new items from artifact', () => {
    reconcileArtifact('github_issue', '1', '- [ ] Task one');
    const result = reconcileArtifact('github_issue', '1', '- [ ] Task one\n- [ ] Task two');

    expect(result.itemsAdded).toBe(1);
    expect(result.mergedItems).toHaveLength(2);
  });

  it('tracks status changes', () => {
    reconcileArtifact('github_issue', '1', '- [ ] Task one');
    const result = reconcileArtifact('github_issue', '1', '- [x] Task one');

    expect(result.statusChanges).toBe(1);
  });
});

describe('getRegistryState', () => {
  it('returns null for unknown artifact', () => {
    const state = getRegistryState('github_issue', '999');
    expect(state).toBeNull();
  });

  it('returns items for known artifact', () => {
    reconcileArtifact('github_issue', '1', '- [ ] Task one');
    const state = getRegistryState('github_issue', '1');

    expect(state).toHaveLength(1);
    expect(state?.[0]?.text).toBe('Task one');
  });
});

describe('linkArtifacts', () => {
  it('links multiple artifacts to one entry', () => {
    reconcileArtifact('github_issue', '42', '- [ ] Task');

    linkArtifacts('github_issue', '42', [
      { type: 'openspec', id: 'my-change' },
      { type: 'plan', id: '/path/plan.md' },
    ]);

    const links = getLinkedArtifacts('github_issue', '42');
    expect(links.github_issue).toBe('42');
    expect(links.openspec).toBe('my-change');
    expect(links.plan).toBe('/path/plan.md');
  });
});
