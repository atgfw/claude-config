/**
 * Vitest Migration Enforcer Hook
 * BLOCKS Jest imports and requires Vitest migration
 * Enforces: "Vitest is the ONLY approved test framework"
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
/**
 * Vitest Migration Enforcer Hook Implementation
 *
 * Blocks Write/Edit operations that introduce Jest usage.
 * Requires migration to Vitest per CLAUDE.md.
 */
export declare function vitestMigrationEnforcerHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default vitestMigrationEnforcerHook;
//# sourceMappingURL=vitest_migration_enforcer.d.ts.map