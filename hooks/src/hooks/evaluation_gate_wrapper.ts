/**
 * Evaluation Gate Hook Wrapper
 *
 * Enforces n8n Evaluation requirements before allowing workflows to exit [DEV] status.
 * This wrapper integrates the evaluation_gate.ts with the CLI runner system.
 *
 * Triggers on: mcp__n8n-mcp__n8n_update_partial_workflow
 * When: Operation includes removeTag for [DEV] tag ID
 */

import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
import { log, logBlocked, logAllowed } from '../utils.js';
import { registerHook } from '../runner.js';
import {
  evaluationGateHook,
  defaultEvaluationGateConfig,
  EvaluationGateConfig,
} from './evaluation_gate.js';

/**
 * Configuration for n8n instance
 */
const N8N_CONFIG = {
  baseUrl: process.env.N8N_BASE_URL || 'https://n8n.atgfw.com',
  apiKey: process.env.N8N_API_KEY || '',
};

/**
 * Tag IDs for governance
 */
const TAG_IDS = {
  dev: 'RL7B8tcKpAfwpHZR', // [DEV] tag
  archive: 'archive-tag-id', // [ARCHIVE] tag - update when known
  archived: 'archived-tag-id', // [ARCHIVE(D)] tag - update when known
};

/**
 * Fetch workflow from n8n instance
 */
async function fetchWorkflow(workflowId: string): Promise<any> {
  const response = await fetch(`${N8N_CONFIG.baseUrl}/api/v1/workflows/${workflowId}`, {
    headers: {
      'X-N8N-API-KEY': N8N_CONFIG.apiKey,
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch workflow ${workflowId}: ${response.status}`);
  }

  return response.json();
}

/**
 * Fetch workflow executions for success rate calculation
 * Note: This is a placeholder - n8n Evaluations API is UI-only
 * Success rate must be calculated from execution history
 */
async function fetchWorkflowExecutions(
  workflowId: string
): Promise<{ executions: Array<{ status: string }> }> {
  try {
    const response = await fetch(
      `${N8N_CONFIG.baseUrl}/api/v1/executions?workflowId=${workflowId}&limit=100`,
      {
        headers: {
          'X-N8N-API-KEY': N8N_CONFIG.apiKey,
          Accept: 'application/json',
        },
      }
    );

    if (!response.ok) {
      return { executions: [] };
    }

    const data = (await response.json()) as {
      data?: Array<{ finished?: boolean; stoppedAt?: string }>;
    };
    return {
      executions: (data.data || []).map((exec) => ({
        status: exec.finished ? (exec.stoppedAt ? 'success' : 'error') : 'running',
      })),
    };
  } catch {
    return { executions: [] };
  }
}

/**
 * Evaluation Gate Hook Implementation for CLI
 *
 * Wrapper that:
 * 1. Logs hook execution details
 * 2. Calls the core evaluation_gate.ts logic
 * 3. Handles API errors gracefully
 */
export async function evaluationGateWrapperHook(input: PreToolUseInput): Promise<PreToolUseOutput> {
  log('Evaluation Gate Hook triggered');
  log(`Tool: ${input.tool_name}`);

  // Only handle n8n_update_partial_workflow
  if (input.tool_name !== 'mcp__n8n-mcp__n8n_update_partial_workflow') {
    logAllowed('Not a partial workflow update');
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  const toolInput = input.tool_input as {
    id?: string;
    operations?: Array<{ type: string; tagId?: string }>;
  };

  // Check if removing DEV tag
  const operations = toolInput.operations || [];
  const isRemovingDevTag = operations.some(
    (op) => op.type === 'removeTag' && op.tagId === TAG_IDS.dev
  );

  if (!isRemovingDevTag) {
    logAllowed('Not removing DEV tag - no evaluation gate check required');
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  log('DEV tag removal detected - running evaluation gate checks');

  // Prepare config with current enforcement mode
  const config: EvaluationGateConfig = {
    ...defaultEvaluationGateConfig,
    devTagId: TAG_IDS.dev,
    // Start with soft enforcement
    enforcement: 'soft',
  };

  // Fetch executions for success rate calculation
  const workflowId = toolInput.id;
  let mockExecutions = { executions: [] as Array<{ status: string }> };

  if (workflowId && N8N_CONFIG.apiKey) {
    try {
      mockExecutions = await fetchWorkflowExecutions(workflowId);
      log(`Fetched ${mockExecutions.executions.length} executions for success rate calculation`);
    } catch (error) {
      log(`Warning: Could not fetch executions: ${error}`);
    }
  }

  // Call the core evaluation gate hook
  try {
    const result = await evaluationGateHook(input, config, fetchWorkflow, {
      archiveTagIds: [TAG_IDS.archive, TAG_IDS.archived],
      mockExecutions,
    });

    // Log the result
    const decision = result.hookSpecificOutput.permissionDecision;
    const reason = result.hookSpecificOutput.permissionDecisionReason;

    if (decision === 'deny') {
      logBlocked('Evaluation gate check failed', reason || 'Unknown reason');
    } else if (reason) {
      logAllowed(`${reason}`);
    } else {
      logAllowed('All evaluation gate checks passed');
    }

    return result;
  } catch (error) {
    // On error, allow with warning (don't block on hook errors)
    log(`Warning: Evaluation gate hook error: ${error}`);
    logAllowed('Evaluation gate check skipped due to error');

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason: `Evaluation gate check skipped: ${error}`,
      },
    };
  }
}

// Register the hook
registerHook('evaluation-gate', 'PreToolUse', evaluationGateWrapperHook);

export default evaluationGateWrapperHook;
