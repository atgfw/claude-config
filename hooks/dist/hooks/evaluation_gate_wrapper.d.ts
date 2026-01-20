/**
 * Evaluation Gate Hook Wrapper
 *
 * Enforces n8n Evaluation requirements before allowing workflows to exit [DEV] status.
 * This wrapper integrates the evaluation_gate.ts with the CLI runner system.
 *
 * Triggers on: mcp__n8n-mcp__n8n_update_partial_workflow
 * When: Operation includes removeTag for [DEV] tag ID
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
/**
 * Evaluation Gate Hook Implementation for CLI
 *
 * Wrapper that:
 * 1. Logs hook execution details
 * 2. Calls the core evaluation_gate.ts logic
 * 3. Handles API errors gracefully
 */
export declare function evaluationGateWrapperHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default evaluationGateWrapperHook;
//# sourceMappingURL=evaluation_gate_wrapper.d.ts.map