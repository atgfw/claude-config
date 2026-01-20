/**
 * Child Project Override Detection
 *
 * Detects and prevents local overrides in child projects.
 * Child projects MUST NOT contain project-specific configurations
 * that override or conflict with the global .claude project.
 *
 * Prohibited in child projects:
 * - .mcp.json or MCP server configurations
 * - Custom hooks or settings.json
 * - .env files with API credentials
 * - Tool preference overrides
 * - Any configuration that shadows global behavior
 */
/**
 * Violation details
 */
export interface Violation {
    type: 'file' | 'pattern';
    path: string;
    description: string;
    severity: 'error' | 'warning';
}
/**
 * Scan a directory for prohibited override files
 */
export declare function scanForOverrides(projectDir: string): Violation[];
/**
 * Check the current working directory for violations
 */
export declare function checkCurrentProject(): Violation[];
/**
 * Report violations and optionally record to correction ledger
 */
export declare function reportViolations(violations: Violation[], recordToLedger?: boolean): string;
/**
 * Enforce no overrides - returns true if clean, false if violations found
 */
export declare function enforceNoOverrides(): boolean;
/**
 * Auto-cleanup option - move violations to old/
 * USE WITH CAUTION - this modifies the filesystem
 */
export declare function cleanupViolations(projectDir: string): {
    cleaned: string[];
    failed: string[];
};
declare const _default: {
    scanForOverrides: typeof scanForOverrides;
    checkCurrentProject: typeof checkCurrentProject;
    reportViolations: typeof reportViolations;
    enforceNoOverrides: typeof enforceNoOverrides;
    cleanupViolations: typeof cleanupViolations;
};
export default _default;
//# sourceMappingURL=child_project_detector.d.ts.map