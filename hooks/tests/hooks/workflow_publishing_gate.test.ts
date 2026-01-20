import { describe, it, expect } from 'vitest';
import { workflowPublishingGateHook } from '../../src/hooks/workflow_publishing_gate.js';
import { PreToolUseInput } from '../../src/types.js';

describe('workflowPublishingGate', () => {
  it('should block unpublished workflow with webhook trigger', async () => {
    const input: PreToolUseInput = {
      tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
      tool_input: {
        workflow: {
          name: 'Test Workflow',
          tags: ['DEV'],
          nodes: [{ type: 'n8n-nodes-base.webhook', name: 'Webhook' }],
        },
      },
    };

    const result = await workflowPublishingGateHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('[DEV]');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('Publish');
  });

  it('should block workflow with [DEV] tag format', async () => {
    const input: PreToolUseInput = {
      tool_name: 'mcp__n8n-mcp__n8n_update_workflow',
      tool_input: {
        workflow: {
          name: 'Test Workflow',
          tags: [{ name: '[DEV]' }],
          nodes: [{ type: 'n8n-nodes-base.webhook', name: 'Webhook' }],
        },
      },
    };

    const result = await workflowPublishingGateHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
  });

  it('should allow published workflow with webhook trigger', async () => {
    const input: PreToolUseInput = {
      tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
      tool_input: {
        workflow: {
          name: 'Test Workflow',
          tags: ['PROD'],
          nodes: [{ type: 'n8n-nodes-base.webhook', name: 'Webhook' }],
        },
      },
    };

    const result = await workflowPublishingGateHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('should allow workflow without tags (published)', async () => {
    const input: PreToolUseInput = {
      tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
      tool_input: {
        workflow: {
          name: 'Test Workflow',
          tags: [],
          nodes: [{ type: 'n8n-nodes-base.webhook', name: 'Webhook' }],
        },
      },
    };

    const result = await workflowPublishingGateHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('should allow unpublished workflow without webhook trigger', async () => {
    const input: PreToolUseInput = {
      tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
      tool_input: {
        workflow: {
          name: 'Test Workflow',
          tags: ['DEV'],
          nodes: [{ type: 'n8n-nodes-base.manualTrigger', name: 'Manual' }],
        },
      },
    };

    const result = await workflowPublishingGateHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('should provide publishing instructions', async () => {
    const input: PreToolUseInput = {
      tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
      tool_input: {
        workflow: {
          name: 'Test Workflow',
          tags: ['DEV'],
          nodes: [{ type: 'n8n-nodes-base.webhook' }],
        },
      },
    };

    const result = await workflowPublishingGateHook(input);

    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('Save workflow');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('Click "Publish"');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('production path');
  });

  it('should allow non-n8n operations', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/path/to/file.ts',
      },
    };

    const result = await workflowPublishingGateHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });
});
