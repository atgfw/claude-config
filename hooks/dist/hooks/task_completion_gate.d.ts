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
/**
 * Task Completion Gate Hook Implementation
 *
 * Intercepts TaskUpdate with status='completed' and requires validation evidence.
 */
export declare function taskCompletionGateHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default taskCompletionGateHook;
//# sourceMappingURL=task_completion_gate.d.ts.map