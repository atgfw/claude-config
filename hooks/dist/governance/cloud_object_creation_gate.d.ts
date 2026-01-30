/**
 * Cloud Object Creation Gate
 *
 * P0-CRITICAL: Blocks ALL cloud object creation/update MCP tools unless
 * the hierarchical development pipeline was followed:
 * 1. PROJECT-DIRECTIVE.md exists
 * 2. Spec files exist for the entity
 * 3. test-run-registry has 3 novel runs
 * 4. Local version-controlled files exist
 *
 * Root cause: Correction ledger 6367b84b1230db23 - Claude deployed 4
 * workflows to cloud bypassing all file-based governance gates.
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
/**
 * Check if a tool name matches cloud creation/update patterns
 */
export declare function isCloudCreationTool(toolName: string): boolean;
/**
 * Extract entity name from tool input
 */
export declare function extractEntityName(toolInput: Record<string, unknown>): string | null;
/**
 * Walk up directory tree looking for PROJECT-DIRECTIVE.md
 */
export declare function findProjectDirective(startDir: string): string | null;
/**
 * Check test-run-registry for novel run count
 */
export declare function checkTestRunRegistry(registryPath: string, entityName: string): number;
export declare function cloudObjectCreationGateHook(input: PreToolUseInput, options?: {
    cwd?: string;
}): Promise<PreToolUseOutput>;
export default cloudObjectCreationGateHook;
//# sourceMappingURL=cloud_object_creation_gate.d.ts.map