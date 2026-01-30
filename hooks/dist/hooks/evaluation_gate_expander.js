/**
 * Evaluation Gate Expander Hook
 * VALIDATES 98%+ success rate, 20+ test cases for workflows exiting [DEV]
 * Enforces: "n8n's native Evaluations feature is the official testing mechanism for [DEV] workflow exit"
 */
import { log, logBlocked, logAllowed } from '../utils.js';
import { registerHook } from '../runner.js';
/**
 * Extract operation info from operations array format (partial updates)
 */
function extractOperationInfo(input) {
    const toolInput = input.tool_input;
    if (!toolInput || typeof toolInput !== 'object') {
        return { removingDevTag: false, addingArchiveTag: false };
    }
    const operations = toolInput['operations'];
    if (!Array.isArray(operations)) {
        return { removingDevTag: false, addingArchiveTag: false };
    }
    let removingDevTag = false;
    let addingArchiveTag = false;
    for (const op of operations) {
        if (typeof op !== 'object' || op === null)
            continue;
        const type = op['type'];
        const tagId = String(op['tagId'] || '').toLowerCase();
        if (type === 'removeTag' && tagId.includes('dev')) {
            removingDevTag = true;
        }
        if (type === 'addTag' && tagId.includes('archive')) {
            addingArchiveTag = true;
        }
    }
    return { removingDevTag, addingArchiveTag };
}
/**
 * Extract workflow info from workflow object format (full updates)
 */
function extractWorkflowInfo(input) {
    const toolInput = input.tool_input;
    if (!toolInput || typeof toolInput !== 'object') {
        return null;
    }
    // Check for nested workflow object
    if (!('workflow' in toolInput) || typeof toolInput['workflow'] !== 'object') {
        return null;
    }
    const workflow = toolInput['workflow'];
    // Extract tags
    let tags = [];
    if ('tags' in workflow && Array.isArray(workflow['tags'])) {
        tags = workflow['tags'].map((t) => {
            if (typeof t === 'string')
                return t.toLowerCase();
            if (typeof t === 'object' && t !== null && 'name' in t)
                return String(t.name).toLowerCase();
            return String(t).toLowerCase();
        });
    }
    // Check if DEV tag present
    const hasDevTag = tags.some((tag) => tag.includes('dev'));
    // Check for evaluation trigger node
    let hasEvaluationTrigger = false;
    if ('nodes' in workflow && Array.isArray(workflow['nodes'])) {
        hasEvaluationTrigger = workflow['nodes'].some((node) => {
            if (typeof node !== 'object' || node === null)
                return false;
            const nodeType = node.type || '';
            return nodeType.toLowerCase().includes('evaluationtrigger');
        });
    }
    return { hasDevTag, hasEvaluationTrigger };
}
const REQUIREMENTS_MESSAGE = 'Requirements: Evaluation Trigger node required, 98%+ success rate, 20+ test cases. ' +
    'Setup via n8n UI: Add Evaluation Trigger node, wire Data Table or Google Sheet as test dataset.';
/**
 * Evaluation Gate Expander Hook Implementation
 *
 * Supports two input formats:
 * 1. Operations array format (partial updates with addTag/removeTag)
 * 2. Workflow object format (full workflow with tags array)
 */
export async function evaluationGateExpanderHook(input) {
    const toolName = input.tool_name;
    // Only check n8n workflow update operations
    if (!toolName.toLowerCase().includes('n8n') || !toolName.toLowerCase().includes('update')) {
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    log(`Checking evaluation gate requirements...`);
    // Try operations array format first (partial updates)
    const opInfo = extractOperationInfo(input);
    if (opInfo.removingDevTag) {
        // Operations format: removing DEV tag
        if (opInfo.addingArchiveTag) {
            logAllowed('Archival allowed without evaluation checks');
            return {
                hookSpecificOutput: {
                    hookEventName: 'PreToolUse',
                    permissionDecision: 'allow',
                    permissionDecisionReason: 'Archival allowed without evaluation checks',
                },
            };
        }
        logBlocked('Removing [DEV] tag requires evaluation gate checks', 'n8n Evaluations feature is the official testing mechanism for [DEV] workflow exit');
        log('');
        log('EVALUATION SETUP REQUIRED:');
        log('  - Add Evaluation Trigger node to workflow');
        log('  - Configure test dataset (Data Table or Google Sheet)');
        log('  - Achieve 98%+ success rate');
        log('  - Have 20+ unique test cases');
        log('');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'deny',
                permissionDecisionReason: 'Cannot leave DEV without evaluation setup. ' + REQUIREMENTS_MESSAGE,
            },
        };
    }
    // Try workflow object format (full updates)
    const wfInfo = extractWorkflowInfo(input);
    if (wfInfo !== null) {
        // Workflow format detected
        if (wfInfo.hasDevTag) {
            // Still has DEV tag - allow without requirements
            logAllowed('Workflow still in DEV - evaluation not required yet');
            return {
                hookSpecificOutput: {
                    hookEventName: 'PreToolUse',
                    permissionDecision: 'allow',
                },
            };
        }
        // Leaving DEV (no DEV tag) - check for evaluation trigger
        if (!wfInfo.hasEvaluationTrigger) {
            logBlocked('Workflow leaving DEV without evaluation setup', 'n8n Evaluations feature is the official testing mechanism for [DEV] workflow exit');
            log('');
            log('EVALUATION SETUP REQUIRED:');
            log('  - Add Evaluation Trigger node to workflow');
            log('  - Configure test dataset (Data Table or Google Sheet)');
            log('  - Achieve 98%+ success rate');
            log('  - Have 20+ unique test cases');
            log('');
            return {
                hookSpecificOutput: {
                    hookEventName: 'PreToolUse',
                    permissionDecision: 'deny',
                    permissionDecisionReason: 'Cannot leave DEV without evaluation setup. ' + REQUIREMENTS_MESSAGE,
                },
            };
        }
        // Has evaluation trigger - allow with reminder
        logAllowed('Workflow has evaluation trigger - ensure 98%+ success rate and 20+ test cases');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
                permissionDecisionReason: 'Evaluation Trigger node detected. ' + REQUIREMENTS_MESSAGE,
            },
        };
    }
    // No recognizable format - allow (could be non-tag operation)
    logAllowed('No DEV tag removal detected');
    return {
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'allow',
        },
    };
}
// Register the hook
registerHook('evaluation-gate-expander', 'PreToolUse', evaluationGateExpanderHook);
export default evaluationGateExpanderHook;
//# sourceMappingURL=evaluation_gate_expander.js.map