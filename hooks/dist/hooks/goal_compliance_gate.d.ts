/**
 * Goal Compliance Gate Hook
 *
 * Stop hook that validates the active goal against Task Specification v1.0 schema.
 * Blocks session stop if goal is non-compliant with required sections.
 *
 * Required sections for compliance:
 * - Focus (title with action verb)
 * - Which (target object with path)
 * - Lest (at least 1 failure mode)
 * - With (tools/dependencies listed)
 * - Measured By (at least 1 success metric)
 */
import type { StopInput, StopOutput } from '../types.js';
import { type GoalLevel } from '../session/goal_stack.js';
export interface ComplianceCheck {
    section: string;
    required: boolean;
    present: boolean;
    message?: string;
}
export interface ComplianceResult {
    compliant: boolean;
    score: number;
    checks: ComplianceCheck[];
    missing_required: string[];
}
/**
 * Validate a goal against the Task Specification v1.0 schema.
 */
export declare function validateGoalCompliance(goal: GoalLevel): ComplianceResult;
/**
 * Format compliance result for output.
 */
export declare function formatComplianceResult(result: ComplianceResult): string;
/**
 * Stop hook that validates goal compliance before allowing session end.
 */
declare function goalComplianceGateHook(input: StopInput): Promise<StopOutput>;
export { goalComplianceGateHook };
export default goalComplianceGateHook;
//# sourceMappingURL=goal_compliance_gate.d.ts.map