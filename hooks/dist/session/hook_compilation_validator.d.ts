/**
 * Hook Compilation Validator
 *
 * Validates that compiled hooks (dist/) are up-to-date with source (src/).
 * Self-heals by running build if stale, blocks session if build fails.
 *
 * Severity: STRICT (blocks session on failure)
 */
import type { SessionCheckResult } from '../types.js';
/**
 * Check if any source file is newer than its compiled counterpart
 */
export declare function findStaleCompilations(hooksDirectoryPath?: string): {
    stale: Array<{
        source: string;
        compiled: string;
        sourceMtime: number;
        compiledMtime: number;
    }>;
    missing: string[];
};
/**
 * Attempt to rebuild hooks
 */
export declare function rebuildHooks(hooksDirectoryPath?: string): {
    success: boolean;
    error?: string;
};
/**
 * Validate hook compilation and self-heal if needed
 */
export declare function validateHookCompilation(hooksDirectoryPath?: string): SessionCheckResult;
export default validateHookCompilation;
//# sourceMappingURL=hook_compilation_validator.d.ts.map