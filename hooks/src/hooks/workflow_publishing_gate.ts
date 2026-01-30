/**
 * Workflow Publishing Gate Hook
 * BLOCKS webhook triggers on unpublished [DEV] workflows
 * Enforces: "Unpublished workflows have webhook triggers that only work in test mode"
 */

import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
import { logVerbose, logBlocked } from '../utils.js';
import { registerHook } from '../runner.js';

/**
 * Check if tool is an n8n workflow operation
 */
function isN8nWorkflowOperation(toolName: string): boolean {
  const lower = toolName.toLowerCase();
  return lower.includes('n8n') && (lower.includes('workflow') || lower.includes('webhook'));
}

/**
 * Extract workflow info from tool input
 */
function extractWorkflowInfo(input: PreToolUseInput): {
  workflowId?: string;
  tags?: string[];
  hasWebhookNode?: boolean;
} {
  const toolInput = input.tool_input;
  if (!toolInput || typeof toolInput !== 'object') {
    return {};
  }

  // Check for nested workflow object (common in create/update operations)
  const workflow =
    'workflow' in toolInput && typeof toolInput['workflow'] === 'object'
      ? (toolInput['workflow'] as Record<string, unknown>)
      : toolInput;

  // Try to find workflow_id
  let workflowId: string | undefined;
  if ('workflow_id' in toolInput && typeof toolInput['workflow_id'] === 'string') {
    workflowId = toolInput['workflow_id'];
  } else if ('workflowId' in toolInput && typeof toolInput['workflowId'] === 'string') {
    workflowId = toolInput['workflowId'];
  } else if ('id' in toolInput && typeof toolInput['id'] === 'string') {
    workflowId = toolInput['id'];
  }

  // Try to find tags from workflow object
  let tags: string[] | undefined;
  if ('tags' in workflow && Array.isArray(workflow['tags'])) {
    tags = workflow['tags'].map((t: unknown) => {
      if (typeof t === 'string') return t;
      if (typeof t === 'object' && t !== null && 'name' in t)
        return String((t as { name: unknown }).name);
      return String(t);
    });
  }

  // Check for webhook nodes
  let hasWebhookNode = false;
  if ('nodes' in workflow && Array.isArray(workflow['nodes'])) {
    hasWebhookNode = workflow['nodes'].some((node: unknown) => {
      if (typeof node !== 'object' || node === null) return false;
      const nodeType = (node as { type?: string }).type || '';
      return nodeType.toLowerCase().includes('webhook');
    });
  }

  return { workflowId, tags, hasWebhookNode };
}

/**
 * Check if workflow has [DEV] tag (unpublished)
 */
function isDevWorkflow(tags?: string[]): boolean {
  if (!tags || !Array.isArray(tags)) {
    // If no tags info, assume might be dev - warn
    return false; // Default to false to avoid false positives
  }

  // Check for [DEV] tag
  return tags.some((tag) => {
    const tagStr = String(tag).toLowerCase();
    return tagStr.includes('[dev]') || tagStr.includes('dev');
  });
}

/**
 * Workflow Publishing Gate Hook Implementation
 *
 * Blocks webhook triggers on unpublished workflows.
 * Workflows with [DEV] tag must be published before production use.
 */
export async function workflowPublishingGateHook(
  input: PreToolUseInput
): Promise<PreToolUseOutput> {
  const toolName = input.tool_name;

  // Only check n8n workflow-related operations
  if (!isN8nWorkflowOperation(toolName)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  logVerbose(`[workflow-publishing] Checking status...`);

  const { tags, hasWebhookNode } = extractWorkflowInfo(input);
  const isWebhookOperation = toolName.toLowerCase().includes('webhook');
  const shouldBlock = isDevWorkflow(tags) && (isWebhookOperation || hasWebhookNode);

  if (shouldBlock) {
    logBlocked('[DEV] workflow with webhook - must publish first');
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          '[DEV] workflow has webhook - publish first: Save > Publish button > Verify path',
      },
    };
  }

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
    },
  };
}

// Register the hook
registerHook('workflow-publishing-gate', 'PreToolUse', workflowPublishingGateHook);

export default workflowPublishingGateHook;
