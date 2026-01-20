/**
 * n8n Dual Trigger Validator Hook
 *
 * ENFORCES the mandatory dual trigger pattern for n8n subworkflows:
 * - Subworkflows with executeWorkflowTrigger MUST also have a webhook trigger
 * - Webhook path MUST follow api/{workflow-name} convention
 * - Both triggers MUST connect to a merge node
 *
 * This enables automated API access to subworkflows that would otherwise
 * only be callable from parent orchestrators.
 *
 * Note: We use "api/" prefix (not "test/") to avoid confusion with n8n's
 * built-in test vs production webhook modes.
 *
 * Part of the Spinal Cord governance system.
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
/**
 * n8n Dual Trigger Validator Hook Implementation
 */
export declare function n8nDualTriggerValidatorHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default n8nDualTriggerValidatorHook;
//# sourceMappingURL=n8n_dual_trigger_validator.d.ts.map