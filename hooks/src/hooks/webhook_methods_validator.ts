/**
 * Webhook Methods Validator Hook
 * VALIDATES webhook httpMethod configuration exists
 * Enforces: "Webhook triggers must accept ALL expected HTTP methods"
 */

import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
import { log, logBlocked, logAllowed } from '../utils.js';
import { registerHook } from '../runner.js';

/**
 * Check if tool is an n8n workflow creation/update operation
 */
function isN8nWorkflowOperation(toolName: string): boolean {
  const lowerName = toolName.toLowerCase();
  return (
    lowerName.includes('n8n') &&
    (lowerName.includes('create') || lowerName.includes('update') || lowerName.includes('save'))
  );
}

/**
 * Extract workflow definition from tool input
 */
function extractWorkflowDefinition(input: PreToolUseInput): Record<string, unknown> | undefined {
  const toolInput = input.tool_input;
  if (!toolInput || typeof toolInput !== 'object') {
    return undefined;
  }

  // Try common field names for workflow data
  if ('workflow' in toolInput && typeof toolInput['workflow'] === 'object') {
    return toolInput['workflow'] as Record<string, unknown>;
  }

  if ('workflow_data' in toolInput && typeof toolInput['workflow_data'] === 'object') {
    return toolInput['workflow_data'] as Record<string, unknown>;
  }

  if ('definition' in toolInput && typeof toolInput['definition'] === 'object') {
    return toolInput['definition'] as Record<string, unknown>;
  }

  // If tool_input itself looks like a workflow definition
  if ('nodes' in toolInput && Array.isArray(toolInput['nodes'])) {
    return toolInput as Record<string, unknown>;
  }

  return undefined;
}

/**
 * Find webhook nodes in workflow definition
 */
function findWebhookNodes(workflowDef: Record<string, unknown>): Array<Record<string, unknown>> {
  if (!('nodes' in workflowDef) || !Array.isArray(workflowDef['nodes'])) {
    return [];
  }

  const nodes = workflowDef['nodes'] as Array<Record<string, unknown>>;
  return nodes.filter((node) => {
    if (!node || typeof node !== 'object') return false;
    const type = node['type'];
    return typeof type === 'string' && type.includes('webhook');
  });
}

/**
 * Check if webhook node has httpMethod configured
 */
function hasHttpMethodConfigured(webhookNode: Record<string, unknown>): boolean {
  if (!('parameters' in webhookNode)) return false;

  const params = webhookNode['parameters'];
  if (!params || typeof params !== 'object') return false;

  const paramsObj = params as Record<string, unknown>;
  return 'httpMethod' in paramsObj && paramsObj['httpMethod'] !== undefined;
}

/**
 * Webhook Methods Validator Hook Implementation
 *
 * Validates that webhook triggers have httpMethod configuration.
 * Prevents webhook triggers that may not accept expected HTTP methods.
 */
export async function webhookMethodsValidatorHook(
  input: PreToolUseInput
): Promise<PreToolUseOutput> {
  const toolName = input.tool_name;

  // Only check n8n workflow creation/update operations
  if (!isN8nWorkflowOperation(toolName)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  log(`Checking webhook httpMethod configuration...`);

  const workflowDef = extractWorkflowDefinition(input);

  if (!workflowDef) {
    // No workflow definition found, allow (might not be a workflow operation)
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  // Find webhook nodes
  const webhookNodes = findWebhookNodes(workflowDef);

  if (webhookNodes.length === 0) {
    // No webhook nodes, allow
    logAllowed('No webhook nodes found');
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  // Check each webhook node for httpMethod configuration
  const unconfiguredNodes: string[] = [];

  for (const node of webhookNodes) {
    const nodeName = node['name'] || 'unknown';
    if (!hasHttpMethodConfigured(node)) {
      unconfiguredNodes.push(String(nodeName));
    }
  }

  if (unconfiguredNodes.length > 0) {
    logBlocked(
      'Webhook nodes missing httpMethod configuration',
      'Webhook triggers must accept ALL expected HTTP methods'
    );
    log('');
    log(`Unconfigured webhook nodes: ${unconfiguredNodes.join(', ')}`);
    log('');
    log('PROBLEM: Webhook triggers may not accept the HTTP methods that callers use.');
    log('');
    log('CONFIGURATION:');
    log('  {');
    log('    "name": "Start (API Webhook)",');
    log('    "type": "n8n-nodes-base.webhook",');
    log('    "parameters": {');
    log('      "path": "api/workflow-name",');
    log("      \"httpMethod\": \"={{['GET','POST'].join(',')}}\",  ← REQUIRED");
    log('      "responseMode": "lastNode"');
    log('    }');
    log('  }');
    log('');
    log('COMMON METHODS BY USE CASE:');
    log('  API endpoint (read/write):  GET, POST');
    log('  Form submission:            POST');
    log('  REST resource:              GET, POST, PUT, DELETE');
    log('  Health check:               GET');
    log('');

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `Webhook nodes must have httpMethod configured: ${unconfiguredNodes.join(', ')}`,
      },
    };
  }

  logAllowed(`All ${webhookNodes.length} webhook nodes have httpMethod configured`);

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
    },
  };
}

// Register the hook
registerHook('webhook-methods-validator', 'PreToolUse', webhookMethodsValidatorHook);

export default webhookMethodsValidatorHook;
