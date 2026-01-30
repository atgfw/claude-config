/**
 * n8n Node Reference Validator Hook
 *
 * Scans code node jsCode for $('...') patterns and validates that
 * referenced node names exist in the workflow nodes array.
 * Prevents silent runtime failures from stale node references.
 *
 * Triggers on: n8n_create_workflow, n8n_update_partial_workflow, n8n_update_full_workflow
 */
import { log, logBlocked, logAllowed } from '../utils.js';
import { registerHook } from '../runner.js';
// ============================================================================
// Core Logic
// ============================================================================
/** Extract $('NodeName') references from code */
function extractNodeReferences(code) {
    const refs = [];
    // Match $('...') and $("...")
    const pattern = /\$\(\s*['"]([^'"]+)['"]\s*\)/g;
    let match;
    while ((match = pattern.exec(code)) !== null) {
        if (match[1])
            refs.push(match[1]);
    }
    return [...new Set(refs)];
}
/** Validate all code node references against known node names */
function validateReferences(nodes) {
    const nodeNames = new Set(nodes.map((n) => n.name));
    const errors = [];
    for (const node of nodes) {
        const code = node.parameters?.jsCode;
        if (!code || typeof code !== 'string')
            continue;
        const refs = extractNodeReferences(code);
        for (const ref of refs) {
            if (!nodeNames.has(ref)) {
                errors.push(`Node "${node.name}" references non-existent node "$('${ref}')"`);
            }
        }
    }
    return { valid: errors.length === 0, errors };
}
// ============================================================================
// Hook Handler
// ============================================================================
const MONITORED_TOOLS = [
    'mcp__n8n-mcp__n8n_create_workflow',
    'mcp__n8n-mcp__n8n_update_full_workflow',
    'mcp__n8n-mcp__n8n_update_partial_workflow',
];
async function handler(input) {
    const { tool_name, tool_input } = input;
    if (!MONITORED_TOOLS.includes(tool_name)) {
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    // Extract nodes from different tool input shapes
    let nodes = [];
    if (tool_name === 'mcp__n8n-mcp__n8n_create_workflow') {
        nodes = tool_input.nodes || [];
    }
    else if (tool_name === 'mcp__n8n-mcp__n8n_update_full_workflow') {
        nodes = tool_input.nodes || [];
    }
    else if (tool_name === 'mcp__n8n-mcp__n8n_update_partial_workflow') {
        // For partial updates, we can only validate addNode/updateNode operations
        // that contain jsCode. Cross-reference validation requires fetching the
        // full workflow first, which is outside hook scope. Log a warning instead.
        const operations = tool_input.operations || [];
        // Check updateNode ops that set jsCode - extract refs but we can't
        // validate against full node list. Just check for obviously broken patterns.
        for (const op of operations) {
            if (op.type === 'updateNode' && op.updates?.parameters?.jsCode) {
                const code = op.updates.parameters.jsCode;
                const refs = extractNodeReferences(code);
                if (refs.length > 0) {
                    log(`[!] Node update contains $() references: ${refs.join(', ')}. ` +
                        `Cannot validate against full workflow from partial update. ` +
                        `Verify references manually.`);
                }
            }
            if (op.type === 'addNode' && op.node?.parameters?.jsCode) {
                const refs = extractNodeReferences(op.node.parameters.jsCode);
                if (refs.length > 0) {
                    log(`[!] New node "${op.node.name}" contains $() references: ${refs.join(', ')}. ` +
                        `Verify these nodes exist in the workflow.`);
                }
            }
        }
        // Allow partial updates - just warn
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    // Full validation for create/full-update
    if (nodes.length === 0) {
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    const result = validateReferences(nodes);
    if (!result.valid) {
        logBlocked(`Stale node references found:\n${result.errors.join('\n')}`);
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'deny',
                permissionDecisionReason: `Stale node references detected. ${result.errors.join('; ')}. ` +
                    `Fix $() references to match current node names before deploying.`,
            },
        };
    }
    logAllowed('All node references valid');
    return {
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'allow',
        },
    };
}
// ============================================================================
// Registration
// ============================================================================
registerHook('n8n-node-reference-validator', 'PreToolUse', handler);
export { extractNodeReferences, validateReferences };
//# sourceMappingURL=n8n_node_reference_validator.js.map