/**
 * Pre-Build Gate Hook
 *
 * BLOCKS implementation code writes when:
 * 1. PROJECT-DIRECTIVE.md is missing from project root
 * 2. Enforcer audit checkboxes in design.md are still PENDING
 *
 * This hook enforces the governance rule that specs must be fully audited
 * before proceeding to BUILD phase.
 *
 * Part of the Spinal Cord - correction ledger entry i4f37h9g8j0k1234
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
/**
 * Pre-Build Gate Hook Implementation
 */
export declare function preBuildGateHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default preBuildGateHook;
//# sourceMappingURL=pre_build_gate.d.ts.map