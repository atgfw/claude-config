/**
 * Code Node Test Validator Hook
 *
 * ENFORCES the mandated test pattern for Code node local testing:
 * 1. Must use .test.ts extension (not .js)
 * 2. Must have Vitest imports (describe, it, expect)
 * 3. Must have companion fixtures/ directory
 * 4. Must have *-input.json and *-expected.json fixture files
 *
 * This hook prevents ad-hoc console.log testing in favor of
 * structured Vitest + fixture-based testing.
 *
 * Part of the Spinal Cord - correction ledger entry j5g48i0h9k1l2345
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
/**
 * Code Node Test Validator Hook Implementation
 */
export declare function codeNodeTestValidatorHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default codeNodeTestValidatorHook;
//# sourceMappingURL=code_node_test_validator.d.ts.map