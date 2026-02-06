/**
 * Tests for n8n_download_blocker hook
 *
 * Issue: #19, #33
 */

import { describe, it, expect } from 'vitest';
import { n8nDownloadBlockerHook } from '../../src/governance/n8n_download_blocker.js';
import type { PreToolUseInput } from '../../src/types.js';

describe('n8nDownloadBlocker', () => {
  describe('blocking behavior', () => {
    it('should block n8n_get_workflow', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_get_workflow',
        tool_input: { id: '123' },
      };

      const result = await n8nDownloadBlockerHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain('BLOCKED');
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain('Cloud-only');
    });

    it('should provide actionable alternatives in block message', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_get_workflow',
        tool_input: { id: '123' },
      };

      const result = await n8nDownloadBlockerHook(input);

      expect(result.hookSpecificOutput.permissionDecisionReason).toContain('n8n_list_workflows');
      expect(result.hookSpecificOutput.permissionDecisionReason).toContain(
        'n8n_update_partial_workflow'
      );
    });
  });

  describe('escape hatch', () => {
    it('should allow n8n_get_workflow with documentation_only flag', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_get_workflow',
        tool_input: { id: '123', documentation_only: true },
      };

      const result = await n8nDownloadBlockerHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should block when documentation_only is false', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_get_workflow',
        tool_input: { id: '123', documentation_only: false },
      };

      const result = await n8nDownloadBlockerHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('read-only modes', () => {
    it('should allow mode: structure', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_get_workflow',
        tool_input: { id: '123', mode: 'structure' },
      };

      const result = await n8nDownloadBlockerHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow mode: minimal', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_get_workflow',
        tool_input: { id: '123', mode: 'minimal' },
      };

      const result = await n8nDownloadBlockerHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow mode: details', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_get_workflow',
        tool_input: { id: '123', mode: 'details' },
      };

      const result = await n8nDownloadBlockerHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should block mode: full', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_get_workflow',
        tool_input: { id: '123', mode: 'full' },
      };

      const result = await n8nDownloadBlockerHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block when no mode specified (defaults to full)', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_get_workflow',
        tool_input: { id: '123' },
      };

      const result = await n8nDownloadBlockerHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('allowed tools', () => {
    it('should allow n8n_list_workflows', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_list_workflows',
        tool_input: {},
      };

      const result = await n8nDownloadBlockerHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow n8n_update_partial_workflow', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: { id: '123', nodes: [] },
      };

      const result = await n8nDownloadBlockerHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow n8n_update_full_workflow', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_full_workflow',
        tool_input: { id: '123', workflow: {} },
      };

      const result = await n8nDownloadBlockerHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow n8n_create_workflow', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: { name: 'test' },
      };

      const result = await n8nDownloadBlockerHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow unrelated tools', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Read',
        tool_input: { file_path: '/some/file.txt' },
      };

      const result = await n8nDownloadBlockerHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow Write tool', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: { file_path: '/some/file.json', content: '{}' },
      };

      const result = await n8nDownloadBlockerHook(input);

      expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });
});
