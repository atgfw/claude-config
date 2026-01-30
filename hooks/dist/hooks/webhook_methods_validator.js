/**
 * Webhook Methods Validator Hook
 * VALIDATES webhook httpMethod configuration exists
 * Enforces: "Webhook triggers must accept ALL expected HTTP methods"
 */
import { logVerbose, logWarn, logTerse } from '../utils.js';
import { registerHook } from '../runner.js';
/**
 * Check if tool is an n8n workflow creation/update operation
 */
function isN8nWorkflowOperation(toolName) {
    const lowerName = toolName.toLowerCase();
    return (lowerName.includes('n8n') &&
        (lowerName.includes('create') || lowerName.includes('update') || lowerName.includes('save')));
}
/**
 * Extract workflow definition from tool input
 */
function extractWorkflowDefinition(input) {
    const toolInput = input.tool_input;
    if (!toolInput || typeof toolInput !== 'object') {
        return undefined;
    }
    // Try common field names for workflow data
    if ('workflow' in toolInput && typeof toolInput['workflow'] === 'object') {
        return toolInput['workflow'];
    }
    if ('workflow_data' in toolInput && typeof toolInput['workflow_data'] === 'object') {
        return toolInput['workflow_data'];
    }
    if ('definition' in toolInput && typeof toolInput['definition'] === 'object') {
        return toolInput['definition'];
    }
    // If tool_input itself looks like a workflow definition
    if ('nodes' in toolInput && Array.isArray(toolInput['nodes'])) {
        return toolInput;
    }
    return undefined;
}
/**
 * Find webhook nodes in workflow definition
 */
function findWebhookNodes(workflowDef) {
    if (!('nodes' in workflowDef) || !Array.isArray(workflowDef['nodes'])) {
        return [];
    }
    const nodes = workflowDef['nodes'];
    return nodes.filter((node) => {
        if (!node || typeof node !== 'object')
            return false;
        const type = node['type'];
        return typeof type === 'string' && type.includes('webhook');
    });
}
/**
 * Check if webhook node has httpMethod configured
 */
function hasHttpMethodConfigured(webhookNode) {
    if (!('parameters' in webhookNode))
        return false;
    const params = webhookNode['parameters'];
    if (!params || typeof params !== 'object')
        return false;
    const paramsObj = params;
    return 'httpMethod' in paramsObj && paramsObj['httpMethod'] !== undefined;
}
/**
 * Webhook Methods Validator Hook Implementation
 *
 * Validates that webhook triggers have httpMethod configuration.
 * Prevents webhook triggers that may not accept expected HTTP methods.
 */
export async function webhookMethodsValidatorHook(input) {
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
    logVerbose(`[webhook-methods] Checking httpMethod config...`);
    const workflowDef = extractWorkflowDefinition(input);
    if (!workflowDef) {
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    const webhookNodes = findWebhookNodes(workflowDef);
    if (webhookNodes.length === 0) {
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    // Check each webhook node for httpMethod configuration
    const unconfiguredNodes = [];
    for (const node of webhookNodes) {
        const nodeName = node['name'] || 'unknown';
        if (!hasHttpMethodConfigured(node)) {
            unconfiguredNodes.push(String(nodeName));
        }
    }
    if (unconfiguredNodes.length > 0) {
        logWarn(`Webhook missing httpMethod: ${unconfiguredNodes.join(', ')}`);
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
                permissionDecisionReason: `Webhook nodes without httpMethod: ${unconfiguredNodes.join(', ')}. Configure GET/POST.`,
            },
        };
    }
    logTerse(`[+] ${webhookNodes.length} webhooks have httpMethod`);
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
//# sourceMappingURL=webhook_methods_validator.js.map