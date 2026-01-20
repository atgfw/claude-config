/**
 * n8n Workflow Activation Hook Tests
 * TDD: Tests for auto-activation of n8n workflows for MCP access
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { n8nWorkflowActivationHook } from '../src/hooks/n8n_workflow_activation.js';
import type { PostToolUseInput } from '../src/types.js';
import * as utils from '../src/utils.js';

// Mock the utils module
vi.mock('../src/utils.js', async () => {
  const actual = (await vi.importActual('../src/utils.js')) as typeof utils;
  return {
    ...actual,
    loadEnv: vi.fn(),
  };
});

describe('n8n Workflow Activation Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default: no API key (prevents actual API calls in tests)
    delete process.env['N8N_API_KEY'];
    delete process.env['N8N_BASE_URL'];
  });

  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env['N8N_API_KEY'];
    delete process.env['N8N_BASE_URL'];
  });

  describe('Non-n8n Tools Pass Through', () => {
    it('should pass through Read tool without intervention', async () => {
      const input: PostToolUseInput = {
        tool_name: 'Read',
        tool_input: { file_path: '/some/file.ts' },
        tool_output: 'file content',
      };

      const output = await n8nWorkflowActivationHook(input);

      expect(output.hookSpecificOutput.hookEventName).toBe('PostToolUse');
      expect(output.hookSpecificOutput.additionalContext).toBeUndefined();
    });

    it('should pass through Bash tool without intervention', async () => {
      const input: PostToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'ls' },
        tool_output: 'file1.ts file2.ts',
      };

      const output = await n8nWorkflowActivationHook(input);

      expect(output.hookSpecificOutput.hookEventName).toBe('PostToolUse');
      expect(output.hookSpecificOutput.additionalContext).toBeUndefined();
    });

    it('should pass through other MCP tools', async () => {
      const input: PostToolUseInput = {
        tool_name: 'mcp__scrapling__s-fetch-page',
        tool_input: { url: 'https://example.com' },
        tool_output: '<html>content</html>',
      };

      const output = await n8nWorkflowActivationHook(input);

      expect(output.hookSpecificOutput.hookEventName).toBe('PostToolUse');
      expect(output.hookSpecificOutput.additionalContext).toBeUndefined();
    });
  });

  describe('n8n Workflow Tool Detection', () => {
    it('should detect n8n_create_workflow tool', async () => {
      const input: PostToolUseInput = {
        tool_name: 'n8n_create_workflow',
        tool_input: { name: 'Test Workflow' },
        tool_output: { id: 'test-123', name: 'Test Workflow', active: true },
      };

      const output = await n8nWorkflowActivationHook(input);

      // Should have additional context since it processed an n8n tool
      expect(output.hookSpecificOutput.additionalContext).toBeDefined();
    });

    it('should detect mcp__n8n-mcp__n8n_create_workflow tool', async () => {
      const input: PostToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: { name: 'Test Workflow' },
        tool_output: { id: 'test-456', name: 'Test Workflow', active: true },
      };

      const output = await n8nWorkflowActivationHook(input);

      expect(output.hookSpecificOutput.additionalContext).toBeDefined();
    });

    it('should detect n8n_update_workflow tool', async () => {
      const input: PostToolUseInput = {
        tool_name: 'n8n_update_workflow',
        tool_input: { id: 'test-789', name: 'Updated Workflow' },
        tool_output: { id: 'test-789', name: 'Updated Workflow', active: true },
      };

      const output = await n8nWorkflowActivationHook(input);

      expect(output.hookSpecificOutput.additionalContext).toBeDefined();
    });
  });

  describe('Already Active Workflows', () => {
    it('should report active status for already active workflow', async () => {
      const input: PostToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_create_workflow',
        tool_input: { name: 'Active Workflow' },
        tool_output: { id: 'active-123', name: 'Active Workflow', active: true },
      };

      const output = await n8nWorkflowActivationHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain('ACTIVE');
      expect(output.hookSpecificOutput.additionalContext).toContain('active-123');
    });

    it('should mention MCP access for active workflows', async () => {
      const input: PostToolUseInput = {
        tool_name: 'n8n_create_workflow',
        tool_input: { name: 'Test' },
        tool_output: { id: 'test-id', name: 'Test', active: true },
      };

      const output = await n8nWorkflowActivationHook(input);

      expect(output.hookSpecificOutput.additionalContext?.toLowerCase()).toContain('mcp');
    });
  });

  describe('Workflow Result Parsing', () => {
    it('should parse workflow from direct object output', async () => {
      const input: PostToolUseInput = {
        tool_name: 'n8n_create_workflow',
        tool_input: {},
        tool_output: { id: 'direct-123', name: 'Direct', active: true },
      };

      const output = await n8nWorkflowActivationHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain('direct-123');
    });

    it('should parse workflow from nested workflow property', async () => {
      const input: PostToolUseInput = {
        tool_name: 'n8n_create_workflow',
        tool_input: {},
        tool_output: {
          workflow: { id: 'nested-123', name: 'Nested', active: true },
        },
      };

      const output = await n8nWorkflowActivationHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain('nested-123');
    });

    it('should parse workflow from data.data pattern', async () => {
      const input: PostToolUseInput = {
        tool_name: 'n8n_create_workflow',
        tool_input: {},
        tool_output: {
          data: { id: 'data-123', name: 'Data Pattern', active: true },
        },
      };

      const output = await n8nWorkflowActivationHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain('data-123');
    });

    it('should parse workflow from JSON string output', async () => {
      const input: PostToolUseInput = {
        tool_name: 'n8n_create_workflow',
        tool_input: {},
        tool_output: JSON.stringify({
          id: 'json-123',
          name: 'JSON',
          active: true,
        }),
      };

      const output = await n8nWorkflowActivationHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain('json-123');
    });

    it('should handle missing workflow ID with warning', async () => {
      const input: PostToolUseInput = {
        tool_name: 'n8n_create_workflow',
        tool_input: {},
        tool_output: { name: 'No ID', active: true },
      };

      const output = await n8nWorkflowActivationHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain('WARNING');
      expect(output.hookSpecificOutput.additionalContext).toContain('Could not parse');
    });

    it('should handle null output with warning', async () => {
      const input: PostToolUseInput = {
        tool_name: 'n8n_create_workflow',
        tool_input: {},
        tool_output: null,
      };

      const output = await n8nWorkflowActivationHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain('WARNING');
    });
  });

  describe('Inactive Workflow Handling', () => {
    it('should provide manual instructions when activation fails (no API key)', async () => {
      // No API key set, so activation will fail
      const input: PostToolUseInput = {
        tool_name: 'n8n_create_workflow',
        tool_input: {},
        tool_output: { id: 'inactive-123', name: 'Inactive', active: false },
      };

      const output = await n8nWorkflowActivationHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain('WARNING');
      expect(output.hookSpecificOutput.additionalContext).toContain('MANUAL ACTION REQUIRED');
      expect(output.hookSpecificOutput.additionalContext).toContain('inactive-123');
    });

    it('should mention n8n_update_workflow as alternative', async () => {
      const input: PostToolUseInput = {
        tool_name: 'n8n_create_workflow',
        tool_input: {},
        tool_output: { id: 'test-456', name: 'Test', active: false },
      };

      const output = await n8nWorkflowActivationHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain('n8n_update_workflow');
    });
  });

  describe('Edge Cases', () => {
    it('should handle undefined active status as needing activation', async () => {
      const input: PostToolUseInput = {
        tool_name: 'n8n_create_workflow',
        tool_input: {},
        tool_output: { id: 'undefined-123', name: 'Undefined Status' },
        // Note: active is undefined
      };

      const output = await n8nWorkflowActivationHook(input);

      // Should attempt activation or warn (without API key, will warn)
      expect(output.hookSpecificOutput.additionalContext).toBeDefined();
      expect(output.hookSpecificOutput.additionalContext).toContain('undefined-123');
    });

    it('should handle empty string tool output with warning', async () => {
      const input: PostToolUseInput = {
        tool_name: 'n8n_create_workflow',
        tool_input: {},
        tool_output: '',
      };

      const output = await n8nWorkflowActivationHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain('WARNING');
    });

    it('should extract ID from text pattern like "Created workflow ID: xyz"', async () => {
      const input: PostToolUseInput = {
        tool_name: 'n8n_create_workflow',
        tool_input: {},
        tool_output: 'Successfully created workflow with ID: abc-def-123',
      };

      const output = await n8nWorkflowActivationHook(input);

      // Should find the ID from the text pattern and provide context
      expect(output.hookSpecificOutput.additionalContext).toBeDefined();
      expect(output.hookSpecificOutput.additionalContext).toContain('abc-def-123');
    });

    it('should handle malformed JSON string gracefully', async () => {
      const input: PostToolUseInput = {
        tool_name: 'n8n_create_workflow',
        tool_input: {},
        tool_output: '{invalid json',
      };

      const output = await n8nWorkflowActivationHook(input);

      expect(output.hookSpecificOutput.additionalContext).toContain('WARNING');
    });
  });
});
