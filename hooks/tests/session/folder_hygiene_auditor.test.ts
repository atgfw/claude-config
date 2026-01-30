/**
 * Folder Hygiene Auditor Tests
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readdirSync: vi.fn(),
    statSync: vi.fn(),
    writeFileSync: vi.fn(),
    readFileSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

vi.mock('../../src/utils.js', () => ({
  log: vi.fn(),
  logWarn: vi.fn(),
  logTerse: vi.fn(),
  getClaudeDir: () => '/mock/.claude',
}));

const { existsSync, readdirSync, statSync } = fs as unknown as {
  existsSync: ReturnType<typeof vi.fn>;
  readdirSync: ReturnType<typeof vi.fn>;
  statSync: ReturnType<typeof vi.fn>;
};

describe('folderHygieneAuditor', () => {
  let auditFolderHygiene: typeof import('../../src/session/folder_hygiene_auditor.js').auditFolderHygiene;

  beforeEach(async () => {
    vi.clearAllMocks();
    existsSync.mockReturnValue(false);
    readdirSync.mockReturnValue([]);
    const mod = await import('../../src/session/folder_hygiene_auditor.js');
    auditFolderHygiene = mod.auditFolderHygiene;
  });

  it('returns no issues for clean directory', () => {
    readdirSync.mockReturnValue([]);

    const result = auditFolderHygiene('/project');
    expect(result.issues).toHaveLength(0);
    expect(result.passed).toBe(true);
  });

  it('detects Windows garbage files', () => {
    readdirSync.mockReturnValue([
      { name: 'New Text Document.txt', isFile: () => true, isDirectory: () => false },
    ]);

    const result = auditFolderHygiene('/project');
    expect(result.issues.length).toBeGreaterThanOrEqual(1);
    expect(result.issues.some((i) => i.type === 'garbage_file')).toBe(true);
  });

  it('detects nul file', () => {
    readdirSync.mockReturnValue([{ name: 'nul', isFile: () => true, isDirectory: () => false }]);
    statSync.mockReturnValue({ size: 0 });

    const result = auditFolderHygiene('/project');
    expect(result.issues.some((i) => i.type === 'garbage_file')).toBe(true);
  });

  it('detects spaces in filenames', () => {
    readdirSync.mockReturnValue([
      { name: 'elevenlabs agent.txt', isFile: () => true, isDirectory: () => false },
    ]);
    statSync.mockReturnValue({ size: 100 });

    const result = auditFolderHygiene('/project');
    expect(result.issues.some((i) => i.type === 'naming_violation')).toBe(true);
  });

  it('detects screenshots at root', () => {
    readdirSync.mockReturnValue([
      { name: 'screenshot-2026.png', isFile: () => true, isDirectory: () => false },
    ]);
    statSync.mockReturnValue({ size: 500_000 });

    const result = auditFolderHygiene('/project');
    expect(result.issues.some((i) => i.type === 'screenshot_at_root')).toBe(true);
  });

  it('detects Untitled files', () => {
    readdirSync.mockReturnValue([
      { name: 'Untitled-1.txt', isFile: () => true, isDirectory: () => false },
    ]);

    const result = auditFolderHygiene('/project');
    expect(result.issues.some((i) => i.type === 'garbage_file')).toBe(true);
  });

  it('returns suggestions with each issue', () => {
    readdirSync.mockReturnValue([{ name: 'nul', isFile: () => true, isDirectory: () => false }]);
    statSync.mockReturnValue({ size: 0 });

    const result = auditFolderHygiene('/project');
    for (const issue of result.issues) {
      expect(issue.suggestion).toBeTruthy();
    }
  });

  it('suggestions never contain deletion commands', () => {
    readdirSync.mockReturnValue([
      { name: 'New Text Document.txt', isFile: () => true, isDirectory: () => false },
      { name: 'nul', isFile: () => true, isDirectory: () => false },
      { name: 'Copy of file.txt', isFile: () => true, isDirectory: () => false },
    ]);
    statSync.mockReturnValue({ size: 0 });

    const result = auditFolderHygiene('/project');
    for (const issue of result.issues) {
      expect(issue.suggestion).not.toMatch(/\brm\b/);
      expect(issue.suggestion).not.toMatch(/\bdel\b/);
      expect(issue.suggestion).not.toMatch(/\bdelete\b/);
    }
  });

  it('detects script sprawl', () => {
    readdirSync.mockReturnValue([
      { name: 'script1.py', isFile: () => true, isDirectory: () => false },
      { name: 'script2.js', isFile: () => true, isDirectory: () => false },
      { name: 'script3.ts', isFile: () => true, isDirectory: () => false },
    ]);
    statSync.mockReturnValue({ size: 100 });

    const result = auditFolderHygiene('/project');
    expect(result.issues.some((i) => i.type === 'organization')).toBe(true);
  });

  it('skips directories', () => {
    readdirSync.mockReturnValue([{ name: 'src', isFile: () => false, isDirectory: () => true }]);

    const result = auditFolderHygiene('/project');
    expect(result.issues).toHaveLength(0);
  });
});
