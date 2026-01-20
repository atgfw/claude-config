/**
 * Code Node Linting Gate Hook
 *
 * ENFORCES JavaScript quality standards for n8n code nodes.
 * Part of the Spinal Cord - global governance for child projects.
 *
 * Rules (see CLAUDE.md "Code Node Governance"):
 * - Code node JavaScript must pass standard linting rules
 * - Centralize logic in code nodes (warn on complex inline expressions)
 * - n8n-specific patterns are allowed (documented exceptions)
 * - Same quality standards as regular JavaScript files
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
interface N8nNode {
    name: string;
    type: string;
    parameters?: {
        jsCode?: string;
        code?: string;
        [key: string]: unknown;
    };
}
interface N8nWorkflowPayload {
    name?: string;
    nodes?: N8nNode[];
}
interface LintingResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}
/**
 * n8n globals that are allowed in code nodes
 * These would normally be flagged as undefined by linters
 * Exported for documentation and potential future use
 */
export declare const N8N_GLOBALS: Set<string>;
/**
 * Patterns that are valid in n8n code nodes but might trigger linters
 * Exported for documentation and potential future use
 */
export declare const N8N_ALLOWED_PATTERNS: RegExp[];
/**
 * Lint JavaScript code from n8n code node
 */
export declare function lintCodeNodeContent(code: string): LintingResult;
/**
 * Check for complex inline expressions in non-code nodes
 * Returns true if the expression is too complex and should be in a code node
 */
export declare function isComplexInlineExpression(expression: string): boolean;
/**
 * Extract code from a code node
 */
export declare function extractCodeFromNode(node: N8nNode): string | null;
/**
 * Validate all code nodes in a workflow
 */
export declare function validateWorkflowCodeNodes(payload: N8nWorkflowPayload): LintingResult;
/**
 * Main code node linting gate hook
 */
export declare function codeNodeLintingGateHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default codeNodeLintingGateHook;
//# sourceMappingURL=code_node_linting_gate.d.ts.map