/**
 * Success Criteria Tracker
 *
 * Parses PROJECT-DIRECTIVE.md success criteria and tracks their verification status.
 * This ledger ensures that all measurable success criteria are verified before
 * a project phase can be considered complete.
 *
 * Part of the Spinal Cord governance system.
 */
export interface SuccessCriterion {
    id: string;
    text: string;
    verified: boolean;
    verifiedAt?: string;
    verifiedBy?: string;
    evidence?: string;
}
export interface SuccessCriteriaStatus {
    projectRoot: string;
    lastParsed: string;
    criteria: SuccessCriterion[];
    totalCount: number;
    verifiedCount: number;
    percentComplete: number;
}
/**
 * Parse PROJECT-DIRECTIVE.md and extract success criteria
 */
export declare function parseSuccessCriteria(projectRoot: string): SuccessCriterion[];
/**
 * Load success criteria status from ledger
 */
export declare function loadCriteriaStatus(projectRoot: string): SuccessCriteriaStatus | null;
/**
 * Save success criteria status to ledger
 */
export declare function saveCriteriaStatus(status: SuccessCriteriaStatus): void;
/**
 * Update or create success criteria status for a project
 */
export declare function updateCriteriaStatus(projectRoot: string): SuccessCriteriaStatus;
/**
 * Mark a criterion as verified
 */
export declare function verifyCriterion(projectRoot: string, criterionIdOrText: string, verifiedBy: string, evidence?: string): boolean;
/**
 * Get summary of unverified criteria for a project
 */
export declare function getUnverifiedCriteria(projectRoot: string): SuccessCriterion[];
/**
 * Check if all criteria are verified
 */
export declare function areAllCriteriaVerified(projectRoot: string): boolean;
/**
 * Format criteria status for logging
 */
export declare function formatCriteriaStatus(status: SuccessCriteriaStatus): string;
//# sourceMappingURL=success_criteria_tracker.d.ts.map