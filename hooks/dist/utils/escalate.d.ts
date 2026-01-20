/**
 * Escalate Utility
 *
 * Public API for child projects and hooks to record escalations.
 * Handles deduplication, cooldown, pattern detection, and proposal triggering.
 */
import type { EscalateParams, EscalationResult, EscalationCategory, EscalationSeverity } from '../types.js';
/**
 * Auto-detect the current project path from cwd
 */
export declare function getProjectPath(): string;
/**
 * Extract project name from path
 */
export declare function getProjectName(projectPath: string): string;
/**
 * Record an escalation from a child project or hook
 *
 * This is the main public API for the escalation system.
 * It handles:
 * - Symptom hash generation for deduplication
 * - Cooldown enforcement (prevents spam)
 * - Cross-project pattern detection
 * - Status transitions when thresholds are met
 *
 * @param params Escalation parameters
 * @returns Result containing the escalation entry and metadata
 */
export declare function escalate(params: EscalateParams): EscalationResult;
/**
 * Record an escalation with explicit project path
 * (Used for testing and when auto-detection isn't appropriate)
 */
export declare function escalateWithProject(params: EscalateParams, projectPath: string, projectName: string): EscalationResult;
/**
 * Record an escalation from a hook
 *
 * Automatically sets the hook name in relatedHooks and
 * uses 'tooling' category by default.
 *
 * @param hookName Name of the hook recording the escalation
 * @param params Escalation parameters (category defaults to 'tooling')
 * @returns Result containing the escalation entry and metadata
 */
export declare function escalateFromHook(hookName: string, params: Omit<EscalateParams, 'relatedHooks'> & {
    category?: EscalationCategory;
}): EscalationResult;
/**
 * Quick escalation for governance issues
 */
export declare function escalateGovernance(symptom: string, context: string, proposedSolution: string, severity?: EscalationSeverity): EscalationResult;
/**
 * Quick escalation for testing issues
 */
export declare function escalateTesting(symptom: string, context: string, proposedSolution: string, severity?: EscalationSeverity): EscalationResult;
/**
 * Quick escalation for tooling issues
 */
export declare function escalateTooling(symptom: string, context: string, proposedSolution: string, severity?: EscalationSeverity): EscalationResult;
/**
 * Quick escalation for security issues (high severity default)
 */
export declare function escalateSecurity(symptom: string, context: string, proposedSolution: string, severity?: EscalationSeverity): EscalationResult;
/**
 * Meta-escalation for issues with the escalation system itself
 */
export declare function escalateMeta(symptom: string, context: string, proposedSolution: string, severity?: EscalationSeverity): EscalationResult;
declare const _default: {
    getProjectPath: typeof getProjectPath;
    getProjectName: typeof getProjectName;
    escalate: typeof escalate;
    escalateWithProject: typeof escalateWithProject;
    escalateFromHook: typeof escalateFromHook;
    escalateGovernance: typeof escalateGovernance;
    escalateTesting: typeof escalateTesting;
    escalateTooling: typeof escalateTooling;
    escalateSecurity: typeof escalateSecurity;
    escalateMeta: typeof escalateMeta;
};
export default _default;
//# sourceMappingURL=escalate.d.ts.map