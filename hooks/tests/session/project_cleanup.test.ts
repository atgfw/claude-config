/**
 * Project Cleanup Tests
 */

import * as fs from 'node:fs';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { cleanupProject } from '../../src/session/project_cleanup.js';

// Mock modules
vi.mock('node:fs');
vi.mock('node:process', () => ({
  default: { cwd: () => '/mock/project' },
}));
vi.mock('../../src/utils.js', async () => {
  return {
    archiveToDateDir: vi.fn(() => '/mock/.claude/old/2024-01-01/file.tmp'),
    log: vi.fn(),
  };
});

describe('Project Cleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('cleanupProject', () => {
    it('should pass when no stale files found', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([]);

      const result = cleanupProject('/mock/project');

      expect(result.passed).toBe(true);
      expect(result.severity).toBe('info');
      expect(result.message).toContain('No stale');
    });

    it('should report archived files', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockImplementation((directory) => {
        const directoryString = String(directory);

        if (directoryString === '/mock/project') {
          return [
            {
              name: 'old-file.tmp',
              isDirectory: () => false,
              isFile: () => true,
              isBlockDevice: () => false,
              isCharacterDevice: () => false,
              isSymbolicLink: () => false,

              isFIFO: () => false,
              isSocket: () => false,
              parentPath: directoryString,
              path: directoryString,
            },
          ];
        }

        return [];
      });

      // Mock file stats to make file appear old enough
      const oldDate = Date.now() - 48 * 60 * 60 * 1000; // 48 hours ago

      vi.mocked(fs.statSync).mockReturnValue({
        mtimeMs: oldDate,
        isFile: () => true,
        isDirectory: () => false,
      } as fs.Stats);

      const result = cleanupProject('/mock/project');

      expect(result.passed).toBe(true);
      expect(result.severity).toBe('info');
    });
  });
});
