/**
 * Self-Audit Enforcement Hook
 *
 * BLOCKS task completion unless self-audit checklist is complete.
 * Runs at Stop event to ensure child sessions verify their work
 * before claiming completion.
 *
 * Requirements:
 * 1. Self-audit checklist must be completed
 * 2. All governance requirements verified
 * 3. Parent audit requested for significant work
 *
 * Part of the Spinal Cord governance system.
 */
import type { StopInput, StopOutput } from '../types.js';
/**
 * Self-Audit Enforcement Hook Implementation
 */
export declare function selfAuditEnforcementHook(_input: StopInput): Promise<StopOutput>;
export default selfAuditEnforcementHook;
//# sourceMappingURL=self_audit_enforcement.d.ts.map