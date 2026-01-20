/**
 * Webhook Methods Validator Hook Tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { webhookMethodsValidatorHook } from '../src/hooks/webhook_methods_validator.js';
import type { PreToolUseInput } from '../src/types.js';

describe('Webhook Methods Validator Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Webhook nodes with httpMethod (allowed)', () => {
    it('should allow webhook with httpMethod configured', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          workflow: {
            nodes: [
              {
                name: 'Start (API Webhook)',
                type: 'n8n-nodes-base.webhook',
                parameters: {
                  path: 'api/test',
                  httpMethod: "={{['GET','POST'].join(',')}}",
                  responseMode: 'lastNode',
                },
              },
            ],
          },
        },
      };

      const output = await webhookMethodsValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow webhook with single HTTP method', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          workflow: {
            nodes: [
              {
                name: 'Webhook',
                type: 'n8n-nodes-base.webhook',
                parameters: {
                  path: 'api/test',
                  httpMethod: 'POST',
                },
              },
            ],
          },
        },
      };

      const output = await webhookMethodsValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow multiple webhook nodes all configured', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          workflow: {
            nodes: [
              {
                name: 'Webhook 1',
                type: 'n8n-nodes-base.webhook',
                parameters: {
                  httpMethod: 'GET,POST',
                },
              },
              {
                name: 'Webhook 2',
                type: 'n8n-nodes-base.webhook',
                parameters: {
                  httpMethod: 'POST',
                },
              },
            ],
          },
        },
      };

      const output = await webhookMethodsValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Webhook nodes without httpMethod (blocked)', () => {
    it('should block webhook without httpMethod', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          workflow: {
            nodes: [
              {
                name: 'Unconfigured Webhook',
                type: 'n8n-nodes-base.webhook',
                parameters: {
                  path: 'api/test',
                  responseMode: 'lastNode',
                  // Missing httpMethod
                },
              },
            ],
          },
        },
      };

      const output = await webhookMethodsValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(output.hookSpecificOutput.permissionDecisionReason).toContain('Unconfigured Webhook');
    });

    it('should block webhook with empty parameters', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          workflow: {
            nodes: [
              {
                name: 'Empty Params',
                type: 'n8n-nodes-base.webhook',
                parameters: {},
              },
            ],
          },
        },
      };

      const output = await webhookMethodsValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block webhook with no parameters field', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          workflow: {
            nodes: [
              {
                name: 'No Params',
                type: 'n8n-nodes-base.webhook',
              },
            ],
          },
        },
      };

      const output = await webhookMethodsValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });

    it('should block when one of multiple webhooks is unconfigured', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          workflow: {
            nodes: [
              {
                name: 'Webhook 1',
                type: 'n8n-nodes-base.webhook',
                parameters: {
                  httpMethod: 'POST',
                },
              },
              {
                name: 'Webhook 2',
                type: 'n8n-nodes-base.webhook',
                parameters: {
                  path: 'api/test',
                  // Missing httpMethod
                },
              },
            ],
          },
        },
      };

      const output = await webhookMethodsValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(output.hookSpecificOutput.permissionDecisionReason).toContain('Webhook 2');
    });
  });

  describe('Workflow definition extraction', () => {
    it('should extract from workflow field', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          workflow: {
            nodes: [
              {
                name: 'Webhook',
                type: 'n8n-nodes-base.webhook',
                parameters: { httpMethod: 'POST' },
              },
            ],
          },
        },
      };

      const output = await webhookMethodsValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should extract from workflow_data field', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_workflow',
        tool_input: {
          workflow_data: {
            nodes: [
              {
                name: 'Webhook',
                type: 'n8n-nodes-base.webhook',
                parameters: { httpMethod: 'POST' },
              },
            ],
          },
        },
      };

      const output = await webhookMethodsValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should extract from definition field', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_save_workflow',
        tool_input: {
          definition: {
            nodes: [
              {
                name: 'Webhook',
                type: 'n8n-nodes-base.webhook',
                parameters: { httpMethod: 'POST' },
              },
            ],
          },
        },
      };

      const output = await webhookMethodsValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should extract from tool_input itself if it has nodes', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          nodes: [
            {
              name: 'Webhook',
              type: 'n8n-nodes-base.webhook',
              parameters: { httpMethod: 'POST' },
            },
          ],
        },
      };

      const output = await webhookMethodsValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Non-webhook workflows (allowed)', () => {
    it('should allow workflow with no webhook nodes', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          workflow: {
            nodes: [
              {
                name: 'Code Node',
                type: 'n8n-nodes-base.code',
                parameters: {},
              },
            ],
          },
        },
      };

      const output = await webhookMethodsValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow workflow with only executeWorkflowTrigger', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          workflow: {
            nodes: [
              {
                name: 'Start',
                type: 'n8n-nodes-base.executeWorkflowTrigger',
                parameters: {},
              },
            ],
          },
        },
      };

      const output = await webhookMethodsValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Non-workflow operations (ignored)', () => {
    it('should allow non-workflow n8n operations', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_list_workflows',
        tool_input: {},
      };

      const output = await webhookMethodsValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow non-n8n tools', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'echo test' },
      };

      const output = await webhookMethodsValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow Write tool', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Write',
        tool_input: { file_path: '/test.txt', content: 'test' },
      };

      const output = await webhookMethodsValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Edge cases', () => {
    it('should allow when workflow definition not found', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          some_other_field: 'value',
        },
      };

      const output = await webhookMethodsValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow when nodes field missing', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          workflow: {
            name: 'Test',
          },
        },
      };

      const output = await webhookMethodsValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow when nodes is not an array', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: {
          workflow: {
            nodes: 'not-an-array',
          },
        },
      };

      const output = await webhookMethodsValidatorHook(input);

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });
});
