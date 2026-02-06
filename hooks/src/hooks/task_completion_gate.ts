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

import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
import { logVerbose } from '../utils.js';
import { registerHook } from '../runner.js';
import { onTaskComplete } from '../github/task_source_sync.js';

/**
 * Valid evidence types for task completion
 */
interface ValidationEvidence {
  executionId?: string;
  execution_id?: string; // snake_case variant
  userConfirmed?: boolean;
  testPassed?: {
    testId?: string;
    timestamp?: number;
  };
  evidencePath?: string;
}

/**
 * Check if metadata contains valid completion evidence
 */
function hasValidEvidence(metadata: Record<string, unknown> | undefined): {
  valid: boolean;
  evidenceType?: string;
} {
  if (!metadata || typeof metadata !== 'object') {
    return { valid: false };
  }

  const evidence = metadata as ValidationEvidence;

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
  if (
    evidence.testPassed &&
    typeof evidence.testPassed === 'object' &&
    evidence.testPassed.testId &&
    typeof evidence.testPassed.testId === 'string'
  ) {
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
export async function taskCompletionGateHook(input: PreToolUseInput): Promise<PreToolUseOutput> {
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

  const toolInput = input.tool_input as {
    taskId?: string;
    status?: string;
    metadata?: Record<string, unknown>;
  };

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
      } catch {
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

  // Warn but allow completion without evidence
  logVerbose('[task-completion-gate] [!] WARN: No validation evidence provided');

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason:
        '[!] WARN: No validation evidence. Consider adding metadata with ONE of: ' +
        'executionId, userConfirmed: true, testPassed: { testId, timestamp }, or evidencePath.',
    },
  };
}

// Register the hook
registerHook('task-completion-gate', 'PreToolUse', taskCompletionGateHook);

export default taskCompletionGateHook;
