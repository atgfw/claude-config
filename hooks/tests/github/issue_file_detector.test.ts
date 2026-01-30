import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';

vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
  };
});

vi.mock('../../src/utils.js', () => ({
  getClaudeDir: () => '/mock/.claude',
}));

const { existsSync } = fs as unknown as { existsSync: ReturnType<typeof vi.fn> };

describe('issue_file_detector', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    existsSync.mockReturnValue(false);
  });

  describe('extractCandidates', () => {
    let extractCandidates: typeof import('../../src/github/issue_file_detector.js').extractCandidates;

    beforeEach(async () => {
      const mod = await import('../../src/github/issue_file_detector.js');
      extractCandidates = mod.extractCandidates;
    });

    it('extracts explicit filename with extension', () => {
      const result = extractCandidates(
        'feat: implement cloud_object_creation_gate.ts (P0-CRITICAL)'
      );
      expect(result).toContain('cloud_object_creation_gate.ts');
      expect(result).toContain('cloud_object_creation_gate');
    });

    it('extracts from "implement X" pattern', () => {
      const result = extractCandidates('feat: implement cloud_object_creation_gate');
      expect(result).toContain('cloud_object_creation_gate');
      expect(result).toContain('cloud_object_creation_gate.ts');
    });

    it('extracts hook naming patterns (_gate, _validator, etc)', () => {
      const result = extractCandidates('Missing LLM model validator hook - gpt-4o slipped through');
      // Should not match partial -- needs full _validator suffix
      const hookCandidates = result.filter((c) => c.includes('_validator') || c.includes('_gate'));
      // The title does not contain a snake_case hook name, so no hook match
      expect(hookCandidates).toHaveLength(0);
    });

    it('extracts hook name with proper suffix', () => {
      const result = extractCandidates('Add folder_hygiene_auditor hook to session_start');
      expect(result).toContain('folder_hygiene_auditor');
      expect(result).toContain('folder_hygiene_auditor.ts');
    });

    it('returns empty for titles without file references', () => {
      const result = extractCandidates('Fix XO linter shows empty error messages');
      // "Fix" matches IMPLEMENT_REGEX but "XO" is only 2 chars so filtered
      // No file extension, no hook name pattern
      expect(result.filter((c) => c.includes('.ts'))).toHaveLength(0);
    });

    it('deduplicates candidates', () => {
      const result = extractCandidates('implement cloud_object_creation_gate.ts gate');
      const unique = new Set(result);
      expect(result.length).toBe(unique.size);
    });
  });

  describe('detectImplementedFile', () => {
    let detectImplementedFile: typeof import('../../src/github/issue_file_detector.js').detectImplementedFile;

    beforeEach(async () => {
      const mod = await import('../../src/github/issue_file_detector.js');
      detectImplementedFile = mod.detectImplementedFile;
    });

    it('returns path when file exists on disk', () => {
      existsSync.mockImplementation((p: string) => p.includes('cloud_object_creation_gate.ts'));

      const result = detectImplementedFile(
        'feat: implement cloud_object_creation_gate.ts (P0-CRITICAL)',
        '/mock/.claude'
      );
      expect(result).toBeTruthy();
      expect(result).toContain('cloud_object_creation_gate.ts');
    });

    it('returns null when file does not exist', () => {
      existsSync.mockReturnValue(false);

      const result = detectImplementedFile(
        'feat: implement cloud_object_creation_gate.ts',
        '/mock/.claude'
      );
      expect(result).toBeNull();
    });

    it('returns null for titles with no extractable candidates', () => {
      const result = detectImplementedFile(
        'chore: clean up scrapling-test directory',
        '/mock/.claude'
      );
      expect(result).toBeNull();
    });

    it('finds files by hook name pattern', () => {
      existsSync.mockImplementation((p: string) => p.includes('folder_hygiene_auditor.ts'));

      const result = detectImplementedFile(
        'Add folder_hygiene_auditor hook to session_start',
        '/mock/.claude'
      );
      expect(result).toBeTruthy();
    });
  });
});
