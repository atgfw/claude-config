/**
 * Task Completion Gate Hook
 *
 * P0-CRITICAL: Blocks task completion without production validation evidence.
 *
 * Problem: Tasks are marked complete without production validation.
 * "Code exists" is treated as "system works."
 *
 * Solution: Require ONE of the following evidence types:
 * - executionId: Production execution ID (n8n, ElevenLabs, etc.)
 * - userConfirmed: Explicit user approval via AskUserQuestion
 * - testPassed: Automated test with real data { testId, timestamp }
 * - evidencePath: Screenshot or log file path
 *
 * Anti-patterns blocked:
 * - "Tests pass" (mock data)
 * - "File written successfully"
 * - "Build completed"
 * - "Deployed" (without execution verification)
 */
import { logVerbose, logBlocked } from '../utils.js';
import { registerHook } from '../runner.js';
import { onTaskComplete } from '../github/task_source_sync.js';
/**
 * Check if metadata contains valid completion evidence
 */
function hasValidEvidence(metadata) {
    if (!metadata || typeof metadata !== 'object') {
        return { valid: false };
    }
    const evidence = metadata;
    // Check executionId (camelCase or snake_case)
    if (evidence.executionId && typeof evidence.executionId === 'string') {
        return { valid: true, evidenceType: 'executionId' };
    }
    if (evidence.execution_id && typeof evidence.execution_id === 'string') {
        return { valid: true, evidenceType: 'execution_id' };
    }
    // Check userConfirmed (must be explicitly true)
    if (evidence.userConfirmed === true) {
        return { valid: true, evidenceType: 'userConfirmed' };
    }
    // Check testPassed (must have testId)
    if (evidence.testPassed &&
        typeof evidence.testPassed === 'object' &&
        evidence.testPassed.testId &&
        typeof evidence.testPassed.testId === 'string') {
        return { valid: true, evidenceType: 'testPassed' };
    }
    // Check evidencePath (must be non-empty string)
    if (evidence.evidencePath && typeof evidence.evidencePath === 'string') {
        return { valid: true, evidenceType: 'evidencePath' };
    }
    return { valid: false };
}
/**
 * Task Completion Gate Hook Implementation
 *
 * Intercepts TaskUpdate with status='completed' and requires validation evidence.
 */
export async function taskCompletionGateHook(input) {
    const toolName = input.tool_name;
    // Only intercept TaskUpdate
    if (toolName !== 'TaskUpdate') {
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    const toolInput = input.tool_input;
    // Only gate completion (status='completed')
    if (toolInput.status !== 'completed') {
        logVerbose(`[task-completion-gate] status=${toolInput.status} - not completion`);
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    logVerbose(`[task-completion-gate] Checking evidence for task: ${toolInput.taskId}`);
    // Check for valid evidence
    const { valid, evidenceType } = hasValidEvidence(toolInput.metadata);
    if (valid) {
        logVerbose(`[task-completion-gate] Valid evidence: ${evidenceType}`);
        // Auto-close linked GitHub issue when task completes with evidence
        if (toolInput.taskId) {
            try {
                onTaskComplete(toolInput.taskId);
            }
            catch {
                // Non-blocking - issue close failure should not block task completion
            }
        }
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
                permissionDecisionReason: `Task completion allowed: ${evidenceType} provided`,
            },
        };
    }
    // Block completion without evidence
    logBlocked('Task completion requires validation evidence');
    return {
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: 'Task completion blocked: No validation evidence. ' +
                'Add metadata with ONE of: executionId (production run), ' +
                'userConfirmed: true (explicit approval), ' +
                'testPassed: { testId, timestamp } (real test), ' +
                'evidencePath (screenshot/log).',
        },
    };
}
// Register the hook
registerHook('task-completion-gate', 'PreToolUse', taskCompletionGateHook);
export default taskCompletionGateHook;
//# sourceMappingURL=task_completion_gate.js.map