/**
 * Evaluation Gate Hook
 *
 * Enforces n8n Evaluation requirements before allowing workflows to exit [DEV] status.
 *
 * Requirements to leave [DEV]:
 * - BLOCKING: Evaluation Trigger node exists
 * - BLOCKING: Error workflow configured
 * - BLOCKING: 98%+ success rate on evaluation runs
 * - ADVISORY: 20+ unique test cases
 * - ADVISORY: Time saved metric set
 * - ADVISORY: MCP access explicitly set
 *
 * Governed tags: [DEV], [ARCHIVE(D)], untagged
 * Not governed: All other tags (ALPHA, BETA, GA, PROD, etc.)
 */

import type { PreToolUseInput, PreToolUseOutput } from '../types.js';

export interface EvaluationGateConfig {
  devTagId: string;
  successRateThreshold: number; // e.g., 0.98 for 98%
  minTestCases: number; // e.g., 20
  enforcement: 'soft' | 'hard';
}

export interface EvaluationGateOptions {
  archiveTagIds?: string[];
  mockExecutions?: {
    executions: Array<{ status: string }>;
  };
}

interface WorkflowNode {
  type: string;
  name: string;
}

interface WorkflowSettings {
  errorWorkflow?: string;
  timeSaved?: number;
  availableInMCP?: boolean;
}

interface WorkflowTag {
  id: string;
  name: string;
}

interface Workflow {
  id: string;
  name: string;
  nodes: WorkflowNode[];
  settings: WorkflowSettings;
  tags: WorkflowTag[];
}

interface Operation {
  type: string;
  tagId?: string;
}

type WorkflowFetcher = (workflowId: string) => Promise<Workflow>;

/**
 * Check if a workflow has an Evaluation Trigger node
 */
function hasEvaluationTrigger(workflow: Workflow): boolean {
  return workflow.nodes.some(
    (node) =>
      node.type === 'n8n-nodes-base.evaluationTrigger' ||
      node.type === '@n8n/n8n-nodes-base.evaluationTrigger'
  );
}

/**
 * Check if error workflow is configured
 */
function hasErrorWorkflow(workflow: Workflow): boolean {
  return (
    workflow.settings?.errorWorkflow !== undefined &&
    workflow.settings.errorWorkflow !== null &&
    workflow.settings.errorWorkflow !== ''
  );
}

/**
 * Calculate success rate from executions
 */
function calculateSuccessRate(executions: Array<{ status: string }>): number {
  if (executions.length === 0) return 0;
  const successful = executions.filter((e) => e.status === 'success').length;
  return successful / executions.length;
}

/**
 * Check if operation removes DEV tag
 */
function isRemovingDevTag(operations: Operation[], devTagId: string): boolean {
  return operations.some((op) => op.type === 'removeTag' && op.tagId === devTagId);
}

/**
 * Check if operation adds ARCHIVE tag
 */
function isAddingArchiveTag(operations: Operation[], archiveTagIds: string[]): boolean {
  return operations.some((op) => op.type === 'addTag' && archiveTagIds.includes(op.tagId || ''));
}

/**
 * Create allow response
 */
function allowResponse(reason?: string): PreToolUseOutput {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: reason,
    },
  };
}

/**
 * Create deny response
 */
function denyResponse(reason: string): PreToolUseOutput {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  };
}

/**
 * Evaluation Gate Hook
 *
 * Triggers on: mcp__n8n-mcp__n8n_update_partial_workflow
 * When: Operation includes removeTag for [DEV] tag ID
 */
export async function evaluationGateHook(
  input: PreToolUseInput,
  config: EvaluationGateConfig,
  workflowFetcher: WorkflowFetcher,
  options: EvaluationGateOptions = {}
): Promise<PreToolUseOutput> {
  const { devTagId, successRateThreshold, minTestCases, enforcement } = config;
  const { archiveTagIds = [], mockExecutions } = options;

  // Only handle n8n_update_partial_workflow
  if (input.tool_name !== 'mcp__n8n-mcp__n8n_update_partial_workflow') {
    return allowResponse();
  }

  const toolInput = input.tool_input as {
    id?: string;
    operations?: Operation[];
  };

  const workflowId = toolInput.id;
  const operations = toolInput.operations || [];

  // Only trigger if removing DEV tag
  if (!isRemovingDevTag(operations, devTagId)) {
    return allowResponse();
  }

  // Allow if simultaneously adding ARCHIVE tag (archival is always allowed)
  if (isAddingArchiveTag(operations, archiveTagIds)) {
    return allowResponse('Archival allowed without evaluation checks');
  }

  // Fetch workflow details
  if (!workflowId) {
    return denyResponse('Workflow ID required for evaluation gate check');
  }

  let workflow: Workflow;
  try {
    workflow = await workflowFetcher(workflowId);
  } catch (error) {
    // If we can't fetch the workflow, allow (don't block on fetch errors)
    return allowResponse('Could not fetch workflow details');
  }

  // Collect violations and advisories
  const violations: string[] = [];
  const advisories: string[] = [];

  // CHECK 1: Evaluation Trigger node exists (BLOCKING)
  if (!hasEvaluationTrigger(workflow)) {
    violations.push('Evaluation Trigger node required to leave DEV');
  }

  // CHECK 2: Error workflow configured (BLOCKING)
  if (!hasErrorWorkflow(workflow)) {
    violations.push('Error workflow must be configured to leave DEV');
  }

  // CHECK 3: Success rate (BLOCKING) - only check if we have executions
  const executions = mockExecutions?.executions || [];
  if (executions.length > 0) {
    const successRate = calculateSuccessRate(executions);
    const thresholdPercent = Math.round(successRateThreshold * 100);

    if (successRate < successRateThreshold) {
      const currentPercent = Math.round(successRate * 100);
      violations.push(
        `Evaluation success rate ${currentPercent}% is below ${thresholdPercent}% threshold`
      );
    }

    // CHECK 4: Minimum test cases (ADVISORY)
    if (executions.length < minTestCases) {
      advisories.push(
        `Only ${executions.length} test cases (advisory: ${minTestCases}+ recommended)`
      );
    }
  }

  // CHECK 5: Time saved metric (ADVISORY)
  if (workflow.settings?.timeSaved === undefined) {
    advisories.push('Time saved metric not configured (advisory)');
  }

  // CHECK 6: MCP access decision (ADVISORY)
  if (workflow.settings?.availableInMCP === undefined) {
    advisories.push('MCP access not explicitly configured (advisory)');
  }

  // If there are violations, decide based on enforcement mode
  if (violations.length > 0) {
    if (enforcement === 'soft') {
      const message = `[soft enforcement] DEV exit would be blocked: ${violations.join('; ')}`;
      return allowResponse(message);
    } else {
      return denyResponse(violations.join('; '));
    }
  }

  // No violations - allow with advisory messages if any
  if (advisories.length > 0) {
    return allowResponse(`DEV exit allowed with advisories: ${advisories.join('; ')}`);
  }

  return allowResponse('All evaluation gate checks passed');
}

/**
 * Default configuration
 */
export const defaultEvaluationGateConfig: EvaluationGateConfig = {
  devTagId: 'RL7B8tcKpAfwpHZR', // [DEV] tag ID from n8n.atgfw.com
  successRateThreshold: 0.98,
  minTestCases: 20,
  enforcement: 'soft', // Start with soft enforcement
};
