/**
 * Tests for n8n_post_update_cleanup hook
 *
 * Issue: #19, #33
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Mock fs module before importing the hook
vi.mock('node:fs', async () => {
  const actual = await vi.importActual<typeof import('node:fs')>('node:fs');
  return {
    ...actual,
    existsSync: vi.fn(),
    readdirSync: vi.fn(),
    readFileSync: vi.fn(),
    renameSync: vi.fn(),
    mkdirSync: vi.fn(),
  };
});

import { n8nPostUpdateCleanupHook } from '../../src/hooks/n8n_post_update_cleanup.js';
import type { PostToolUseInput } from '../../src/types.js';

describe('n8nPostUpdateCleanup', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('tool filtering', () => {
    it('should skip non-n8n tools', async () => {
      const input: PostToolUseInput = {
        tool_name: 'Write',
        tool_input: { file_path: '/some/file.json' },
        tool_output: 'success',
      };

      const result = await n8nPostUpdateCleanupHook(input);

      expect(result.hookSpecificOutput.hookEventName).toBe('PostToolUse');
      expect(result.hookSpecificOutput.additionalContext).toBeUndefined();
      expect(fs.renameSync).not.toHaveBeenCalled();
    });

    it('should skip Read tool', async () => {
      const input: PostToolUseInput = {
        tool_name: 'Read',
        tool_input: { file_path: '/some/file.json' },
        tool_output: '{}',
      };

      const result = await n8nPostUpdateCleanupHook(input);

      expect(result.hookSpecificOutput.additionalContext).toBeUndefined();
    });
  });

  describe('error preservation', () => {
    it('should preserve files on failed operation (error in string)', async () => {
      const input: PostToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_full_workflow',
        tool_input: { id: '123' },
        tool_output: 'Error: Workflow not found',
      };

      const result = await n8nPostUpdateCleanupHook(input);

      expect(result.hookSpecificOutput.additionalContext).toBeUndefined();
      expect(fs.renameSync).not.toHaveBeenCalled();
    });

    it('should preserve files on failed operation (error object)', async () => {
      const input: PostToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_full_workflow',
        tool_input: { id: '123' },
        tool_output: { error: 'Workflow not found' },
      };

      const result = await n8nPostUpdateCleanupHook(input);

      expect(result.hookSpecificOutput.additionalContext).toBeUndefined();
      expect(fs.renameSync).not.toHaveBeenCalled();
    });

    it('should preserve files when no output', async () => {
      const input: PostToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_full_workflow',
        tool_input: { id: '123' },
        tool_output: undefined,
      };

      const result = await n8nPostUpdateCleanupHook(input);

      expect(result.hookSpecificOutput.additionalContext).toBeUndefined();
    });
  });

  describe('success detection', () => {
    it('should detect success from object response with id', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const input: PostToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: { name: 'test' },
        tool_output: { id: '456', name: 'test' },
      };

      const result = await n8nPostUpdateCleanupHook(input);

      // Should process (no files to clean, but didn't skip due to error)
      expect(result.hookSpecificOutput.hookEventName).toBe('PostToolUse');
    });

    it('should detect success from string with success keyword', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(false);

      const input: PostToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: { id: '123' },
        tool_output: 'Workflow updated successfully',
      };

      const result = await n8nPostUpdateCleanupHook(input);

      expect(result.hookSpecificOutput.hookEventName).toBe('PostToolUse');
    });
  });

  describe('cleanup behavior', () => {
    it('should archive temp workflow files on success', async () => {
      // Mock temp directory exists with workflow file
      vi.mocked(fs.existsSync).mockImplementation((p) => {
        const pathStr = String(p);
        return pathStr.includes('temp') || pathStr.includes('old');
      });
      vi.mocked(fs.readdirSync).mockReturnValue(['workflow.json'] as unknown as fs.Dirent[]);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          nodes: [{ name: 'test' }],
          connections: {},
        })
      );

      const input: PostToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_full_workflow',
        tool_input: { id: '123' },
        tool_output: { id: '123', success: true },
      };

      const result = await n8nPostUpdateCleanupHook(input);

      expect(result.hookSpecificOutput.additionalContext).toContain('archived');
    });

    it('should not archive non-workflow JSON files', async () => {
      vi.mocked(fs.existsSync).mockReturnValue(true);
      vi.mocked(fs.readdirSync).mockReturnValue(['config.json'] as unknown as fs.Dirent[]);
      vi.mocked(fs.readFileSync).mockReturnValue(
        JSON.stringify({
          name: 'config',
          settings: {},
        })
      );

      const input: PostToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_full_workflow',
        tool_input: { id: '123' },
        tool_output: { id: '123' },
      };

      const result = await n8nPostUpdateCleanupHook(input);

      // No workflow files to archive
      expect(result.hookSpecificOutput.additionalContext).toBeUndefined();
    });
  });

  describe('trigger tools', () => {
    const triggerTools = [
      'mcp__n8n-mcp__n8n_update_full_workflow',
      'mcp__n8n-mcp__n8n_update_partial_workflow',
      'mcp__n8n-mcp__n8n_create_workflow',
    ];

    for (const tool of triggerTools) {
      it(`should trigger on ${tool}`, async () => {
        vi.mocked(fs.existsSync).mockReturnValue(false);

        const input: PostToolUseInput = {
          tool_name: tool,
          tool_input: { id: '123' },
          tool_output: { id: '123' },
        };

        const result = await n8nPostUpdateCleanupHook(input);

        // Should process (even if no files to clean)
        expect(result.hookSpecificOutput.hookEventName).toBe('PostToolUse');
      });
    }
  });
});
