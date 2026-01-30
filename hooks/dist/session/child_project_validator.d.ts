/**
 * Child Project Validator
 *
 * Wraps the child_project_detector to validate that the current project
 * does not contain local overrides of the Spinal Cord configuration.
 *
 * Severity: STRICT (blocks session on error-level violations)
 */
import type { SessionCheckResult } from '../types.js';
/**
 * Validate that current project doesn't override Spinal Cord
 */
export declare function validateChildProject(projectDirectory?: string): SessionCheckResult;
export default validateChildProject;
//# sourceMappingURL=child_project_validator.d.ts.map