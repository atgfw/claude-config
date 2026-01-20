import { describe, it, expect } from 'vitest';
import { evaluationGateExpanderHook } from '../../src/hooks/evaluation_gate_expander.js';
import { PreToolUseInput } from '../../src/types.js';

describe('evaluationGateExpander', () => {
  it('should block workflow leaving DEV without evaluation trigger', async () => {
    const input: PreToolUseInput = {
      tool_name: 'mcp__n8n-mcp__n8n_update_workflow',
      tool_input: {
        workflow: {
          name: 'Test Workflow',
          tags: ['PROD'], // Removing DEV tag
          nodes: [{ type: 'n8n-nodes-base.manualTrigger', name: 'Start' }],
        },
      },
    };

    const result = await evaluationGateExpanderHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('evaluation setup');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('98%');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('20+');
  });

  it('should allow workflow leaving DEV with evaluation trigger', async () => {
    const input: PreToolUseInput = {
      tool_name: 'mcp__n8n-mcp__n8n_update_workflow',
      tool_input: {
        workflow: {
          name: 'Test Workflow',
          tags: ['PROD'],
          nodes: [
            { type: 'n8n-nodes-base.evaluationTrigger', name: 'Eval Trigger' },
            { type: 'n8n-nodes-base.manualTrigger', name: 'Start' },
          ],
        },
      },
    };

    const result = await evaluationGateExpanderHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('98%');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('20+');
  });

  it('should allow workflow staying in DEV', async () => {
    const input: PreToolUseInput = {
      tool_name: 'mcp__n8n-mcp__n8n_update_workflow',
      tool_input: {
        workflow: {
          name: 'Test Workflow',
          tags: ['DEV'], // Still in DEV
          nodes: [{ type: 'n8n-nodes-base.manualTrigger', name: 'Start' }],
        },
      },
    };

    const result = await evaluationGateExpanderHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(result.hookSpecificOutput.permissionDecisionReason).toBeUndefined();
  });

  it('should allow workflow with [DEV] tag format', async () => {
    const input: PreToolUseInput = {
      tool_name: 'mcp__n8n-mcp__n8n_update_workflow',
      tool_input: {
        workflow: {
          name: 'Test Workflow',
          tags: [{ name: '[DEV]' }],
          nodes: [{ type: 'n8n-nodes-base.manualTrigger', name: 'Start' }],
        },
      },
    };

    const result = await evaluationGateExpanderHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('should provide evaluation setup instructions', async () => {
    const input: PreToolUseInput = {
      tool_name: 'mcp__n8n-mcp__n8n_update_workflow',
      tool_input: {
        workflow: {
          name: 'Test Workflow',
          tags: [],
          nodes: [{ type: 'n8n-nodes-base.manualTrigger', name: 'Start' }],
        },
      },
    };

    const result = await evaluationGateExpanderHook(input);

    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('Evaluation Trigger node');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('Data Table');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('Google Sheet');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('n8n UI');
  });

  it('should allow non-update operations', async () => {
    const input: PreToolUseInput = {
      tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
      tool_input: {
        workflow: {
          name: 'Test Workflow',
          tags: ['PROD'],
          nodes: [],
        },
      },
    };

    const result = await evaluationGateExpanderHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });

  it('should allow non-n8n operations', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/path/to/file.ts',
      },
    };

    const result = await evaluationGateExpanderHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });
});
