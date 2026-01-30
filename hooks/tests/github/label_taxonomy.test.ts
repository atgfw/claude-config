import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as childProcess from 'node:child_process';
import {
  loadTaxonomy,
  provisionLabels,
  getLabelsForTitle,
  getLabelsForSource,
} from '../../src/github/label_taxonomy.js';

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}));

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof fs>('node:fs');
  return { ...actual, readFileSync: vi.fn() };
});

const SAMPLE_TAXONOMY = {
  labels: [
    { name: 'type/feat', color: '00ff00', description: 'New feature' },
    { name: 'type/fix', color: 'ff0000', description: 'Bug fix' },
    { name: 'lifecycle/triage', color: 'cccccc', description: 'Needs triage' },
  ],
  remove_defaults: ['bug', 'enhancement', 'question'],
};

const mockedExecSync = vi.mocked(childProcess.execSync);
const mockedReadFileSync = vi.mocked(fs.readFileSync);

beforeEach(() => {
  vi.clearAllMocks();
  mockedReadFileSync.mockReturnValue(JSON.stringify(SAMPLE_TAXONOMY));
});

// ============================================================================
// getLabelsForTitle
// ============================================================================

describe('getLabelsForTitle', () => {
  it('extracts system and type labels from full title', () => {
    const labels = getLabelsForTitle('[hooks] feat(session-start): add auto-push');
    expect(labels).toContain('system/hooks');
    expect(labels).toContain('type/feat');
    expect(labels).toContain('lifecycle/triage');
  });

  it('handles title with no system prefix', () => {
    const labels = getLabelsForTitle('fix(utils): correct path join');
    expect(labels).not.toContain(expect.stringContaining('system/'));
    expect(labels).toContain('type/fix');
    expect(labels).toContain('lifecycle/triage');
  });

  it('handles title with no conventional commit pattern', () => {
    const labels = getLabelsForTitle('[mcp] update registry');
    expect(labels).toContain('system/mcp');
    expect(labels).toContain('lifecycle/triage');
    expect(labels).toHaveLength(2);
  });

  it('always includes lifecycle/triage', () => {
    const labels = getLabelsForTitle('random title');
    expect(labels).toContain('lifecycle/triage');
  });

  it('extracts system with hyphens', () => {
    const labels = getLabelsForTitle('[tool-router] refactor(config): simplify');
    expect(labels).toContain('system/tool-router');
    expect(labels).toContain('type/refactor');
  });
});

// ============================================================================
// getLabelsForSource
// ============================================================================

describe('getLabelsForSource', () => {
  it('returns source/correction-ledger', () => {
    expect(getLabelsForSource('correction-ledger')).toBe('source/correction-ledger');
  });

  it('returns source/escalation', () => {
    expect(getLabelsForSource('escalation')).toBe('source/escalation');
  });

  it('returns source/openspec', () => {
    expect(getLabelsForSource('openspec')).toBe('source/openspec');
  });

  it('returns source/manual', () => {
    expect(getLabelsForSource('manual')).toBe('source/manual');
  });
});

// ============================================================================
// loadTaxonomy
// ============================================================================

describe('loadTaxonomy', () => {
  it('parses taxonomy JSON from file', () => {
    const taxonomy = loadTaxonomy();
    expect(taxonomy.labels).toHaveLength(3);
    expect(taxonomy.remove_defaults).toContain('bug');
  });
});

// ============================================================================
// provisionLabels
// ============================================================================

describe('provisionLabels', () => {
  it('creates labels and removes defaults', () => {
    // Existing labels include defaults to remove
    mockedExecSync.mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.startsWith('gh label list')) {
        return JSON.stringify([
          { name: 'bug', color: 'd73a4a', description: 'Something broken' },
          { name: 'enhancement', color: 'a2eeef', description: 'New feature' },
        ]);
      }
      return '';
    });

    provisionLabels();

    // Should delete existing defaults
    expect(mockedExecSync).toHaveBeenCalledWith(
      expect.stringContaining('gh label delete "bug"'),
      expect.anything()
    );
    expect(mockedExecSync).toHaveBeenCalledWith(
      expect.stringContaining('gh label delete "enhancement"'),
      expect.anything()
    );
    // "question" not in existing, so not deleted
    expect(mockedExecSync).not.toHaveBeenCalledWith(
      expect.stringContaining('gh label delete "question"'),
      expect.anything()
    );

    // Should create all taxonomy labels
    expect(mockedExecSync).toHaveBeenCalledWith(
      expect.stringContaining('gh label create "type/feat"'),
      expect.anything()
    );
    expect(mockedExecSync).toHaveBeenCalledWith(
      expect.stringContaining('--force'),
      expect.anything()
    );
  });

  it('handles idempotent runs when labels already exist', () => {
    mockedExecSync.mockImplementation((cmd: string) => {
      if (typeof cmd === 'string' && cmd.startsWith('gh label list')) {
        return JSON.stringify([
          { name: 'type/feat', color: '00ff00', description: 'New feature' },
          { name: 'type/fix', color: 'ff0000', description: 'Bug fix' },
          { name: 'lifecycle/triage', color: 'cccccc', description: 'Needs triage' },
        ]);
      }
      return '';
    });

    // Should not throw; --force handles upsert
    provisionLabels();

    // Still calls create with --force (upsert)
    expect(mockedExecSync).toHaveBeenCalledWith(
      expect.stringContaining('gh label create "type/feat"'),
      expect.anything()
    );
  });

  it('warns on gh failure without throwing', () => {
    mockedExecSync.mockImplementation(() => {
      throw new Error('gh not found');
    });

    // Should not throw
    expect(() => provisionLabels()).not.toThrow();
  });
});
