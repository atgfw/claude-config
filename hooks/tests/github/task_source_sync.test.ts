import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import { execSync } from 'node:child_process';
import {
  loadRegistry,
  saveRegistry,
  findEntry,
  upsertEntry,
  syncFromGitHub,
  onTaskComplete,
  linkTask,
  linkOpenSpec,
  _resetSyncFlag,
  _setSyncFlag,
  type SyncRegistry,
  type SyncEntry,
} from '../../src/github/task_source_sync.js';

vi.mock('node:fs');
vi.mock('node:child_process');

const mockedFs = vi.mocked(fs);
const mockedExecSync = vi.mocked(execSync);

function makeEntry(overrides: Partial<SyncEntry> = {}): SyncEntry {
  return {
    unified_id: 'issue-1',
    github_issue: 1,
    claude_task_id: null,
    openspec_change_id: null,
    plan_step: null,
    status: 'open',
    last_synced: '2025-01-01T00:00:00.000Z',
    sync_hash: '',
    ...overrides,
  };
}

function makeRegistry(entries: SyncEntry[] = []): SyncRegistry {
  return { version: 1, entries };
}

describe('task_source_sync', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetSyncFlag();
    mockedFs.existsSync.mockReturnValue(false);
    mockedFs.mkdirSync.mockReturnValue(undefined);
    mockedFs.writeFileSync.mockReturnValue(undefined);
  });

  describe('loadRegistry', () => {
    it('returns empty registry when file is missing', () => {
      mockedFs.existsSync.mockReturnValue(false);
      const result = loadRegistry();
      expect(result).toEqual({ version: 1, entries: [] });
    });

    it('parses existing registry file', () => {
      const data = makeRegistry([makeEntry()]);
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(data));
      const result = loadRegistry();
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].github_issue).toBe(1);
    });

    it('returns empty registry on parse error', () => {
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue('invalid json');
      const result = loadRegistry();
      expect(result).toEqual({ version: 1, entries: [] });
    });
  });

  describe('findEntry', () => {
    it('finds entry by github_issue', () => {
      const registry = makeRegistry([makeEntry({ github_issue: 5 })]);
      const result = findEntry(registry, { github_issue: 5 });
      expect(result).toBeDefined();
      expect(result!.github_issue).toBe(5);
    });

    it('returns undefined when no match', () => {
      const registry = makeRegistry([makeEntry({ github_issue: 5 })]);
      const result = findEntry(registry, { github_issue: 99 });
      expect(result).toBeUndefined();
    });

    it('matches multiple fields', () => {
      const registry = makeRegistry([
        makeEntry({ github_issue: 1, status: 'open' }),
        makeEntry({ github_issue: 2, unified_id: 'issue-2', status: 'closed' }),
      ]);
      const result = findEntry(registry, { status: 'closed' });
      expect(result!.github_issue).toBe(2);
    });
  });

  describe('upsertEntry', () => {
    it('creates new entry when not found', () => {
      const registry = makeRegistry();
      const result = upsertEntry(registry, { github_issue: 10 });
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].github_issue).toBe(10);
      expect(result.entries[0].unified_id).toBe('issue-10');
      expect(result.entries[0].status).toBe('open');
    });

    it('updates existing entry', () => {
      const registry = makeRegistry([makeEntry({ github_issue: 10 })]);
      const result = upsertEntry(registry, { github_issue: 10, status: 'closed' });
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0].status).toBe('closed');
    });
  });

  describe('syncFromGitHub', () => {
    it('creates entries for new issues', () => {
      const ghOutput = JSON.stringify([
        { number: 1, title: 'Bug', state: 'OPEN', labels: [] },
        { number: 2, title: 'Feature', state: 'CLOSED', labels: [] },
      ]);
      mockedExecSync.mockReturnValue(ghOutput);
      mockedFs.existsSync.mockReturnValue(false);

      const result = syncFromGitHub();
      expect(result.created).toBe(2);
      expect(result.updated).toBe(0);
      expect(result.closed).toBe(0);
    });

    it('updates status for changed issues', () => {
      const existing = makeRegistry([makeEntry({ github_issue: 1, status: 'open' })]);
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(existing));

      const ghOutput = JSON.stringify([{ number: 1, title: 'Bug', state: 'CLOSED', labels: [] }]);
      mockedExecSync.mockReturnValue(ghOutput);

      const result = syncFromGitHub();
      expect(result.updated).toBe(1);
      expect(result.created).toBe(0);
    });

    it('closes entries not present in remote', () => {
      const existing = makeRegistry([
        makeEntry({ github_issue: 1, status: 'open' }),
        makeEntry({ github_issue: 2, unified_id: 'issue-2', status: 'open' }),
      ]);
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(existing));

      const ghOutput = JSON.stringify([{ number: 1, title: 'Bug', state: 'OPEN', labels: [] }]);
      mockedExecSync.mockReturnValue(ghOutput);

      const result = syncFromGitHub();
      expect(result.closed).toBe(1);
    });

    it('returns zeros when gh command fails', () => {
      mockedExecSync.mockImplementation(() => {
        throw new Error('gh not found');
      });

      const result = syncFromGitHub();
      expect(result).toEqual({ created: 0, updated: 0, closed: 0 });
    });

    it('re-entrancy guard prevents double sync', () => {
      _setSyncFlag();
      const result = syncFromGitHub();
      expect(result).toEqual({ created: 0, updated: 0, closed: 0 });
      expect(mockedExecSync).not.toHaveBeenCalled();
    });
  });

  describe('onTaskComplete', () => {
    it('closes linked GitHub issue', () => {
      const existing = makeRegistry([makeEntry({ github_issue: 5, claude_task_id: 'task-abc' })]);
      mockedFs.existsSync.mockReturnValue(true);
      mockedFs.readFileSync.mockReturnValue(JSON.stringify(existing));
      mockedExecSync.mockReturnValue('');

      onTaskComplete('task-abc');

      expect(mockedExecSync).toHaveBeenCalledWith(
        'gh issue close 5',
        expect.objectContaining({ encoding: 'utf-8' })
      );
    });

    it('does nothing when task has no linked issue', () => {
      mockedFs.existsSync.mockReturnValue(false);

      onTaskComplete('task-unknown');
      expect(mockedExecSync).not.toHaveBeenCalled();
    });

    it('re-entrancy guard prevents double call', () => {
      _setSyncFlag();
      onTaskComplete('task-abc');
      expect(mockedExecSync).not.toHaveBeenCalled();
    });
  });

  describe('linkTask', () => {
    it('links a Claude task to a GitHub issue', () => {
      mockedFs.existsSync.mockReturnValue(false);

      linkTask(7, 'task-xyz');

      expect(mockedFs.writeFileSync).toHaveBeenCalled();
      const written = JSON.parse(mockedFs.writeFileSync.mock.calls[0][1] as string) as SyncRegistry;
      expect(written.entries[0].github_issue).toBe(7);
      expect(written.entries[0].claude_task_id).toBe('task-xyz');
    });
  });

  describe('linkOpenSpec', () => {
    it('links an OpenSpec change to a GitHub issue', () => {
      mockedFs.existsSync.mockReturnValue(false);

      linkOpenSpec(3, 'change-001');

      expect(mockedFs.writeFileSync).toHaveBeenCalled();
      const written = JSON.parse(mockedFs.writeFileSync.mock.calls[0][1] as string) as SyncRegistry;
      expect(written.entries[0].github_issue).toBe(3);
      expect(written.entries[0].openspec_change_id).toBe('change-001');
    });
  });
});
