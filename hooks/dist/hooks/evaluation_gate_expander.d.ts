/**
 * Evaluation Gate Expander Hook
 * VALIDATES 98%+ success rate, 20+ test cases for workflows exiting [DEV]
 * Enforces: "n8n's native Evaluations feature is the official testing mechanism for [DEV] workflow exit"
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
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
export declare function evaluationGateExpanderHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default evaluationGateExpanderHook;
//# sourceMappingURL=evaluation_gate_expander.d.ts.map