/**
 * Context Summary Trigger Tests
 * TDD: Tests for the conversation summary system
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  extractProjectName,
  generateSummaryFilename,
  getSummaryFilePath,
  generateSummaryInstructions,
  contextSummaryTrigger,
} from '../src/hooks/context-summary-trigger.js';
import type { UserPromptSubmitInput } from '../src/types.js';

// Mock modules
vi.mock('fs');
vi.mock('../src/utils.js', async () => {
  const actual = await vi.importActual('../src/utils.js');
  return {
    ...actual,
    log: vi.fn(),
    getClaudeDir: vi.fn(() => '/mock/.claude'),
  };
});

describe('Context Summary Trigger', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-16T12:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  describe('extractProjectName', () => {
    it('should extract project name from simple path', () => {
      expect(extractProjectName('/home/user/my-project')).toBe('my-project');
    });

    it('should extract project name from Windows path', () => {
      expect(extractProjectName('C:\\Users\\codya\\my-app')).toBe('my-app');
    });

    it('should sanitize special characters', () => {
      expect(extractProjectName('/home/user/My Project!')).toBe('my-project-');
    });

    it('should handle spaces by replacing with hyphens', () => {
      expect(extractProjectName('/home/user/My Cool Project')).toBe('my-cool-project');
    });

    it('should convert to lowercase', () => {
      expect(extractProjectName('/home/user/MyProject')).toBe('myproject');
    });

    it('should preserve valid characters', () => {
      expect(extractProjectName('/home/user/my_project-123')).toBe('my_project-123');
    });
  });

  describe('generateSummaryFilename', () => {
    it('should generate filename with project name, summary, date and time', () => {
      vi.setSystemTime(new Date('2026-01-16T12:00:00'));
      const filename = generateSummaryFilename('/home/user/my-project');
      expect(filename).toBe('my-project_summary_2026-01-16-12-00.md');
    });

    it('should use current date and time', () => {
      vi.setSystemTime(new Date('2026-03-25T15:30:00'));
      const filename = generateSummaryFilename('/home/user/test');
      expect(filename).toBe('test_summary_2026-03-25-15-30.md');
    });

    it('should pad single digit hours and minutes', () => {
      vi.setSystemTime(new Date('2026-01-16T09:05:00'));
      const filename = generateSummaryFilename('/home/user/test');
      expect(filename).toBe('test_summary_2026-01-16-09-05.md');
    });
  });

  describe('getSummaryFilePath', () => {
    it('should return full path to summary file', () => {
      vi.setSystemTime(new Date('2026-01-16T12:00:00'));
      const fullPath = getSummaryFilePath('/home/user/my-project');
      expect(fullPath).toBe(
        path.join(
          '/home/user/my-project',
          'conversation_history',
          'my-project_summary_2026-01-16-12-00.md'
        )
      );
    });
  });

  describe('generateSummaryInstructions', () => {
    it('should include context percentage', () => {
      const instructions = generateSummaryInstructions('/home/user/test', 45);
      expect(instructions).toContain('45%');
    });

    it('should include directory path', () => {
      const instructions = generateSummaryInstructions('/home/user/test', 45);
      expect(instructions).toContain('conversation_history');
    });

    it('should include filename', () => {
      vi.setSystemTime(new Date('2026-01-16T12:00:00'));
      const instructions = generateSummaryInstructions('/home/user/test', 45);
      expect(instructions).toContain('test_summary_2026-01-16-12-00.md');
    });

    it('should include summary template sections', () => {
      const instructions = generateSummaryInstructions('/home/user/test', 45);
      expect(instructions).toContain('# Session Summary');
      expect(instructions).toContain('## What We Did');
      expect(instructions).toContain('## Key Decisions');
      expect(instructions).toContain('## Files Changed');
      expect(instructions).toContain('## Current State');
      expect(instructions).toContain('## Next Steps');
      expect(instructions).toContain('## Resume Command');
    });

    it('should include clear instructions', () => {
      const instructions = generateSummaryInstructions('/home/user/test', 45);
      expect(instructions).toContain('/clear');
      expect(instructions).toContain('### Step 1');
      expect(instructions).toContain('### Step 2');
      expect(instructions).toContain('### Step 3');
    });
  });

  describe('contextSummaryTrigger hook', () => {
    it('should return empty output when no alert file exists', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const input: UserPromptSubmitInput = { prompt: 'test' };
      const output = await contextSummaryTrigger(input);

      expect(output.hookEventName).toBe('UserPromptSubmit');
      expect(output.additionalContext).toBeUndefined();
    });

    it('should return empty output when alert is not summary type', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          pct: 90,
          session: 'test-session',
          cwd: '/test/project',
          ts: Date.now(),
          type: 'compact', // Not 'summary'
        })
      );

      const input: UserPromptSubmitInput = { prompt: 'test' };
      const output = await contextSummaryTrigger(input);

      expect(output.additionalContext).toBeUndefined();
    });

    it('should return empty output when alert is too old', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          pct: 45,
          session: 'test-session',
          cwd: '/test/project',
          ts: Date.now() - 120_000, // 2 minutes ago
          type: 'summary',
        })
      );

      const input: UserPromptSubmitInput = { prompt: 'test' };
      const output = await contextSummaryTrigger(input);

      expect(output.additionalContext).toBeUndefined();
    });

    it('should return instructions when alert is valid and recent', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          pct: 45,
          session: 'test-session',
          cwd: '/test/project',
          ts: Date.now() - 30_000, // 30 seconds ago
          type: 'summary',
        })
      );

      const input: UserPromptSubmitInput = { prompt: 'test' };
      const output = await contextSummaryTrigger(input);

      expect(output.hookEventName).toBe('UserPromptSubmit');
      expect(output.additionalContext).toContain('CONTEXT LIMIT REACHED');
      expect(output.additionalContext).toContain('45%');
    });

    it('should handle missing cwd gracefully', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          pct: 45,
          session: 'test-session',
          // Cwd missing
          ts: Date.now(),
          type: 'summary',
        })
      );

      const input: UserPromptSubmitInput = { prompt: 'test' };
      const output = await contextSummaryTrigger(input);

      expect(output.additionalContext).toBeUndefined();
    });

    it('should handle JSON parse errors gracefully', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readFileSync).mockReturnValue('invalid json');

      const input: UserPromptSubmitInput = { prompt: 'test' };
      const output = await contextSummaryTrigger(input);

      expect(output.hookEventName).toBe('UserPromptSubmit');
      expect(output.additionalContext).toBeUndefined();
    });
  });
});
