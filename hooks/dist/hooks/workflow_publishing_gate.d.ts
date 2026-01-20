/**
 * Workflow Publishing Gate Hook
 * BLOCKS webhook triggers on unpublished [DEV] workflows
 * Enforces: "Unpublished workflows have webhook triggers that only work in test mode"
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
/**
 * Workflow Publishing Gate Hook Implementation
 *
 * Blocks webhook triggers on unpublished workflows.
 * Workflows with [DEV] tag must be published before production use.
 */
export declare function workflowPublishingGateHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default workflowPublishingGateHook;
//# sourceMappingURL=workflow_publishing_gate.d.ts.map