/**
 * n8n Webhook Path Validator Hook
 *
 * ENFORCES webhook path naming conventions for n8n workflows.
 * Part of the Spinal Cord - global governance for child projects.
 *
 * Rules (see hooks/docs/n8n-governance.md "Webhook Path Naming"):
 * 1. Webhook trigger paths must be named (not empty)
 * 2. Must be kebab-case
 * 3. Same or similar name as workflow
 * 4. Long names allowed if perfectly prescriptive
 * 5. Webhook path should NOT be nested (no slashes)
 * 6. Webhook node name itself should always be just 'webhook'
 * 7. Path should never contain the word "test"
 * 8. All webhook triggers must authenticate by a unique secret key
 * 9. CRITICAL: webhookId field REQUIRED (undocumented n8n requirement)
 *    - Without webhookId, n8n returns 404 "The requested webhook is not registered"
 *    - See docs/N8N-SUBWORKFLOW-ARCHITECTURE.md for details
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
interface N8nNode {
    name: string;
    type: string;
    webhookId?: string;
    parameters?: Record<string, unknown>;
}
interface N8nWorkflowPayload {
    name?: string;
    nodes?: N8nNode[];
}
interface WebhookValidationResult {
    valid: boolean;
    skipped?: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
}
/**
 * Check if path is kebab-case
 * kebab-case: lowercase letters, numbers, hyphens only
 * Must not start or end with hyphen, no consecutive hyphens
 */
export declare function isKebabCase(path: string): boolean;
/**
 * Convert various formats to kebab-case
 */
export declare function toKebabCase(name: string): string;
/**
 * Check if path contains nested segments (slashes)
 */
export declare function isNestedPath(path: string): boolean;
/**
 * Check if path contains the word "test" (case insensitive)
 * Only matches "test" as a word, not as substring of other words
 */
export declare function containsTestWord(path: string): boolean;
/**
 * Check if webhook parameters include header authentication
 */
export declare function hasAuthenticationHeader(parameters: Record<string, unknown>): boolean;
/**
 * Check if webhook path matches or relates to workflow name
 */
export declare function pathMatchesWorkflowName(path: string, workflowName: string): boolean;
/**
 * Generate environment variable name for webhook secret
 */
export declare function generateSecretKeyName(webhookPath: string): string;
/**
 * Validate a webhook path
 */
export declare function validateWebhookPath(path: string, workflowName: string): WebhookValidationResult;
/**
 * Validate a webhook node
 */
export declare function validateWebhookNode(node: N8nNode, workflowName: string): WebhookValidationResult;
/**
 * Validate all webhook nodes in a workflow payload
 */
export declare function validateWebhookPayload(payload: N8nWorkflowPayload): WebhookValidationResult;
/**
 * Main n8n webhook path validator hook
 */
export declare function n8nWebhookPathValidatorHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default n8nWebhookPathValidatorHook;
//# sourceMappingURL=n8n_webhook_path_validator.d.ts.map