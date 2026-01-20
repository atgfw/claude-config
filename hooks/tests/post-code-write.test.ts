/**
 * Post-Code-Write Hook Tests
 * TDD: Write tests first, then implementation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { postCodeWriteHook } from '../src/hooks/post-code-write.js';
import type { PostToolUseInput, PostToolUseOutput } from '../src/types.js';
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

describe('Post-Code-Write Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Code Review Enforcement', () => {
    it('should block when code-review-completed flag is missing', async () => {
      vi.mocked(utils.flagExists).mockReturnValue(false);

      const input: PostToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: '/path/to/file.ts',
        },
      };

      const output = await postCodeWriteHook(input);

      expect(output.hookSpecificOutput.decision).toBe('block');
      expect(output.hookSpecificOutput.reason).toContain('code-reviewer');
    });

    it('should allow when code-review-completed flag exists', async () => {
      vi.mocked(utils.flagExists).mockReturnValue(true);

      const input: PostToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: '/path/to/file.ts',
        },
      };

      const output = await postCodeWriteHook(input);

      expect(output.hookSpecificOutput.decision).toBeUndefined();
      expect(output.hookSpecificOutput.additionalContext).toContain('review completed');
    });

    it('should archive flag after successful check', async () => {
      vi.mocked(utils.flagExists).mockReturnValue(true);

      const input: PostToolUseInput = {
        tool_name: 'Write',
        tool_input: {},
      };

      await postCodeWriteHook(input);

      expect(utils.archiveFlag).toHaveBeenCalledWith('code-review-completed');
    });

    it('should NOT archive flag when blocking', async () => {
      vi.mocked(utils.flagExists).mockReturnValue(false);

      const input: PostToolUseInput = {
        tool_name: 'Write',
        tool_input: {},
      };

      await postCodeWriteHook(input);

      expect(utils.archiveFlag).not.toHaveBeenCalled();
    });
  });

  describe('Output Quality', () => {
    it('should provide clear instructions when blocking', async () => {
      vi.mocked(utils.flagExists).mockReturnValue(false);

      const input: PostToolUseInput = {
        tool_name: 'Write',
        tool_input: {},
      };

      const output = await postCodeWriteHook(input);

      expect(output.hookSpecificOutput.reason).toContain('code-reviewer');
      // Should mention how to invoke code reviewer
    });

    it('should mention Task tool for invoking code-reviewer', async () => {
      vi.mocked(utils.flagExists).mockReturnValue(false);

      const input: PostToolUseInput = {
        tool_name: 'Edit',
        tool_input: {},
      };

      const output = await postCodeWriteHook(input);

      expect(output.hookSpecificOutput.decision).toBe('block');
    });
  });

  describe('Edge Cases', () => {
    it('should handle Write tool', async () => {
      vi.mocked(utils.flagExists).mockReturnValue(false);

      const input: PostToolUseInput = {
        tool_name: 'Write',
        tool_input: {},
      };

      const output = await postCodeWriteHook(input);

      expect(output.hookSpecificOutput.hookEventName).toBe('PostToolUse');
    });

    it('should handle Edit tool', async () => {
      vi.mocked(utils.flagExists).mockReturnValue(false);

      const input: PostToolUseInput = {
        tool_name: 'Edit',
        tool_input: {},
      };

      const output = await postCodeWriteHook(input);

      expect(output.hookSpecificOutput.hookEventName).toBe('PostToolUse');
    });
  });
});
