/**
 * Session Start Summary Loading Tests
 * Tests for Step 0: Loading previous conversation summaries
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { sessionStartHook } from '../src/hooks/session_start.js';
import type { SessionStartInput } from '../src/types.js';
import * as fs from 'node:fs';
import * as childProcess from 'node:child_process';
import * as utils from '../src/utils.js';

// Mock modules
vi.mock('node:fs');
vi.mock('node:child_process');
vi.mock('../src/utils.js', async () => {
  const actual = (await vi.importActual('../src/utils.js')) as typeof utils;
  return {
    ...actual,
    loadEnv: vi.fn(),
    hasApiKey: vi.fn().mockReturnValue(true),
    getClaudeDir: vi.fn(() => '/mock/.claude'),
    getEnvPath: vi.fn(() => '/mock/.claude/.env'),
    markSessionValidated: vi.fn(),
  };
});

// Mock process.cwd for testing
const originalCwd = process.cwd;

describe('Session Start - Conversation Summary Loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    // Default mocks
    vi.mocked(fs.existsSync).mockReturnValue(true);
    vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
    vi.mocked(fs.readdirSync).mockReturnValue([]);
    vi.mocked(childProcess.execSync).mockReturnValue(Buffer.from(''));

    // Mock cwd
    process.cwd = vi.fn(() => '/test/project');
  });

  afterEach(() => {
    vi.restoreAllMocks();
    process.cwd = originalCwd;
  });

  describe('Step 0: Load Conversation Summary', () => {
    it('should skip when conversation_history directory does not exist', async () => {
      vi.mocked(fs.existsSync).mockImplementation((path) => {
        if (String(path).includes('conversation_history')) return false;
        return true;
      });

      const input: SessionStartInput = {};
      const output = await sessionStartHook(input);

      expect(output.hookEventName).toBe('SessionStart');
      // Should not contain previous conversation context
      expect(output.additionalContext).not.toContain('PREVIOUS CONVERSATION CONTEXT');
    });

    it('should skip when no .md files in conversation_history', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockImplementation((path) => {
        if (String(path).includes('conversation_history')) {
          return [] as string[];
        }
        return [];
      });

      const input: SessionStartInput = {};
      const output = await sessionStartHook(input);

      expect(output.additionalContext).not.toContain('PREVIOUS CONVERSATION CONTEXT');
    });

    it('should load the most recent summary file', async () => {
      const summaryContent = `# Conversation Summary

**Project**: test-project
**Date**: 2026-01-15

## Executive Summary
Test summary content.`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockImplementation((path) => {
        if (String(path).includes('conversation_history')) {
          return [
            'test-project_2026-01-14.md',
            'test-project_2026-01-15.md',
          ] as unknown as fs.Dirent[];
        }
        if (String(path).includes('agents')) {
          return [];
        }
        return [];
      });
      vi.mocked(fs.statSync).mockImplementation((path) => {
        const pathStr = String(path);
        if (pathStr.includes('2026-01-15')) {
          return { mtime: new Date('2026-01-15T12:00:00Z') } as fs.Stats;
        }
        if (pathStr.includes('2026-01-14')) {
          return { mtime: new Date('2026-01-14T12:00:00Z') } as fs.Stats;
        }
        return { mtime: new Date() } as fs.Stats;
      });
      vi.mocked(fs.readFileSync).mockImplementation((path) => {
        if (String(path).includes('2026-01-15.md')) {
          return summaryContent;
        }
        return '';
      });

      const input: SessionStartInput = {};
      const output = await sessionStartHook(input);

      expect(output.additionalContext).toContain('PREVIOUS CONVERSATION CONTEXT');
      expect(output.additionalContext).toContain('Test summary content');
    });

    it('should skip files that do not contain "# Conversation Summary"', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockImplementation((path) => {
        if (String(path).includes('conversation_history')) {
          return ['notes.md'] as unknown as fs.Dirent[];
        }
        return [];
      });
      vi.mocked(fs.statSync).mockReturnValue({ mtime: new Date() } as fs.Stats);
      vi.mocked(fs.readFileSync).mockReturnValue('Just some random notes');

      const input: SessionStartInput = {};
      const output = await sessionStartHook(input);

      expect(output.additionalContext).not.toContain('PREVIOUS CONVERSATION CONTEXT');
    });

    it('should handle file read errors gracefully', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockImplementation((path) => {
        if (String(path).includes('conversation_history')) {
          return ['summary.md'] as unknown as fs.Dirent[];
        }
        return [];
      });
      vi.mocked(fs.statSync).mockReturnValue({ mtime: new Date() } as fs.Stats);
      vi.mocked(fs.readFileSync).mockImplementation((path) => {
        if (String(path).includes('summary.md')) {
          throw new Error('Permission denied');
        }
        return '';
      });

      const input: SessionStartInput = {};
      const output = await sessionStartHook(input);

      // Should not crash, should continue with other steps
      expect(output.hookEventName).toBe('SessionStart');
    });

    it('should include source file reference in injected context', async () => {
      const summaryContent = `# Conversation Summary

## Executive Summary
Test content.`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockImplementation((path) => {
        if (String(path).includes('conversation_history')) {
          return ['test_2026-01-15.md'] as unknown as fs.Dirent[];
        }
        return [];
      });
      vi.mocked(fs.statSync).mockReturnValue({ mtime: new Date() } as fs.Stats);
      vi.mocked(fs.readFileSync).mockImplementation((path) => {
        if (String(path).includes('.md') && String(path).includes('conversation_history')) {
          return summaryContent;
        }
        return '';
      });

      const input: SessionStartInput = {};
      const output = await sessionStartHook(input);

      expect(output.additionalContext).toContain('conversation_history/test_2026-01-15.md');
    });

    it('should combine summary with status information', async () => {
      const summaryContent = `# Conversation Summary

## Executive Summary
Previous work content.`;

      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockImplementation((path) => {
        if (String(path).includes('conversation_history')) {
          return ['test_2026-01-15.md'] as unknown as fs.Dirent[];
        }
        return [];
      });
      vi.mocked(fs.statSync).mockReturnValue({ mtime: new Date() } as fs.Stats);
      vi.mocked(fs.readFileSync).mockImplementation((path) => {
        if (String(path).includes('.md') && String(path).includes('conversation_history')) {
          return summaryContent;
        }
        return '';
      });

      const input: SessionStartInput = {};
      const output = await sessionStartHook(input);

      // Should contain both status summary and previous context
      expect(output.additionalContext).toContain('Successes:');
      expect(output.additionalContext).toContain('PREVIOUS CONVERSATION CONTEXT');
    });
  });
});
