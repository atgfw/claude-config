/**
 * Pre-Write Hook Tests
 * TDD: Write tests first, then implementation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { preWriteHook } from '../src/hooks/pre_write.js';
import type { PreToolUseInput } from '../src/types.js';
import * as utils from '../src/utils.js';

// Mock the utils module
vi.mock('../src/utils.js', async () => {
  const actual = await vi.importActual('../src/utils.js');
  return {
    ...actual,
    isMorphAvailable: vi.fn(),
    getMcpServerHealth: vi.fn().mockReturnValue('unhealthy'),
  };
});

describe('Pre-Write Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Morph MCP Enforcement', () => {
    it('should block Write when Morph is available', async () => {
      vi.mocked(utils.isMorphAvailable).mockReturnValue(true);

      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: '/path/to/file.ts',
          content: 'console.log("hello");',
        },
      };

      const output = await preWriteHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(output.hookSpecificOutput.permissionDecisionReason).toContain('edit_file');
    });

    it('should allow Write when Morph is NOT available', async () => {
      vi.mocked(utils.isMorphAvailable).mockReturnValue(false);

      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: '/path/to/file.ts',
          content: 'console.log("hello");',
        },
      };

      const output = await preWriteHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should block Edit when Morph is available', async () => {
      vi.mocked(utils.isMorphAvailable).mockReturnValue(true);

      const input: PreToolUseInput = {
        tool_name: 'Edit',
        tool_input: {
          file_path: '/path/to/file.ts',
          old_string: 'foo',
          new_string: 'bar',
        },
      };

      const output = await preWriteHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('Emoji Blocking', () => {
    it('should block content with emoji even when Morph unavailable', async () => {
      vi.mocked(utils.isMorphAvailable).mockReturnValue(false);

      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: '/path/to/file.ts',
          content: 'console.log("\u{1F600}");',
        },
      };

      const output = await preWriteHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(output.hookSpecificOutput.permissionDecisionReason).toContain('Emoji');
    });

    it('should allow content without emoji', async () => {
      vi.mocked(utils.isMorphAvailable).mockReturnValue(false);

      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: '/path/to/file.ts',
          content: 'console.log("Hello World");',
        },
      };

      const output = await preWriteHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Output Quality', () => {
    it('should include file path in denial reason when blocking for Morph', async () => {
      vi.mocked(utils.isMorphAvailable).mockReturnValue(true);

      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: '/path/to/specific/file.ts',
          content: 'code',
        },
      };

      const output = await preWriteHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
      // Should mention Morph/edit_file
      expect(output.hookSpecificOutput.permissionDecisionReason).toMatch(/morph|edit_file/i);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing content', async () => {
      vi.mocked(utils.isMorphAvailable).mockReturnValue(false);

      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {
          file_path: '/path/to/file.ts',
        },
      };

      const output = await preWriteHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should handle empty tool_input', async () => {
      vi.mocked(utils.isMorphAvailable).mockReturnValue(false);

      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: {},
      };

      const output = await preWriteHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });
});
