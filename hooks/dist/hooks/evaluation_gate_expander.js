/**
 * Evaluation Gate Expander Hook
 * VALIDATES 98%+ success rate, 20+ test cases for workflows exiting [DEV]
 * Enforces: "n8n's native Evaluations feature is the official testing mechanism for [DEV] workflow exit"
 */
import { log, logBlocked, logAllowed } from '../utils.js';
import { registerHook } from '../runner.js';
/**
 * Extract workflow tag operation from tool input
 */
function extractTagOperation(input) {
    const toolInput = input.tool_input;
    if (!toolInput || typeof toolInput !== 'object') {
        return { removingDevTag: false, addingArchiveTag: false };
    }
    const workflowId = toolInput['id'] || toolInput['workflow_id'];
    const operations = toolInput['operations'];
    if (!Array.isArray(operations)) {
        return { workflowId: String(workflowId), removingDevTag: false, addingArchiveTag: false };
    }
    // Check if removing [DEV] tag
    const removingDevTag = operations.some((op) => {
        if (typeof op !== 'object' || !op)
            return false;
        const type = op['type'];
        const tagId = op['tagId'];
        // Common [DEV] tag IDs
        return (type === 'removeTag' &&
            (tagId === 'RL7B8tcKpAfwpHZR' || String(tagId).toLowerCase().includes('dev')));
    });
    // Check if adding [ARCHIVE] tag
    const addingArchiveTag = operations.some((op) => {
        if (typeof op !== 'object' || !op)
            return false;
        const type = op['type'];
        const tagId = op['tagId'];
        return type === 'addTag' && String(tagId).toLowerCase().includes('archive');
    });
    return { workflowId: String(workflowId), removingDevTag, addingArchiveTag };
}
/**
 * Evaluation Gate Expander Hook Implementation
 *
 * Blocks attempts to remove [DEV] tag from workflows without proper evaluation.
 * Requirements:
 * - BLOCKING: Evaluation Trigger node exists
 * - BLOCKING: Test dataset configured
 * - BLOCKING: 98%+ success rate
 * - ADVISORY: 20+ unique test cases
 * - BLOCKING: Error workflow configured
 */
export async function evaluationGateExpanderHook(input) {
    const toolName = input.tool_name;
    // Only check n8n workflow partial update operations
    if (!toolName.toLowerCase().includes('n8n') || !toolName.toLowerCase().includes('update')) {
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    log(`Checking evaluation gate requirements...`);
    const { workflowId, removingDevTag, addingArchiveTag } = extractTagOperation(input);
    // Only trigger if removing [DEV] tag
    if (!removingDevTag) {
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    // Allow if simultaneously adding [ARCHIVE] tag (archival always allowed)
    if (addingArchiveTag) {
        logAllowed('Archival allowed without evaluation checks');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
                permissionDecisionReason: 'Archival allowed without evaluation checks',
            },
        };
    }
    // Block removal of [DEV] tag - must go through evaluation process
    logBlocked('Removing [DEV] tag requires evaluation gate checks', 'n8n Evaluations feature is the official testing mechanism for [DEV] workflow exit');
    log('');
    log(`Workflow ID: ${workflowId || 'unknown'}`);
    log('');
    log('REQUIREMENTS TO LEAVE [DEV]:');
    log('  BLOCKING Requirements:');
    log('    - Evaluation Trigger node exists');
    log('    - Test dataset configured (Data Table or Google Sheet)');
    log('    - 98%+ success rate on evaluation runs');
    log('    - Error workflow configured');
    log('');
    log('  ADVISORY Requirements:');
    log('    - 20+ unique test cases');
    log('    - Time saved metric configured');
    log('    - MCP access decision made');
    log('');
    log('EVALUATION SETUP (Manual - UI Only):');
    log('  1. Wire up a test dataset');
    log('     - Create Data Table or Google Sheet with one input per row');
    log('     - Add Evaluation Trigger node to workflow');
    log('     - Connect trigger to existing workflow logic');
    log('');
    log('  2. Write workflow outputs back to dataset');
    log('     - Add Evaluation node with "Set Outputs" operation');
    log('     - Map output fields to dataset columns');
    log('');
    log('  3. Set up quality score (optional)');
    log('     - Add Evaluation node with "Set Metrics" operation');
    log('     - Configure Correctness, Helpfulness, or custom metrics');
    log('');
    log('  4. Run evaluations until 98%+ success rate achieved');
    log('');
    log('API LIMITATIONS:');
    log('  - Evaluation Tab Configuration: UI-only (manual setup required)');
    log('  - Data Tables CRUD API: Feature Request (use Google Sheets)');
    log('  - Evaluation Metrics Retrieval: Execution-based (parse workflow executions)');
    log('');
    log('After completing evaluations, use the evaluation-gate-wrapper hook to validate.');
    log('');
    return {
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: 'Evaluation gate checks required - use evaluation-gate-wrapper hook to validate',
        },
    };
}
// Register the hook
registerHook('evaluation-gate-expander', 'PreToolUse', evaluationGateExpanderHook);
export default evaluationGateExpanderHook;
//# sourceMappingURL=evaluation_gate_expander.js.map