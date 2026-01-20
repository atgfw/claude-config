/**
 * N8N Workflow Governance Hook
 *
 * PREVENTS duplicate workflow creation by checking live n8n instance
 * before allowing n8n_create_workflow operations.
 *
 * Part of the Spinal Cord - global governance for child projects.
 *
 * Rules:
 * - Deletion BLOCKED (archive instead)
 * - Only DEV workflows can be modified
 * - Before creating, check ALL live workflows for duplicates
 * - New workflows auto-tagged as DEV
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
/**
 * Main n8n workflow governance hook
 */
export declare function n8nWorkflowGovernanceHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default n8nWorkflowGovernanceHook;
//# sourceMappingURL=n8n_workflow_governance.d.ts.map