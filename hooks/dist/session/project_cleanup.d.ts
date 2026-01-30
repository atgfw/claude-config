/**
 * Project Cleanup
 *
 * Scans for and archives stale temporary files on session start.
 * Never deletes - always moves to old/YYYY-MM-DD/ directory.
 *
 * Severity: INFO (logs actions but doesn't block)
 */
import type { SessionCheckResult } from '../types.js';
/**
 * Clean up stale project files
 */
export declare function cleanupProject(projectDirectory?: string): SessionCheckResult;
export default cleanupProject;
//# sourceMappingURL=project_cleanup.d.ts.map