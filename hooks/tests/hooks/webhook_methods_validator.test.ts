import { describe, it, expect } from 'vitest';
import { webhookMethodsValidatorHook } from '../../src/hooks/webhook_methods_validator.js';
import { PreToolUseInput } from '../../src/types.js';

describe('webhookMethodsValidator', () => {
  it('should warn when webhook has no httpMethod', async () => {
    const input: PreToolUseInput = {
      tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
      tool_input: {
        workflow: {
          name: 'Test Workflow',
          nodes: [
            {
              type: 'n8n-nodes-base.webhook',
              name: 'Webhook',
              parameters: { path: 'api/test' },
            },
          ],
        },
      },
    };

    const result = await webhookMethodsValidatorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('without httpMethod');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('GET');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('POST');
  });

  it('should allow webhook with httpMethod configured', async () => {
    const input: PreToolUseInput = {
      tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
      tool_input: {
        workflow: {
          name: 'Test Workflow',
          nodes: [
            {
              type: 'n8n-nodes-base.webhook',
              name: 'Webhook',
              parameters: {
                path: 'api/test',
                httpMethod: 'POST',
              },
            },
          ],
        },
      },
    };

    const result = await webhookMethodsValidatorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(result.hookSpecificOutput.permissionDecisionReason).toBeUndefined();
  });

  it('should allow webhook with multiple httpMethods', async () => {
    const input: PreToolUseInput = {
      tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
      tool_input: {
        workflow: {
          name: 'Test Workflow',
          nodes: [
            {
              type: 'n8n-nodes-base.webhook',
              name: 'Webhook',
              parameters: {
                path: 'api/test',
                httpMethod: "={{['GET','POST'].join(',')}}",
              },
            },
          ],
        },
      },
    };

    const result = await webhookMethodsValidatorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(result.hookSpecificOutput.permissionDecisionReason).toBeUndefined();
  });

  it('should allow workflow without webhook nodes', async () => {
    const input: PreToolUseInput = {
      tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
      tool_input: {
        workflow: {
          name: 'Test Workflow',
          nodes: [{ type: 'n8n-nodes-base.manualTrigger', name: 'Manual' }],
        },
      },
    };

    const result = await webhookMethodsValidatorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
    expect(result.hookSpecificOutput.permissionDecisionReason).toBeUndefined();
  });

  it('should warn for multiple unconfigured webhooks', async () => {
    const input: PreToolUseInput = {
      tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
      tool_input: {
        workflow: {
          name: 'Test Workflow',
          nodes: [
            {
              type: 'n8n-nodes-base.webhook',
              name: 'Webhook 1',
              parameters: { path: 'api/test1' },
            },
            {
              type: 'n8n-nodes-base.webhook',
              name: 'Webhook 2',
              parameters: { path: 'api/test2' },
            },
          ],
        },
      },
    };

    const result = await webhookMethodsValidatorHook(input);

    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('Webhook 1');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('Webhook 2');
  });

  it('should provide configuration examples', async () => {
    const input: PreToolUseInput = {
      tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
      tool_input: {
        workflow: {
          name: 'Test Workflow',
          nodes: [
            {
              type: 'n8n-nodes-base.webhook',
              name: 'Webhook',
              parameters: {},
            },
          ],
        },
      },
    };

    const result = await webhookMethodsValidatorHook(input);

    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('API endpoints');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('form submissions');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('REST resources');
  });

  it('should allow non-n8n operations', async () => {
    const input: PreToolUseInput = {
      tool_name: 'Write',
      tool_input: {
        file_path: '/path/to/file.ts',
      },
    };

    const result = await webhookMethodsValidatorHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('allow');
  });
});
