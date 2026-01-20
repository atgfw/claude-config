/**
 * Workflow Publishing Gate Hook
 * BLOCKS webhook triggers on unpublished [DEV] workflows
 * Enforces: "Unpublished workflows have webhook triggers that only work in test mode"
 */

import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
import { log, logBlocked, logAllowed } from '../utils.js';
import { registerHook } from '../runner.js';

/**
 * Check if tool is an n8n webhook trigger
 */
function isN8nWebhookTrigger(toolName: string): boolean {
  return toolName.toLowerCase().includes('n8n') && toolName.toLowerCase().includes('webhook');
}

/**
 * Extract workflow info from tool input
 */
function extractWorkflowInfo(input: PreToolUseInput): { workflowId?: string; tags?: string[] } {
  const toolInput = input.tool_input;
  if (!toolInput || typeof toolInput !== 'object') {
    return {};
  }

  // Try to find workflow_id
  let workflowId: string | undefined;
  if ('workflow_id' in toolInput && typeof toolInput['workflow_id'] === 'string') {
    workflowId = toolInput['workflow_id'];
  } else if ('workflowId' in toolInput && typeof toolInput['workflowId'] === 'string') {
    workflowId = toolInput['workflowId'];
  } else if ('id' in toolInput && typeof toolInput['id'] === 'string') {
    workflowId = toolInput['id'];
  }

  // Try to find tags
  let tags: string[] | undefined;
  if ('tags' in toolInput && Array.isArray(toolInput['tags'])) {
    tags = toolInput['tags'];
  }

  return { workflowId, tags };
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

  // Only check n8n webhook-related operations
  if (!isN8nWebhookTrigger(toolName)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  log(`Checking workflow publishing status...`);

  const { workflowId, tags } = extractWorkflowInfo(input);

  // If we detect [DEV] tag, block the operation
  if (isDevWorkflow(tags)) {
    logBlocked(
      'Unpublished [DEV] workflow detected',
      'All workflows with webhook triggers MUST be published before production use'
    );
    log('');
    log(
      'PROBLEM: Unpublished workflows ([DEV] tag) have webhook triggers that only work in test mode.'
    );
    log('');
    log('PUBLISHING CHECKLIST:');
    log('  1. Workflow is saved (no unsaved changes)');
    log('  2. Click "Publish" button (removes [DEV] tag)');
    log('  3. Verify webhook URL uses production path (not test path)');
    log('  4. Test production webhook endpoint');
    log('');
    log('WEBHOOK URL MODES:');
    log('  Test (DEV):   .../webhook-test/...  (before publishing)');
    log('  Production:   .../webhook/...       (after publishing)');
    log('');

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: 'Workflow must be published - remove [DEV] tag first',
      },
    };
  }

  // Workflow appears published or no tag info available
  if (workflowId) {
    logAllowed(`Workflow ${workflowId} appears published`);
  } else {
    logAllowed('Webhook trigger operation allowed');
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
