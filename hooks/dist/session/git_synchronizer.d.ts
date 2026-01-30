/**
 * Git Synchronizer
 *
 * Synchronizes local repository with remote on session start.
 * Fetches remote changes, auto-pulls if clean, warns if dirty.
 *
 * Severity: WARN (logs warning but doesn't block)
 */
import type { SessionCheckResult } from '../types.js';
/**
 * Check if a directory is a git repository
 */
export declare function isGitRepository(directory: string): boolean;
/**
 * Get the current branch name
 */
export declare function getCurrentBranch(directory: string): string | undefined;
/**
 * Check if working tree has uncommitted changes
 */
export declare function hasUncommittedChanges(directory: string): boolean;
/**
 * Get count of commits ahead/behind remote
 */
export declare function getRemoteStatus(directory: string): {
    ahead: number;
    behind: number;
} | undefined;
/**
 * Fetch from remote
 */
export declare function fetchRemote(directory: string): {
    success: boolean;
    error?: string;
};
/**
 * Pull from remote (fast-forward only)
 */
export declare function pullRemote(directory: string): {
    success: boolean;
    error?: string;
};
/**
 * Synchronize git repository with remote
 */
export declare function synchronizeGit(directory: string): SessionCheckResult;
export default synchronizeGit;
//# sourceMappingURL=git_synchronizer.d.ts.map