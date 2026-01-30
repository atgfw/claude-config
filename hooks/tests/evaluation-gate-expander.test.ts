/**
 * Evaluation Gate Expander Hook Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { evaluationGateExpanderHook } from '../src/hooks/evaluation_gate_expander.js';
import type { PreToolUseInput } from '../src/types.js';

describe('Evaluation Gate Expander Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Removing [DEV] tag (blocked)', () => {
    it('should block removing [DEV] tag', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {
          id: 'workflow123',
          operations: [
            {
              type: 'removeTag',
              tagId: 'DEV-tag-123', // Tag ID containing 'dev'
            },
          ],
        },
      };

      const output = await evaluationGateExpanderHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(output.hookSpecificOutput.permissionDecisionReason).toContain('evaluation');
    });

    it('should block removing dev tag (case insensitive)', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {
          id: 'workflow123',
          operations: [
            {
              type: 'removeTag',
              tagId: 'dev-tag-123',
            },
          ],
        },
      };

      const output = await evaluationGateExpanderHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('Archival (allowed)', () => {
    it('should allow removing [DEV] when adding [ARCHIVE] simultaneously', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {
          id: 'workflow123',
          operations: [
            {
              type: 'removeTag',
              tagId: 'DEV-tag-123', // Tag ID containing 'dev'
            },
            {
              type: 'addTag',
              tagId: 'archive-tag-456', // Tag ID containing 'archive'
            },
          ],
        },
      };

      const output = await evaluationGateExpanderHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
      expect(output.hookSpecificOutput.permissionDecisionReason).toContain('Archival');
    });

    it('should detect archive tag case-insensitively', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {
          id: 'workflow123',
          operations: [
            {
              type: 'removeTag',
              tagId: 'dev-tag',
            },
            {
              type: 'addTag',
              tagId: 'ARCHIVE',
            },
          ],
        },
      };

      const output = await evaluationGateExpanderHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Non-DEV tag operations (allowed)', () => {
    it('should allow adding tags', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {
          id: 'workflow123',
          operations: [
            {
              type: 'addTag',
              tagId: 'some-tag',
            },
          ],
        },
      };

      const output = await evaluationGateExpanderHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow removing non-DEV tags', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {
          id: 'workflow123',
          operations: [
            {
              type: 'removeTag',
              tagId: 'production-tag',
            },
          ],
        },
      };

      const output = await evaluationGateExpanderHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow updates without tag operations', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {
          id: 'workflow123',
          operations: [
            {
              type: 'updateName',
              value: 'New Name',
            },
          ],
        },
      };

      const output = await evaluationGateExpanderHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Tool name variations', () => {
    it('should detect n8n update operations', async () => {
      const input: PreToolUseInput = {
        tool_name: 'n8n_update_workflow',
        tool_input: {
          id: 'workflow123',
          operations: [
            {
              type: 'removeTag',
              tagId: 'dev-tag',
            },
          ],
        },
      };

      const output = await evaluationGateExpanderHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should detect case-insensitive N8N UPDATE', async () => {
      const input: PreToolUseInput = {
        tool_name: 'MCP__N8N_MCP__N8N_UPDATE_PARTIAL_WORKFLOW',
        tool_input: {
          id: 'workflow123',
          operations: [
            {
              type: 'removeTag',
              tagId: 'dev-tag',
            },
          ],
        },
      };

      const output = await evaluationGateExpanderHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('Non-n8n tools (ignored)', () => {
    it('should allow non-n8n operations', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'echo test' },
      };

      const output = await evaluationGateExpanderHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow Write tool', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: { file_path: '/test.txt', content: 'test' },
      };

      const output = await evaluationGateExpanderHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow n8n list operations', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_list_workflows',
        tool_input: {},
      };

      const output = await evaluationGateExpanderHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Workflow ID extraction', () => {
    it('should extract id field', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {
          id: 'abc123',
          operations: [
            {
              type: 'removeTag',
              tagId: 'dev',
            },
          ],
        },
      };

      const output = await evaluationGateExpanderHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should extract workflow_id field', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {
          workflow_id: 'abc123',
          operations: [
            {
              type: 'removeTag',
              tagId: 'dev',
            },
          ],
        },
      };

      const output = await evaluationGateExpanderHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('Edge cases', () => {
    it('should allow when operations field missing', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {
          id: 'workflow123',
        },
      };

      const output = await evaluationGateExpanderHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow when operations is not an array', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {
          id: 'workflow123',
          operations: 'not-an-array',
        },
      };

      const output = await evaluationGateExpanderHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow when tool_input missing', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {},
      };

      const output = await evaluationGateExpanderHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should handle malformed operation objects', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {
          id: 'workflow123',
          operations: [null, undefined, 'string', { type: 'removeTag' }],
        },
      };

      const output = await evaluationGateExpanderHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });
});
