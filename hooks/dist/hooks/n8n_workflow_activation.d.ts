/**
 * n8n Workflow Activation Hook (PostToolUse)
 *
 * ENSURES n8n workflows are activated after creation to enable MCP-level access.
 * Webhook triggers only respond when workflows are active.
 *
 * This hook:
 * 1. Intercepts n8n_create_workflow completion
 * 2. Checks if workflow is active
 * 3. Auto-activates if inactive
 * 4. Provides status context to LLM
 *
 * Part of the Spinal Cord governance system.
 */
import type { PostToolUseInput, PostToolUseOutput } from '../types.js';
/**
 * n8n Workflow Activation Hook Implementation
 */
export declare function n8nWorkflowActivationHook(input: PostToolUseInput): Promise<PostToolUseOutput>;
export default n8nWorkflowActivationHook;
//# sourceMappingURL=n8n_workflow_activation.d.ts.map