/**
 * Evaluation Gate Hook Tests
 * TDD: Write tests first, then implementation
 *
 * This hook enforces n8n Evaluation requirements before allowing
 * workflows to exit [DEV] status.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { evaluationGateHook, EvaluationGateConfig } from '../src/hooks/evaluation_gate.js';
import type { PreToolUseInput, PreToolUseOutput } from '../src/types.js';

// Mock workflow data for testing
const mockWorkflowWithEvaluation = {
  id: 'test-workflow-123',
  name: 'Test Workflow',
  nodes: [
    { type: 'n8n-nodes-base.webhook', name: 'Webhook' },
    { type: 'n8n-nodes-base.evaluationTrigger', name: 'Evaluation Trigger' },
    { type: 'n8n-nodes-base.code', name: 'Process' },
  ],
  settings: {
    errorWorkflow: 'error-handler-workflow-id',
    timeSaved: 30,
    availableInMCP: false,
  },
  tags: [{ id: 'dev-tag-id', name: '[DEV]' }],
};

const mockWorkflowWithoutEvaluation = {
  id: 'test-workflow-456',
  name: 'Test Workflow Without Eval',
  nodes: [
    { type: 'n8n-nodes-base.webhook', name: 'Webhook' },
    { type: 'n8n-nodes-base.code', name: 'Process' },
  ],
  settings: {},
  tags: [{ id: 'dev-tag-id', name: '[DEV]' }],
};

const mockConfig: EvaluationGateConfig = {
  devTagId: 'dev-tag-id',
  successRateThreshold: 0.98,
  minTestCases: 20,
  enforcement: 'hard',
};

describe('Evaluation Gate Hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tag Scope Filtering', () => {
    it('should allow DEV tag to remain without evaluation', async () => {
      // Adding a different tag, not removing DEV
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {
          id: 'test-workflow-123',
          operations: [{ type: 'addTag', tagId: 'alpha-tag-id' }],
        },
      };

      const output = await evaluationGateHook(
        input,
        mockConfig,
        async () => mockWorkflowWithoutEvaluation
      );

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should ignore non-DEV tag operations', async () => {
      // Removing a non-DEV tag
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {
          id: 'test-workflow-123',
          operations: [{ type: 'removeTag', tagId: 'some-other-tag-id' }],
        },
      };

      const output = await evaluationGateHook(
        input,
        mockConfig,
        async () => mockWorkflowWithoutEvaluation
      );

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should allow ARCHIVE tag without checks', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {
          id: 'test-workflow-123',
          operations: [
            { type: 'removeTag', tagId: 'dev-tag-id' },
            { type: 'addTag', tagId: 'archive-tag-id' },
          ],
        },
      };

      const mockWorkflow = {
        ...mockWorkflowWithoutEvaluation,
        // Fetcher will return the archive tag in the add operation
      };

      // When adding ARCHIVE tag simultaneously with removing DEV, allow it
      const output = await evaluationGateHook(input, mockConfig, async () => mockWorkflow, {
        archiveTagIds: ['archive-tag-id'],
      });

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should ignore non-n8n-update-partial-workflow tools', async () => {
      const input: PreToolUseInput = {
        tool_name: 'Bash',
        tool_input: { command: 'echo test' },
      };

      const output = await evaluationGateHook(
        input,
        mockConfig,
        async () => mockWorkflowWithoutEvaluation
      );

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Evaluation Trigger Requirement', () => {
    it('should block DEV removal without Evaluation Trigger node', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {
          id: 'test-workflow-456',
          operations: [{ type: 'removeTag', tagId: 'dev-tag-id' }],
        },
      };

      const output = await evaluationGateHook(
        input,
        mockConfig,
        async () => mockWorkflowWithoutEvaluation
      );

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(output.hookSpecificOutput.permissionDecisionReason).toContain(
        'Evaluation Trigger node required'
      );
    });

    it('should allow DEV removal with Evaluation Trigger node present', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {
          id: 'test-workflow-123',
          operations: [{ type: 'removeTag', tagId: 'dev-tag-id' }],
        },
      };

      // Mock execution history with 98%+ success rate
      const mockExecutions = {
        executions: Array(25)
          .fill(null)
          .map((_, i) => ({
            id: `exec-${i}`,
            status: i < 24 ? 'success' : 'error', // 24/25 = 96% - will fail
            startedAt: new Date().toISOString(),
          })),
      };

      const output = await evaluationGateHook(
        input,
        mockConfig,
        async () => mockWorkflowWithEvaluation,
        {
          mockExecutions: {
            executions: Array(25)
              .fill(null)
              .map(() => ({ status: 'success' })),
          },
        }
      );

      // Should proceed to success rate check (allow if passes)
      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Success Rate Enforcement', () => {
    it('should block DEV removal if success rate below 98%', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {
          id: 'test-workflow-123',
          operations: [{ type: 'removeTag', tagId: 'dev-tag-id' }],
        },
      };

      // 90% success rate (below 98% threshold)
      const mockExecutions = {
        executions: Array(100)
          .fill(null)
          .map((_, i) => ({
            id: `exec-${i}`,
            status: i < 90 ? 'success' : 'error',
          })),
      };

      const output = await evaluationGateHook(
        input,
        mockConfig,
        async () => mockWorkflowWithEvaluation,
        { mockExecutions }
      );

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(output.hookSpecificOutput.permissionDecisionReason).toContain('success rate');
      expect(output.hookSpecificOutput.permissionDecisionReason).toContain('98%');
    });

    it('should allow DEV removal with 98%+ success rate', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {
          id: 'test-workflow-123',
          operations: [{ type: 'removeTag', tagId: 'dev-tag-id' }],
        },
      };

      // 99% success rate (above 98% threshold)
      const mockExecutions = {
        executions: Array(100)
          .fill(null)
          .map((_, i) => ({
            id: `exec-${i}`,
            status: i < 99 ? 'success' : 'error',
          })),
      };

      const output = await evaluationGateHook(
        input,
        mockConfig,
        async () => mockWorkflowWithEvaluation,
        { mockExecutions }
      );

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should warn but allow if fewer than 20 unique test cases', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {
          id: 'test-workflow-123',
          operations: [{ type: 'removeTag', tagId: 'dev-tag-id' }],
        },
      };

      // Only 10 executions (below 20 minimum)
      const mockExecutions = {
        executions: Array(10)
          .fill(null)
          .map((_, i) => ({
            id: `exec-${i}`,
            status: 'success',
          })),
      };

      const output = await evaluationGateHook(
        input,
        mockConfig,
        async () => mockWorkflowWithEvaluation,
        { mockExecutions }
      );

      // Advisory only - should allow with warning
      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
      expect(output.hookSpecificOutput.permissionDecisionReason).toContain('advisory');
    });
  });

  describe('Production Checklist Enforcement', () => {
    it('should block DEV removal without error workflow configured', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {
          id: 'test-workflow-123',
          operations: [{ type: 'removeTag', tagId: 'dev-tag-id' }],
        },
      };

      const workflowWithoutErrorWorkflow = {
        ...mockWorkflowWithEvaluation,
        settings: {
          timeSaved: 30,
          availableInMCP: false,
          // No errorWorkflow
        },
      };

      const output = await evaluationGateHook(
        input,
        mockConfig,
        async () => workflowWithoutErrorWorkflow,
        { mockExecutions: { executions: Array(25).fill({ status: 'success' }) } }
      );

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
      expect(output.hookSpecificOutput.permissionDecisionReason).toContain('Error workflow');
    });

    it('should warn but allow if time saved metric not set', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {
          id: 'test-workflow-123',
          operations: [{ type: 'removeTag', tagId: 'dev-tag-id' }],
        },
      };

      const workflowWithoutTimeSaved = {
        ...mockWorkflowWithEvaluation,
        settings: {
          errorWorkflow: 'error-handler-id',
          availableInMCP: false,
          // No timeSaved
        },
      };

      const output = await evaluationGateHook(
        input,
        mockConfig,
        async () => workflowWithoutTimeSaved,
        { mockExecutions: { executions: Array(25).fill({ status: 'success' }) } }
      );

      // Advisory only - should allow
      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });

    it('should warn but allow if MCP access not explicitly set', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {
          id: 'test-workflow-123',
          operations: [{ type: 'removeTag', tagId: 'dev-tag-id' }],
        },
      };

      const workflowWithoutMcpSetting = {
        ...mockWorkflowWithEvaluation,
        settings: {
          errorWorkflow: 'error-handler-id',
          timeSaved: 30,
          // No availableInMCP
        },
      };

      const output = await evaluationGateHook(
        input,
        mockConfig,
        async () => workflowWithoutMcpSetting,
        { mockExecutions: { executions: Array(25).fill({ status: 'success' }) } }
      );

      // Advisory only - should allow
      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });

  describe('Enforcement Modes', () => {
    it('should log but allow in soft enforcement mode', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {
          id: 'test-workflow-456',
          operations: [{ type: 'removeTag', tagId: 'dev-tag-id' }],
        },
      };

      const softConfig: EvaluationGateConfig = {
        ...mockConfig,
        enforcement: 'soft',
      };

      const output = await evaluationGateHook(
        input,
        softConfig,
        async () => mockWorkflowWithoutEvaluation
      );

      // Soft enforcement - should allow with warning
      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
      expect(output.hookSpecificOutput.permissionDecisionReason).toContain('soft enforcement');
    });

    it('should block in hard enforcement mode', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {
          id: 'test-workflow-456',
          operations: [{ type: 'removeTag', tagId: 'dev-tag-id' }],
        },
      };

      const hardConfig: EvaluationGateConfig = {
        ...mockConfig,
        enforcement: 'hard',
      };

      const output = await evaluationGateHook(
        input,
        hardConfig,
        async () => mockWorkflowWithoutEvaluation
      );

      expect(output.hookSpecificOutput.permissionDecision).toBe('deny');
    });
  });

  describe('Compliant Workflow', () => {
    it('should allow fully compliant DEV removal', async () => {
      const input: PreToolUseInput = {
        tool_name: 'mcp__n8n-mcp__n8n_update_partial_workflow',
        tool_input: {
          id: 'test-workflow-123',
          operations: [{ type: 'removeTag', tagId: 'dev-tag-id' }],
        },
      };

      // Fully compliant: evaluation trigger, error workflow, 99% success, 25 test cases
      const output = await evaluationGateHook(
        input,
        mockConfig,
        async () => mockWorkflowWithEvaluation,
        { mockExecutions: { executions: Array(25).fill({ status: 'success' }) } }
      );

      expect(output.hookSpecificOutput.permissionDecision).toBe('allow');
    });
  });
});
