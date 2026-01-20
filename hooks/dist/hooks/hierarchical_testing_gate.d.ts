/**
 * Hierarchical Testing Gate Hook
 *
 * Enforces the hierarchical testing governance for workflows:
 * 1. Nodes must be tested before workflow integration
 * 2. Subworkflows must be tested before parent orchestrators
 * 3. Dependencies (SW2-SW10 style) must be tested before dependents (SW0/SW1)
 *
 * BLOCKS workflow operations when:
 * - Building on untested foundations
 * - Modifying healthy entities without re-testing
 * - Creating parent workflows with unhealthy children
 *
 * Part of the Spinal Cord governance system.
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
/**
 * Hierarchical Testing Gate Hook Implementation
 */
export declare function hierarchicalTestingGateHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default hierarchicalTestingGateHook;
//# sourceMappingURL=hierarchical_testing_gate.d.ts.map