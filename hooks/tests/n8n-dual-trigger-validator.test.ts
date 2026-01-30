/**
 * Tests for n8n Dual Trigger Validator Hook
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { n8nDualTriggerValidatorHook } from '../src/governance/n8n_dual_trigger_validator.js';
import type { PreToolUseInput } from '../src/types.js';

// Mock console.error to suppress hook logging during tests
beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

function createInput(nodes: unknown[], name?: string): PreToolUseInput {
  return {
    tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
    tool_input: {
      name: name ?? 'Test Workflow',
      nodes,
      connections: {},
    },
  };
}

describe('n8nDualTriggerValidatorHook', () => {
  describe('non-subworkflows (no executeWorkflowTrigger)', () => {
    it('allows workflow with only webhook trigger', async () => {
      const input = createInput([
        { name: 'Webhook', type: 'n8n-nodes-base.webhook', parameters: { path: 'my-api' } },
        { name: 'Set', type: 'n8n-nodes-base.set' },
      ]);

      const result = await n8nDualTriggerValidatorHook(input);

      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });

    it('allows workflow with only manual trigger', async () => {
      const input = createInput([
        { name: 'Manual', type: 'n8n-nodes-base.manualTrigger' },
        { name: 'Set', type: 'n8n-nodes-base.set' },
      ]);

      const result = await n8nDualTriggerValidatorHook(input);

      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });

    it('allows workflow with schedule trigger', async () => {
      const input = createInput([
        { name: 'Schedule', type: 'n8n-nodes-base.scheduleTrigger' },
        { name: 'HTTP', type: 'n8n-nodes-base.httpRequest' },
      ]);

      const result = await n8nDualTriggerValidatorHook(input);

      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });

    it('allows empty workflow', async () => {
      const input = createInput([]);

      const result = await n8nDualTriggerValidatorHook(input);

      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });
  });

  describe('subworkflows with valid dual trigger', () => {
    it('allows subworkflow with executeWorkflowTrigger + webhook with api/ path prefix', async () => {
      const input = createInput(
        [
          { name: 'Start (Subworkflow)', type: 'n8n-nodes-base.executeWorkflowTrigger' },
          {
            name: 'Start (Test)',
            type: 'n8n-nodes-base.webhook',
            parameters: { path: 'api/my-subworkflow' },
          },
          { name: 'Merge', type: 'n8n-nodes-base.merge' },
        ],
        'My Subworkflow'
      );

      const result = await n8nDualTriggerValidatorHook(input);

      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });

    it('allows /api/ path prefix with leading slash', async () => {
      const input = createInput([
        { name: 'Start (Subworkflow)', type: 'n8n-nodes-base.executeWorkflowTrigger' },
        {
          name: 'Start (Test)',
          type: 'n8n-nodes-base.webhook',
          parameters: { path: '/api/my-subworkflow' },
        },
        { name: 'Merge', type: 'n8n-nodes-base.merge' },
      ]);

      const result = await n8nDualTriggerValidatorHook(input);

      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });

    it('allows nested api path', async () => {
      const input = createInput([
        { name: 'Start (Subworkflow)', type: 'n8n-nodes-base.executeWorkflowTrigger' },
        {
          name: 'Start (Test)',
          type: 'n8n-nodes-base.webhook',
          parameters: { path: 'api/integration/my-subworkflow' },
        },
        { name: 'Merge', type: 'n8n-nodes-base.merge' },
      ]);

      const result = await n8nDualTriggerValidatorHook(input);

      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });
  });

  describe('subworkflows missing webhook trigger', () => {
    it('blocks subworkflow with only executeWorkflowTrigger', async () => {
      const input = createInput([
        { name: 'Start (Subworkflow)', type: 'n8n-nodes-base.executeWorkflowTrigger' },
        { name: 'Set', type: 'n8n-nodes-base.set' },
      ]);

      const result = await n8nDualTriggerValidatorHook(input);

      expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput?.permissionDecisionReason).toContain('no webhook trigger');
    });

    it('provides helpful error message', async () => {
      const input = createInput([{ name: 'Start', type: 'n8n-nodes-base.executeWorkflowTrigger' }]);

      const result = await n8nDualTriggerValidatorHook(input);

      expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
      expect(result.hookSpecificOutput?.permissionDecisionReason).toContain('API access');
    });
  });

  describe('subworkflows with valid webhook path (per CLAUDE.md: flat kebab-case, no nesting)', () => {
    it('allows flat kebab-case path', async () => {
      const input = createInput([
        { name: 'Start (Subworkflow)', type: 'n8n-nodes-base.executeWorkflowTrigger' },
        { name: 'Webhook', type: 'n8n-nodes-base.webhook', parameters: { path: 'my-api' } },
        { name: 'Merge', type: 'n8n-nodes-base.merge' },
      ]);

      const result = await n8nDualTriggerValidatorHook(input);

      // Per CLAUDE.md: paths should be flat kebab-case, no nesting
      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });

    it('allows webhook with customer-sync style path', async () => {
      const input = createInput([
        { name: 'Start (Subworkflow)', type: 'n8n-nodes-base.executeWorkflowTrigger' },
        {
          name: 'Webhook',
          type: 'n8n-nodes-base.webhook',
          parameters: { path: 'customer-sync' },
        },
        { name: 'Merge', type: 'n8n-nodes-base.merge' },
      ]);

      const result = await n8nDualTriggerValidatorHook(input);

      // Per CLAUDE.md: flat kebab-case paths are valid
      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });

    it('allows webhook with path when proper dual trigger setup', async () => {
      const input = createInput([
        { name: 'Start (Subworkflow)', type: 'n8n-nodes-base.executeWorkflowTrigger' },
        { name: 'Webhook', type: 'n8n-nodes-base.webhook', parameters: { path: 'job-handler' } },
        { name: 'Merge', type: 'n8n-nodes-base.merge' },
      ]);

      const result = await n8nDualTriggerValidatorHook(input);

      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });
  });

  describe('warnings for missing merge node', () => {
    it('allows but warns when no merge node present', async () => {
      const input = createInput([
        { name: 'Start (Subworkflow)', type: 'n8n-nodes-base.executeWorkflowTrigger' },
        {
          name: 'Start (Test)',
          type: 'n8n-nodes-base.webhook',
          parameters: { path: 'api/my-subworkflow' },
        },
        // No merge node
        { name: 'Set', type: 'n8n-nodes-base.set' },
      ]);

      const result = await n8nDualTriggerValidatorHook(input);

      // Should still allow, merge is recommended not required
      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });
  });

  describe('edge cases', () => {
    it('handles null tool_input', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: null,
      };

      const result = await n8nDualTriggerValidatorHook(input);

      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });

    it('handles missing nodes array', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: { name: 'Test' },
      };

      const result = await n8nDualTriggerValidatorHook(input);

      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });

    it('handles workflow as nested object', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          workflow: {
            name: 'Nested Subworkflow',
            nodes: [{ name: 'Start', type: 'n8n-nodes-base.executeWorkflowTrigger' }],
          },
        },
      };

      const result = await n8nDualTriggerValidatorHook(input);

      expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    });

    it('handles workflow_json as string', async () => {
      const workflow = {
        name: 'JSON Subworkflow',
        nodes: [
          { name: 'Start', type: 'n8n-nodes-base.executeWorkflowTrigger' },
          {
            name: 'Test',
            type: 'n8n-nodes-base.webhook',
            parameters: { path: 'api/json-workflow' },
          },
          { name: 'Merge', type: 'n8n-nodes-base.merge' },
        ],
      };

      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          workflow_json: JSON.stringify(workflow),
        },
      };

      const result = await n8nDualTriggerValidatorHook(input);

      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });

    it('handles invalid workflow_json gracefully', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          workflow_json: 'not valid json {{{',
        },
      };

      const result = await n8nDualTriggerValidatorHook(input);

      expect(result.hookSpecificOutput?.permissionDecision).toBe('allow');
    });

    it('handles update_workflow tool', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_workflow',
        tool_input: {
          nodes: [{ name: 'Start', type: 'n8n-nodes-base.executeWorkflowTrigger' }],
        },
      };

      const result = await n8nDualTriggerValidatorHook(input);

      expect(result.hookSpecificOutput?.permissionDecision).toBe('deny');
    });
  });
});
