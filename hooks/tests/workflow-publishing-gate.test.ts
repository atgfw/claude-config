/**
 * Workflow Publishing Gate Hook Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { workflowPublishingGateHook } from '../src/hooks/workflow_publishing_gate.js';
import type { PreToolUseInput } from '../src/types.js';

describe('Workflow Publishing Gate Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('[DEV] workflow detection', () => {
    it('should block webhook trigger on [DEV] workflow', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_trigger_webhook_workflow',
        tool_input: {
          workflow_id: 'test123',
          tags: ['[DEV]', 'automation'],
        },
      };

      const output = await workflowPublishingGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(output.hookSpecificOutput.permissionDecisionReason).toContain('must be published');
    });

    it('should block webhook trigger on dev tagged workflow', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_trigger_webhook_workflow',
        tool_input: {
          workflow_id: 'test123',
          tags: ['dev', 'testing'],
        },
      };

      const output = await workflowPublishingGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block case-insensitive [dev] tag', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_trigger_webhook_workflow',
        tool_input: {
          workflow_id: 'test123',
          tags: ['[dev]'],
        },
      };

      const output = await workflowPublishingGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('Published workflow (allowed)', () => {
    it('should allow webhook trigger on published workflow', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_trigger_webhook_workflow',
        tool_input: {
          workflow_id: 'test123',
          tags: ['production', 'automation'],
        },
      };

      const output = await workflowPublishingGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow workflow with no tags', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_trigger_webhook_workflow',
        tool_input: {
          workflow_id: 'test123',
          tags: [],
        },
      };

      const output = await workflowPublishingGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow workflow with ALPHA tag', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_trigger_webhook_workflow',
        tool_input: {
          workflow_id: 'test123',
          tags: ['ALPHA'],
        },
      };

      const output = await workflowPublishingGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow workflow with BETA tag', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_trigger_webhook_workflow',
        tool_input: {
          workflow_id: 'test123',
          tags: ['BETA'],
        },
      };

      const output = await workflowPublishingGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow workflow with GA tag', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_trigger_webhook_workflow',
        tool_input: {
          workflow_id: 'test123',
          tags: ['GA'],
        },
      };

      const output = await workflowPublishingGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Tool name variations', () => {
    it('should detect n8n webhook in tool name', async () => {
      const input: PreToolUseInput = {
        tool_name: 'n8n_webhook_trigger',
        tool_input: {
          workflow_id: 'test123',
          tags: ['[DEV]'],
        },
      };

      const output = await workflowPublishingGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should detect case-insensitive N8N WEBHOOK', async () => {
      const input: PreToolUseInput = {
        tool_name: 'N8N_WEBHOOK_WORKFLOW',
        tool_input: {
          workflow_id: 'test123',
          tags: ['[DEV]'],
        },
      };

      const output = await workflowPublishingGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('Non-webhook tools (ignored)', () => {
    it('should allow non-webhook n8n operations', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_list_workflows',
        tool_input: {},
      };

      const output = await workflowPublishingGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow non-n8n tools', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'echo test' },
      };

      const output = await workflowPublishingGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow Write tool', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: { file_path: '/test.txt', content: 'test' },
      };

      const output = await workflowPublishingGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Workflow ID variations', () => {
    it('should extract workflow_id', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_trigger_webhook_workflow',
        tool_input: {
          workflow_id: 'abc123',
          tags: ['production'],
        },
      };

      const output = await workflowPublishingGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should extract workflowId (camelCase)', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_trigger_webhook_workflow',
        tool_input: {
          workflowId: 'abc123',
          tags: ['production'],
        },
      };

      const output = await workflowPublishingGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should extract id field', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_trigger_webhook_workflow',
        tool_input: {
          id: 'abc123',
          tags: ['production'],
        },
      };

      const output = await workflowPublishingGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Edge cases', () => {
    it('should allow when tags field missing', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_trigger_webhook_workflow',
        tool_input: {
          workflow_id: 'test123',
        },
      };

      const output = await workflowPublishingGateHook(input);

      // Default to allow if no tag info (avoid false positives)
      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow when tool_input missing', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_trigger_webhook_workflow',
        tool_input: {},
      };

      const output = await workflowPublishingGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should handle non-array tags gracefully', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_trigger_webhook_workflow',
        tool_input: {
          workflow_id: 'test123',
          tags: 'not-an-array',
        },
      };

      const output = await workflowPublishingGateHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });
});
