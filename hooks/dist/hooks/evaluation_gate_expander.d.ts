/**
 * Evaluation Gate Expander Hook
 * VALIDATES 98%+ success rate, 20+ test cases for workflows exiting [DEV]
 * Enforces: "n8n's native Evaluations feature is the official testing mechanism for [DEV] workflow exit"
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
/**
 * Evaluation Gate Expander Hook Implementation
 *
 * Supports two input formats:
 * 1. Operations array format (partial updates with addTag/removeTag)
 * 2. Workflow object format (full workflow with tags array)
 */
export declare function evaluationGateExpanderHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default evaluationGateExpanderHook;
//# sourceMappingURL=evaluation_gate_expander.d.ts.map