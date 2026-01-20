/**
 * Plan Completeness Gate Hook
 *
 * BLOCKS plan completion when governance requirements not met:
 * 1. PROJECT-DIRECTIVE.md alignment not verified
 * 2. Node-level specs missing for code nodes
 * 3. Enforcer audit not completed
 * 4. Research source quota not met
 * 5. TBD/TODO/INCOMPLETE markers present
 *
 * Runs on Write/Edit to openspec markdown files and ExitPlanMode.
 *
 * Part of the Spinal Cord governance system.
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
/**
 * Plan Completeness Gate Hook Implementation
 */
export declare function planCompletenessGateHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default planCompletenessGateHook;
//# sourceMappingURL=plan_completeness_gate.d.ts.map