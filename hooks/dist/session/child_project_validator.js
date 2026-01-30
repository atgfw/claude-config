/**
 * Child Project Validator
 *
 * Wraps the child_project_detector to validate that the current project
 * does not contain local overrides of the Spinal Cord configuration.
 *
 * Severity: STRICT (blocks session on error-level violations)
 */
import process from 'node:process';
import { log } from '../utils.js';
import { scanForOverrides, reportViolations, } from '../enforcement/child_project_detector.js';
/**
 * Validate that current project doesn't override Spinal Cord
 */
export function validateChildProject(projectDirectory) {
    const directory = projectDirectory ?? process.cwd();
    log('[CHECK] Scanning for child project overrides...');
    const violations = scanForOverrides(directory);
    if (violations.length === 0) {
        log('[OK] No override violations detected');
        return {
            name: 'Child Project Isolation',
            passed: true,
            severity: 'strict',
            message: 'No local overrides detected - using global configuration',
        };
    }
    // Separate errors from warnings
    const errors = violations.filter((v) => v.severity === 'error');
    const warnings = violations.filter((v) => v.severity === 'warning');
    // Log the report
    log(reportViolations(violations));
    if (errors.length > 0) {
        // STRICT: Block session on errors
        return {
            name: 'Child Project Isolation',
            passed: false,
            severity: 'strict',
            message: `${errors.length} prohibited override(s) detected`,
            details: errors.map((v) => `${v.description}: ${v.path}`),
        };
    }
    // Only warnings - allow but note them
    return {
        name: 'Child Project Isolation',
        passed: true,
        severity: 'warn',
        message: `${warnings.length} configuration warning(s)`,
        details: warnings.map((v) => `${v.description}: ${v.path}`),
    };
}
export default validateChildProject;
//# sourceMappingURL=child_project_validator.js.map