/**
 * Workflow Intent Detection Hook
 * Detects n8n workflow-related requests and triggers skill invocation
 *
 * Hook: UserPromptSubmit
 * Behavior: Only fires in n8n projects, outputs mandatory skill instruction
 */
import { UserPromptSubmitInput, UserPromptSubmitOutput } from '../../types.js';
export declare function workflowIntentHook(input: UserPromptSubmitInput): Promise<UserPromptSubmitOutput>;
export default workflowIntentHook;
//# sourceMappingURL=workflow_intent.d.ts.map