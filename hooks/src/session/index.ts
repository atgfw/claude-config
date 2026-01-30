/**
 * Session Validation Modules
 *
 * Exports all session start validation functions for use in session_start.ts
 */

export { validateHookCompilation } from './hook_compilation_validator.js';
export { synchronizeGit, isGitRepository } from './git_synchronizer.js';
export { validateChildProject } from './child_project_validator.js';
export { checkDocumentationDrift } from './documentation_drift_checker.js';
export { cleanupProject } from './project_cleanup.js';
export { auditFolderHygiene } from './folder_hygiene_auditor.js';
