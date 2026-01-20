/**
 * Post-Tool-Use Hook Tests
 * TDD: Write tests first, then implementation
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { postToolUseHook } from '../src/hooks/post-tool-use.js';
import type { PostToolUseInput, PostToolUseOutput } from '../src/types.js';
import * as utils from '../src/utils.js';

// Mock the utils module
vi.mock('../src/utils.js', async () => {
  const actual = (await vi.importActual('../src/utils.js')) as typeof utils;
  return {
    ...actual,
    isScraplingAvailable: vi.fn(),
  };
});

describe('Post-Tool-Use Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Scrapling Preference Enforcement', () => {
    it('should warn when Playwright MCP is used and Scrapling is available', async () => {
      vi.mocked(utils.isScraplingAvailable).mockReturnValue(true);

      const input: PostToolUseInput = {
        tool_name: 'mcp__playwright__browser_navigate',
        tool_input: { url: 'https://example.com' },
      };

      const output = await postToolUseHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain('Scrapling');
    });

    it('should allow Playwright when Scrapling is NOT available', async () => {
      vi.mocked(utils.isScraplingAvailable).mockReturnValue(false);

      const input: PostToolUseInput = {
        tool_name: 'mcp__playwright__browser_navigate',
        tool_input: { url: 'https://example.com' },
      };

      const output = await postToolUseHook(input);

      expect(output.hookSpecificOutput.decision).toBeUndefined();
    });

    it('should allow Scrapling tools without warning', async () => {
      vi.mocked(utils.isScraplingAvailable).mockReturnValue(true);

      const input: PostToolUseInput = {
        tool_name: 'mcp__scrapling__navigate',
        tool_input: { url: 'https://example.com' },
      };

      const output = await postToolUseHook(input);

      expect(output.hookSpecificOutput.additionalContext).toBeUndefined();
    });
  });

  describe('Direct Playwright Blocking', () => {
    it('should block direct Python Playwright usage in Bash', async () => {
      vi.mocked(utils.isScraplingAvailable).mockReturnValue(true);

      const input: PostToolUseInput = {
        tool_name: 'Bash',
        tool_input: {
          command: 'python -c "from playwright.sync_api import sync_playwright"',
        },
      };

      const output = await postToolUseHook(input);

      // Should warn about using MCP instead
      expect(output.hookSpecificOutput.hookEventName).toBe('PostToolUse');
    });
  });

  describe('Non-Browser Tools', () => {
    it('should allow non-browser tools without intervention', async () => {
      vi.mocked(utils.isScraplingAvailable).mockReturnValue(true);

      const input: PostToolUseInput = {
        tool_name: 'Read',
        tool_input: { file_path: '/some/file.ts' },
      };

      const output = await postToolUseHook(input);

      expect(output.hookSpecificOutput.decision).toBeUndefined();
      expect(output.hookSpecificOutput.additionalContext).toBeUndefined();
    });

    it('should allow Bash commands without browser code', async () => {
      vi.mocked(utils.isScraplingAvailable).mockReturnValue(true);

      const input: PostToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'ls -la' },
      };

      const output = await postToolUseHook(input);

      expect(output.hookSpecificOutput.decision).toBeUndefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing tool_name gracefully', async () => {
      vi.mocked(utils.isScraplingAvailable).mockReturnValue(true);

      const input: PostToolUseInput = {
        tool_name: '',
        tool_input: {},
      };

      const output = await postToolUseHook(input);

      expect(output.hookSpecificOutput.hookEventName).toBe('PostToolUse');
    });

    it('should handle missing tool_input', async () => {
      vi.mocked(utils.isScraplingAvailable).mockReturnValue(true);

      const input: PostToolUseInput = {
        tool_name: 'Bash',
        tool_input: {},
      };

      const output = await postToolUseHook(input);

      expect(output.hookSpecificOutput.hookEventName).toBe('PostToolUse');
    });
  });
});
