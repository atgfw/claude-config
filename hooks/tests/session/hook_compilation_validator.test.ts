/**
 * Hook Compilation Validator Tests
 */

import * as fs from 'node:fs';
import * as childProcess from 'node:child_process';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  findStaleCompilations,
  rebuildHooks,
  validateHookCompilation,
} from '../../src/session/hook_compilation_validator.js';

// Mock modules
vi.mock('node:fs');
vi.mock('node:child_process');
vi.mock('../../src/utils.js', async () => {
  return {
    getHooksDir: vi.fn(() => '/mock/.claude/hooks'),
    log: vi.fn(),
  };
});

describe('Hook Compilation Validator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('findStaleCompilations', () => {
    it('should return empty when dist is up to date', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([]);

      const result = findStaleCompilations('/mock/.claude/hooks');

      expect(result.stale).toHaveLength(0);
      expect(result.missing).toHaveLength(0);
    });
  });

  describe('rebuildHooks', () => {
    it('should return success when build succeeds', () => {
      vi.mocked(childProcess.execSync).mockReturnValue(Buffer.from(''));

      const result = rebuildHooks('/mock/.claude/hooks');

      expect(result.success).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should return error when build fails', () => {
      vi.mocked(childProcess.execSync).mockImplementation(() => {
        throw new Error('Build failed');
      });

      const result = rebuildHooks('/mock/.claude/hooks');

      expect(result.success).toBe(false);
      expect(result.error).toContain('Build failed');
    });
  });

  describe('validateHookCompilation', () => {
    it('should pass when dist exists and is up to date', () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue([]);

      const result = validateHookCompilation('/mock/.claude/hooks');

      expect(result.passed).toBe(true);
      expect(result.severity).toBe('strict');
    });

    it('should attempt rebuild when dist is missing', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        return !String(p).includes('dist');
      });
      vi.mocked(fs.readdirSync).mockReturnValue([]);
      vi.mocked(childProcess.execSync).mockReturnValue(Buffer.from(''));

      const result = validateHookCompilation('/mock/.claude/hooks');

      expect(result.selfHealed).toBe(true);
      expect(childProcess.execSync).toHaveBeenCalled();
    });

    it('should fail when rebuild fails', () => {
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        return !String(p).includes('dist');
      });
      vi.mocked(fs.readdirSync).mockReturnValue([]);
      vi.mocked(childProcess.execSync).mockImplementation(() => {
        throw new Error('Build failed');
      });

      const result = validateHookCompilation('/mock/.claude/hooks');

      expect(result.passed).toBe(false);
      expect(result.selfHealed).toBe(false);
    });
  });
});
