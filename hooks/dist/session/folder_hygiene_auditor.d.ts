/**
 * Folder Hygiene Auditor
 *
 * Scans project root for organizational issues on session start:
 * - Garbage filenames (Windows defaults, empty files)
 * - Naming violations (spaces in filenames)
 * - Organization issues (too many files at root)
 * - Screenshots at project root
 *
 * Severity: WARN (logs issues but doesn't block)
 * Action: Suggests mv commands, tracks in hygiene-audit-registry.json
 *
 * CRITICAL: NO DELETION - only move to old/ directory per Spinal Cord rules.
 * All suggestions MUST use `mv` commands, never `rm`, `del`, or `delete`.
 *
 * @see https://github.com/atgfw/claude-config/issues/20
 */
import type { SessionCheckResult } from '../types.js';
/**
 * Hygiene issue types
 */
export type HygieneIssue = {
    type: 'garbage_file' | 'naming_violation' | 'organization' | 'screenshot_at_root';
    path: string;
    filename: string;
    suggestion: string;
    severity: 'warn' | 'info';
};
/**
 * Audit result
 */
export type HygieneAuditResult = SessionCheckResult & {
    issues: HygieneIssue[];
};
/**
 * Run hygiene audit on project
 */
export declare function auditFolderHygiene(projectDirectory?: string): HygieneAuditResult;
export default auditFolderHygiene;
//# sourceMappingURL=folder_hygiene_auditor.d.ts.map