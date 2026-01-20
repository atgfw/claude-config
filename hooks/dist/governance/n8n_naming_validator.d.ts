/**
 * n8n Naming Validator Hook
 *
 * ENFORCES naming conventions for n8n workflows and nodes.
 * Part of the Spinal Cord - global governance for child projects.
 *
 * Rules (see CLAUDE.md "n8n Naming Conventions"):
 * - Reserve [TAG] syntax for systems without built-in tags (n8n has native tags)
 * - Use full system names as prefixes (ServiceTitan_ not [ST])
 * - Ban version numbers in names (v1, v2, r1, r2)
 * - Enforce snake_case for node names
 * - Ban arbitrary integers in names (unless canonical like base64, oauth2)
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
interface N8nNode {
    name: string;
    type: string;
    parameters?: Record<string, unknown>;
}
interface N8nWorkflowPayload {
    name?: string;
    nodes?: N8nNode[];
}
interface NamingValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
    suggestions: string[];
}
/**
 * Check if name contains bracket tag syntax [TAG]
 */
export declare function containsBracketTag(name: string): {
    found: boolean;
    tag: string | null;
};
/**
 * Check if name contains version number patterns (v1, v2, r1, _1, etc.)
 */
export declare function containsVersionNumber(name: string): {
    found: boolean;
    pattern: string | null;
};
/**
 * Check if name is snake_case
 * Allows alphanumeric lowercase and underscores
 */
export declare function isSnakeCase(name: string): boolean;
/**
 * Convert name to suggested snake_case
 */
export declare function toSnakeCase(name: string): string;
/**
 * Check if name contains arbitrary integers (not canonical)
 */
export declare function containsArbitraryInteger(name: string): {
    found: boolean;
    integer: string | null;
};
/**
 * Suggest full system name prefix from abbreviation
 */
export declare function suggestSystemPrefix(tag: string): string | null;
/**
 * Validate a workflow name
 */
export declare function validateWorkflowName(name: string): NamingValidationResult;
/**
 * Validate a node name
 */
export declare function validateNodeName(name: string): NamingValidationResult;
/**
 * Validate an entire workflow payload (name + all nodes)
 */
export declare function validateWorkflowPayload(payload: N8nWorkflowPayload): NamingValidationResult;
/**
 * Main n8n naming validator hook
 */
export declare function n8nNamingValidatorHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default n8nNamingValidatorHook;
//# sourceMappingURL=n8n_naming_validator.d.ts.map