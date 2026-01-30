/**
 * Documentation Drift Checker
 *
 * Wraps the documentation_drift_detector for session start checks.
 * Performs local-only drift detection (no cloud API calls at session start).
 *
 * Severity: WARN (logs warning but doesn't block)
 */
import type { SessionCheckResult } from '../types.js';
import { type DriftReport } from '../governance/documentation_drift_detector.js';
/**
 * Perform local-only drift detection
 * Does not call cloud APIs - only checks local file consistency
 */
export declare function checkLocalDrift(projectDirectory?: string): DriftReport;
/**
 * Check for documentation drift at session start
 */
export declare function checkDocumentationDrift(projectDirectory?: string): SessionCheckResult;
export default checkDocumentationDrift;
//# sourceMappingURL=documentation_drift_checker.d.ts.map