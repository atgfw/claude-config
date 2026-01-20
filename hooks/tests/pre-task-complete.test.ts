/**
 * Pre-Task-Complete Hook Tests
 * Tests context-aware visual validation enforcement
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { preTaskCompleteHook } from '../src/hooks/pre-task-complete.js';
import type { StopInput, StopOutput } from '../src/types.js';
import * as utils from '../src/utils.js';

// Mock the utils module
vi.mock('../src/utils.js', async () => {
  const actual = (await vi.importActual('../src/utils.js')) as typeof utils;
  return {
    ...actual,
    flagExists: vi.fn(),
    archiveFlag: vi.fn(),
  };
});

describe('Pre-Task-Complete Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Context-Aware Behavior', () => {
    it('should approve when no frontend code was written (no visual-validation-needed flag)', async () => {
      // Neither flag exists - no frontend code was written
      vi.mocked(utils.flagExists).mockReturnValue(false);

      const input: StopInput = {};
      const output = await preTaskCompleteHook(input);

      expect(output.decision).toBe('approve');
    });

    it('should block when frontend code was written but validation not done', async () => {
      // visual-validation-needed exists, but validation-completed does not
      vi.mocked(utils.flagExists).mockImplementation((flag: string) => {
        if (flag === 'visual-validation-needed') return true;
        if (flag === 'validation-completed') return false;
        return false;
      });

      const input: StopInput = {};
      const output = await preTaskCompleteHook(input);

      expect(output.decision).toBe('block');
      expect(output.reason?.toLowerCase()).toContain('visual validation');
    });

    it('should approve when frontend code was written AND validation completed', async () => {
      // Both flags exist
      vi.mocked(utils.flagExists).mockReturnValue(true);

      const input: StopInput = {};
      const output = await preTaskCompleteHook(input);

      expect(output.decision).toBe('approve');
    });
  });

  describe('Flag Management', () => {
    it('should archive both flags after successful validation', async () => {
      vi.mocked(utils.flagExists).mockReturnValue(true);

      const input: StopInput = {};
      await preTaskCompleteHook(input);

      expect(utils.archiveFlag).toHaveBeenCalledWith('validation-completed');
      expect(utils.archiveFlag).toHaveBeenCalledWith('visual-validation-needed');
    });

    it('should NOT archive flags when blocking', async () => {
      vi.mocked(utils.flagExists).mockImplementation((flag: string) => {
        if (flag === 'visual-validation-needed') return true;
        if (flag === 'validation-completed') return false;
        return false;
      });

      const input: StopInput = {};
      await preTaskCompleteHook(input);

      expect(utils.archiveFlag).not.toHaveBeenCalled();
    });

    it('should NOT archive flags when validation not needed', async () => {
      vi.mocked(utils.flagExists).mockReturnValue(false);

      const input: StopInput = {};
      await preTaskCompleteHook(input);

      expect(utils.archiveFlag).not.toHaveBeenCalled();
    });
  });

  describe('Output Quality', () => {
    it('should provide clear reason when blocking', async () => {
      vi.mocked(utils.flagExists).mockImplementation((flag: string) => {
        if (flag === 'visual-validation-needed') return true;
        if (flag === 'validation-completed') return false;
        return false;
      });

      const input: StopInput = {};
      const output = await preTaskCompleteHook(input);

      expect(output.reason).toBeDefined();
      expect(output.reason?.toLowerCase()).toContain('validation');
    });
  });

  describe('Edge Cases', () => {
    it('should handle input with reason', async () => {
      vi.mocked(utils.flagExists).mockReturnValue(true);

      const input: StopInput = {
        reason: 'Task completed successfully',
      };

      const output = await preTaskCompleteHook(input);

      expect(output.decision).toBe('approve');
    });

    it('should handle empty input when no validation needed', async () => {
      vi.mocked(utils.flagExists).mockReturnValue(false);

      const input: StopInput = {};
      const output = await preTaskCompleteHook(input);

      expect(output.decision).toBe('approve');
    });
  });
});
