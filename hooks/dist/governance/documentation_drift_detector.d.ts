/**
 * Documentation Drift Detector
 *
 * Detects inconsistencies between:
 * 1. Local workflow JSON files and cloud workflow names
 * 2. Local registry files and actual cloud state
 * 3. AUDIT documents and current workflow IDs
 *
 * This is a utility module that can be invoked by hooks or manually.
 * Part of the Spinal Cord governance system.
 */
export interface DriftIssue {
    type: 'name_mismatch' | 'id_mismatch' | 'missing_local' | 'missing_cloud' | 'stale_reference';
    severity: 'error' | 'warning' | 'info';
    file: string;
    message: string;
    localValue?: string;
    cloudValue?: string;
    recommendation: string;
}
export interface DriftReport {
    projectRoot: string;
    timestamp: string;
    issues: DriftIssue[];
    totalIssues: number;
    errorCount: number;
    warningCount: number;
}
/**
 * Parse workflow JSON file to extract name and ID
 */
export declare function parseWorkflowJson(filePath: string): {
    name: string;
    id?: string;
} | null;
/**
 * Parse workflow-ids.json registry
 */
export declare function parseWorkflowRegistry(projectRoot: string): Map<string, {
    name: string;
    id: string;
}>;
/**
 * Find all local workflow JSON files
 */
export declare function findLocalWorkflows(projectRoot: string): Map<string, string>;
/**
 * Scan markdown files for workflow ID references and check for staleness
 */
export declare function findStaleReferences(projectRoot: string, validIds: Set<string>): DriftIssue[];
/**
 * Compare local workflows against cloud workflows
 * cloudWorkflows should be a map of ID -> name from n8n API
 */
export declare function detectDrift(projectRoot: string, cloudWorkflows: Map<string, string>): DriftReport;
/**
 * Format drift report for logging
 */
export declare function formatDriftReport(report: DriftReport): string;
/**
 * Save drift report to ledger
 */
export declare function saveDriftReport(report: DriftReport): void;
//# sourceMappingURL=documentation_drift_detector.d.ts.map