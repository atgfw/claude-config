/**
 * Issue File Detector
 * Detects whether an issue's referenced file/entity already exists on disk.
 * Used by: issue_crud.ts (pre-creation gate), session_start.ts (reconciliation audit).
 */
/**
 * Extract candidate filenames/entities from an issue title.
 * Returns an array of possible file stems to search for.
 */
export declare function extractCandidates(title: string): string[];
/**
 * Search common locations for a candidate file.
 * Returns the first matching absolute path, or null.
 */
export declare function findFile(candidate: string, cwd?: string): string | null;
/**
 * Detect whether an issue title references a file/entity that already exists on disk.
 * Returns the first matching file path, or null if nothing found.
 */
export declare function detectImplementedFile(issueTitle: string, cwd?: string): string | null;
//# sourceMappingURL=issue_file_detector.d.ts.map