/**
 * Git Synchronizer Tests
 */

import * as fs from 'node:fs';
import * as childProcess from 'node:child_process';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { isGitRepository, synchronizeGit } from '../../src/session/git_synchronizer.js';

// Mock modules
vi.mock('node:fs');
vi.mock('node:child_process');
vi.mock('../../src/utils.js', async () => {
  return {
    log: vi.fn(),
  };
});

describe('Git Synchronizer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('isGitRepository', () => {
    it('should return true when .git directory exists', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);

      const result = isGitRepository('/mock/project');

      expect(result).toBe(true);
    });

    it('should return false when .git directory does not exist', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = isGitRepository('/mock/project');

      expect(result).toBe(false);
    });
  });

  describe('synchronizeGit', () => {
    it('should skip sync for non-git directories', () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const result = synchronizeGit('/mock/project');

      expect(result.passed).toBe(true);
      expect(result.message).toContain('Not a git repository');
    });

    it('should pass when fetch succeeds and up to date', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(childProcess.execSync).mockImplementation((command) => {
        const commandString = String(command);

        if (commandString.includes('rev-parse --abbrev-ref HEAD')) {
          return Buffer.from('main');
        }

        if (commandString.includes('upstream')) {
          return Buffer.from('origin/main');
        }

        if (commandString.includes('rev-list')) {
          return Buffer.from('0\t0');
        }

        if (commandString.includes('status --porcelain')) {
          return Buffer.from('');
        }

        return Buffer.from('');
      });

      const result = synchronizeGit('/mock/project');

      expect(result.passed).toBe(true);
    });

    it('should warn when fetch fails', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(childProcess.execSync).mockImplementation((command) => {
        const commandString = String(command);

        if (commandString.includes('rev-parse --abbrev-ref HEAD')) {
          return Buffer.from('main');
        }

        if (commandString.includes('fetch')) {
          throw new Error('Network timeout');
        }

        return Buffer.from('');
      });

      const result = synchronizeGit('/mock/project');

      expect(result.passed).toBe(true);
      expect(result.severity).toBe('warn');
    });
  });
});
