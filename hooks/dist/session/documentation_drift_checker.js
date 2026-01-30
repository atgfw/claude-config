/**
 * Documentation Drift Checker
 *
 * Wraps the documentation_drift_detector for session start checks.
 * Performs local-only drift detection (no cloud API calls at session start).
 *
 * Severity: WARN (logs warning but doesn't block)
 */
import process from 'node:process';
import { log } from '../utils.js';
import { parseWorkflowRegistry, findLocalWorkflows, findStaleReferences, formatDriftReport, } from '../governance/documentation_drift_detector.js';
/**
 * Perform local-only drift detection
 * Does not call cloud APIs - only checks local file consistency
 */
export function checkLocalDrift(projectDirectory) {
    const projectRoot = projectDirectory ?? process.cwd();
    const issues = [];
    // Load local registry
    const registry = parseWorkflowRegistry(projectRoot);
    // Load local workflow files
    const localWorkflows = findLocalWorkflows(projectRoot);
    // Check for file name vs workflow name drift in local files
    for (const [name, filePath] of localWorkflows) {
        const fileName = filePath.split(/[/\\]/).pop()?.replace('.json', '') ?? '';
        if (fileName !== name && !fileName.includes(name) && !name.includes(fileName)) {
            issues.push({
                type: 'name_mismatch',
                severity: 'warning',
                file: filePath,
                message: `File name "${fileName}.json" doesn't match workflow name "${name}"`,
                localValue: fileName,
                cloudValue: name,
                recommendation: 'Rename file to match workflow name',
            });
        }
    }
    // Check for stale ID references in documentation
    // Use registry IDs as "valid" for local-only check
    const validIds = new Set(registry.keys());
    const staleReferences = findStaleReferences(projectRoot, validIds);
    issues.push(...staleReferences);
    return {
        projectRoot,
        timestamp: new Date().toISOString(),
        issues,
        totalIssues: issues.length,
        errorCount: issues.filter((index) => index.severity === 'error').length,
        warningCount: issues.filter((index) => index.severity === 'warning').length,
    };
}
/**
 * Check for documentation drift at session start
 */
export function checkDocumentationDrift(projectDirectory) {
    const directory = projectDirectory ?? process.cwd();
    log('[CHECK] Scanning for documentation drift...');
    const report = checkLocalDrift(directory);
    if (report.totalIssues === 0) {
        log('[OK] No documentation drift detected');
        return {
            name: 'Documentation Drift',
            passed: true,
            severity: 'info',
            message: 'Local documentation appears consistent',
        };
    }
    // Log the report
    log(formatDriftReport(report));
    if (report.errorCount > 0) {
        return {
            name: 'Documentation Drift',
            passed: true, // WARN severity - don't block
            severity: 'warn',
            message: `${report.errorCount} error(s), ${report.warningCount} warning(s) in documentation`,
            details: report.issues.slice(0, 5).map((index) => index.message),
        };
    }
    return {
        name: 'Documentation Drift',
        passed: true,
        severity: 'warn',
        message: `${report.warningCount} documentation warning(s)`,
        details: report.issues.slice(0, 5).map((index) => index.message),
    };
}
export default checkDocumentationDrift;
//# sourceMappingURL=documentation_drift_checker.js.map