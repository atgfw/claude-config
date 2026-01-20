/**
 * n8n Dual Trigger Validator Hook
 *
 * ENFORCES the mandatory dual trigger pattern for n8n subworkflows:
 * - Subworkflows with executeWorkflowTrigger MUST also have a webhook trigger
 * - Webhook path MUST follow api/{workflow-name} convention
 * - Both triggers MUST connect to a merge node
 *
 * This enables automated API access to subworkflows that would otherwise
 * only be callable from parent orchestrators.
 *
 * Note: We use "api/" prefix (not "test/") to avoid confusion with n8n's
 * built-in test vs production webhook modes.
 *
 * Part of the Spinal Cord governance system.
 */
import { log, logBlocked, logAllowed } from '../utils.js';
import { registerHook } from '../runner.js';
/**
 * Check if a node is an executeWorkflowTrigger (subworkflow entry point)
 */
function isExecuteWorkflowTrigger(node) {
    return node.type === 'n8n-nodes-base.executeWorkflowTrigger';
}
/**
 * Check if a node is a webhook trigger
 */
function isWebhookTrigger(node) {
    return node.type === 'n8n-nodes-base.webhook';
}
/**
 * Check if a node is a merge node
 */
function isMergeNode(node) {
    return node.type === 'n8n-nodes-base.merge';
}
/**
 * Extract webhook path from webhook node
 */
function getWebhookPath(node) {
    if (!isWebhookTrigger(node))
        return undefined;
    return node.parameters?.['path'];
}
// api/ path prefix check removed - flat kebab-case paths are the standard
// (webhook-path-validator enforces flat paths, no slashes allowed)
/**
 * Validate workflow for dual trigger pattern
 */
function validateDualTrigger(workflow) {
    const result = {
        valid: true,
        isSubworkflow: false,
        hasExecuteWorkflowTrigger: false,
        hasWebhookTrigger: false,
        hasApiPath: false,
        hasMergeNode: false,
        errors: [],
        warnings: [],
        suggestions: [],
    };
    const nodes = workflow.nodes ?? [];
    // Find trigger nodes
    const executeWorkflowTriggers = nodes.filter(isExecuteWorkflowTrigger);
    const webhookTriggers = nodes.filter(isWebhookTrigger);
    const mergeNodes = nodes.filter(isMergeNode);
    result.hasExecuteWorkflowTrigger = executeWorkflowTriggers.length > 0;
    result.hasWebhookTrigger = webhookTriggers.length > 0;
    result.hasMergeNode = mergeNodes.length > 0;
    // If no executeWorkflowTrigger, this is not a subworkflow - allow
    if (!result.hasExecuteWorkflowTrigger) {
        result.isSubworkflow = false;
        return result;
    }
    // This IS a subworkflow - enforce dual trigger
    result.isSubworkflow = true;
    // Check for webhook trigger
    if (!result.hasWebhookTrigger) {
        result.valid = false;
        result.errors.push('Subworkflow has executeWorkflowTrigger but no webhook trigger for API access');
        result.suggestions.push('Add a webhook trigger with path "api/{workflow-name}"');
        result.suggestions.push('Connect both triggers to a Merge node');
    }
    else {
        // Check webhook path
        const webhookNode = webhookTriggers[0];
        if (webhookNode) {
            result.webhookPath = getWebhookPath(webhookNode);
        }
        // api/ prefix check removed - flat kebab-case paths are the standard
        // (webhook-path-validator enforces flat paths, no slashes allowed)
        result.hasApiPath = true;
    }
    // Check for merge node (recommended but not blocking)
    if (result.hasExecuteWorkflowTrigger && result.hasWebhookTrigger && !result.hasMergeNode) {
        result.warnings.push('No Merge node found - both triggers should connect to a Merge node');
        result.suggestions.push('Add a Merge node (mode: passThrough) after both triggers');
    }
    return result;
}
/**
 * Extract workflow data from MCP tool input
 */
function extractWorkflowData(input) {
    const toolInput = input.tool_input;
    if (!toolInput || typeof toolInput !== 'object')
        return null;
    // Check for workflow data in various possible locations
    const workflow = toolInput['workflow'];
    if (workflow)
        return workflow;
    // Check if nodes are directly in tool_input
    if (toolInput['nodes'] && Array.isArray(toolInput['nodes'])) {
        return {
            name: toolInput['name'],
            nodes: toolInput['nodes'],
            connections: toolInput['connections'],
        };
    }
    // Check for JSON string
    const workflowJson = toolInput['workflow_json'];
    if (workflowJson) {
        try {
            return JSON.parse(workflowJson);
        }
        catch {
            return null;
        }
    }
    return null;
}
/**
 * Generate the correct dual trigger template
 */
function generateDualTriggerTemplate(workflowName) {
    const safeName = workflowName
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '');
    return `
// Required nodes for dual trigger pattern:

1. executeWorkflowTrigger (existing):
{
  "name": "Start (Subworkflow)",
  "type": "n8n-nodes-base.executeWorkflowTrigger",
  "position": [0, 0]
}

2. Webhook Trigger (ADD THIS):
{
  "name": "Start (API Webhook)",
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "path": "api/${safeName}",
    "httpMethod": "POST",
    "responseMode": "lastNode"
  },
  "position": [0, 200]
}

3. Merge Node (ADD THIS):
{
  "name": "Merge Triggers",
  "type": "n8n-nodes-base.merge",
  "parameters": {
    "mode": "passThrough",
    "output": "input1"
  },
  "position": [300, 100]
}

4. Connect both triggers to Merge node
5. Connect Merge node to rest of workflow
`.trim();
}
/**
 * n8n Dual Trigger Validator Hook Implementation
 */
export async function n8nDualTriggerValidatorHook(input) {
    const toolName = input.tool_name ?? '';
    log(`[DUAL TRIGGER] Validating n8n workflow operation: ${toolName}`);
    // Extract workflow data
    const workflow = extractWorkflowData(input);
    // CHECK: Banned nodes (Google Sheets)
    const bannedNodeTypes = ['n8n-nodes-base.googleSheets', 'n8n-nodes-base.googleSheetsV2'];
    if (workflow?.nodes) {
        for (const node of workflow.nodes) {
            if (bannedNodeTypes.includes(node.type)) {
                logBlocked('Banned node: ' + node.type, 'Use n8n Data Tables instead');
                return {
                    hookSpecificOutput: {
                        hookEventName: 'PreToolUse',
                        permissionDecision: 'deny',
                        permissionDecisionReason: 'Google Sheets nodes banned. Use n8n Data Tables (n8n-nodes-base.n8nTables) instead.',
                    },
                };
            }
        }
    }
    if (!workflow) {
        // No workflow data to validate - allow
        logAllowed('No workflow data to validate');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    // Validate dual trigger pattern
    const validation = validateDualTrigger(workflow);
    // Not a subworkflow - allow
    if (!validation.isSubworkflow) {
        logAllowed('Not a subworkflow (no executeWorkflowTrigger) - dual trigger not required');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    // Subworkflow with valid dual trigger - allow
    if (validation.valid) {
        if (validation.warnings.length > 0) {
            log('');
            log('[DUAL TRIGGER WARNINGS]');
            for (const warning of validation.warnings) {
                log(`  - ${warning}`);
            }
            log('');
        }
        logAllowed(`Subworkflow has valid dual trigger pattern (webhook: ${validation.webhookPath})`);
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    // Subworkflow missing dual trigger - block
    log('');
    log('[DUAL TRIGGER BLOCKED]');
    log('');
    log('ERRORS:');
    for (const error of validation.errors) {
        log(`  - ${error}`);
    }
    if (validation.warnings.length > 0) {
        log('');
        log('WARNINGS:');
        for (const warning of validation.warnings) {
            log(`  - ${warning}`);
        }
    }
    log('');
    log('SUGGESTIONS:');
    for (const suggestion of validation.suggestions) {
        log(`  - ${suggestion}`);
    }
    const workflowName = workflow.name ?? 'subworkflow';
    log('');
    log('REQUIRED PATTERN:');
    log(generateDualTriggerTemplate(workflowName));
    logBlocked('Subworkflow missing dual trigger pattern', 'n8n subworkflows MUST have both executeWorkflowTrigger AND webhook trigger for API access');
    return {
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: `DUAL TRIGGER BLOCKED: ${validation.errors.join('; ')}. Subworkflows must have webhook trigger with api/{name} path for API access.`,
        },
    };
}
// Register the hook
registerHook('n8n-dual-trigger-validator', 'PreToolUse', n8nDualTriggerValidatorHook);
export default n8nDualTriggerValidatorHook;
//# sourceMappingURL=n8n_dual_trigger_validator.js.map