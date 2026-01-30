/**
 * Git Synchronizer
 *
 * Synchronizes local repository with remote on session start.
 * Fetches remote changes, auto-pulls if clean, warns if dirty.
 *
 * Severity: WARN (logs warning but doesn't block)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { log } from '../utils.js';
const gitFetchTimeoutMs = 30_000; // 30 seconds
/**
 * Check if a directory is a git repository
 */
export function isGitRepository(directory) {
    const gitDirectory = path.join(directory, '.git');
    return fs.existsSync(gitDirectory);
}
/**
 * Execute a git command with timeout
 */
function executeGit(command, cwd, timeoutMs = gitFetchTimeoutMs) {
    try {
        const output = execSync(`git ${command}`, {
            cwd,
            encoding: 'utf8',
            stdio: 'pipe',
            timeout: timeoutMs,
        });
        return { success: true, output: output.trim() };
    }
    catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown error';
        return { success: false, output: '', error: message };
    }
}
/**
 * Get the current branch name
 */
export function getCurrentBranch(directory) {
    const result = executeGit('rev-parse --abbrev-ref HEAD', directory, 5000);
    return result.success ? result.output : undefined;
}
/**
 * Check if working tree has uncommitted changes
 */
export function hasUncommittedChanges(directory) {
    const result = executeGit('status --porcelain', directory, 5000);
    return result.success && result.output.length > 0;
}
/**
 * Get count of commits ahead/behind remote
 */
export function getRemoteStatus(directory) {
    const branch = getCurrentBranch(directory);
    if (!branch) {
        return undefined;
    }
    // Check if tracking remote
    const trackingResult = executeGit(`rev-parse --abbrev-ref ${branch}@{upstream}`, directory, 5000);
    if (!trackingResult.success) {
        return undefined; // No upstream configured
    }
    const result = executeGit(`rev-list --left-right --count ${branch}...@{upstream}`, directory, 5000);
    if (!result.success) {
        return undefined;
    }
    const parts = result.output.split(/\s+/);
    if (parts.length !== 2) {
        return undefined;
    }
    return {
        ahead: Number.parseInt(parts[0] ?? '0', 10),
        behind: Number.parseInt(parts[1] ?? '0', 10),
    };
}
/**
 * Fetch from remote
 */
export function fetchRemote(directory) {
    log('[GIT] Fetching from remote...');
    const result = executeGit('fetch', directory, gitFetchTimeoutMs);
    if (result.success) {
        log('[GIT] Fetch complete');
    }
    else {
        log(`[GIT] Fetch failed: ${result.error}`);
    }
    return { success: result.success, error: result.error };
}
/**
 * Pull from remote (fast-forward only)
 */
export function pullRemote(directory) {
    log('[GIT] Pulling from remote (fast-forward)...');
    const result = executeGit('pull --ff-only', directory, gitFetchTimeoutMs);
    if (result.success) {
        log('[GIT] Pull complete');
    }
    else {
        log(`[GIT] Pull failed: ${result.error}`);
    }
    return { success: result.success, error: result.error };
}
/**
 * Synchronize git repository with remote
 */
export function synchronizeGit(directory) {
    // Check if git repo
    if (!isGitRepository(directory)) {
        return {
            name: 'Git Sync',
            passed: true,
            severity: 'info',
            message: 'Not a git repository - skipping sync',
        };
    }
    const branch = getCurrentBranch(directory);
    if (!branch) {
        return {
            name: 'Git Sync',
            passed: true,
            severity: 'warn',
            message: 'Could not determine current branch',
        };
    }
    // Fetch from remote
    const fetchResult = fetchRemote(directory);
    if (!fetchResult.success) {
        // Fetch failed (timeout or network issue) - warn but don't block
        return {
            name: 'Git Sync',
            passed: true,
            severity: 'warn',
            message: 'Git fetch failed (network timeout or unavailable)',
            details: [fetchResult.error ?? 'Unknown error'],
        };
    }
    // Check remote status after fetch
    const remoteStatus = getRemoteStatus(directory);
    if (!remoteStatus) {
        return {
            name: 'Git Sync',
            passed: true,
            severity: 'info',
            message: `On branch ${branch} - no remote tracking configured`,
        };
    }
    const { ahead, behind } = remoteStatus;
    // Check for local changes
    const hasChanges = hasUncommittedChanges(directory);
    // Build status message
    const details = [];
    if (ahead > 0) {
        details.push(`${ahead} commit(s) ahead of remote`);
    }
    if (behind > 0) {
        details.push(`${behind} commit(s) behind remote`);
    }
    if (hasChanges) {
        details.push('Working tree has uncommitted changes');
    }
    // Decision logic
    if (behind === 0) {
        // Up to date with remote
        return {
            name: 'Git Sync',
            passed: true,
            severity: 'info',
            message: `On branch ${branch} - up to date with remote`,
            details: details.length > 0 ? details : undefined,
        };
    }
    // Behind remote - try to pull if clean
    if (!hasChanges && ahead === 0) {
        // Clean working tree and not ahead - safe to auto-pull
        const pullResult = pullRemote(directory);
        if (pullResult.success) {
            return {
                name: 'Git Sync',
                passed: true,
                severity: 'info',
                message: `Auto-pulled ${behind} commit(s) from remote`,
                selfHealed: true,
                selfHealAction: 'git pull --ff-only',
            };
        }
        // Pull failed
        return {
            name: 'Git Sync',
            passed: true,
            severity: 'warn',
            message: `Failed to auto-pull ${behind} commit(s)`,
            details: [pullResult.error ?? 'Unknown error'],
        };
    }
    // Dirty tree or ahead - warn but don't auto-pull
    return {
        name: 'Git Sync',
        passed: true,
        severity: 'warn',
        message: `Branch ${branch} is ${behind} commit(s) behind remote`,
        details: [...details, 'Manual pull required due to local changes or unpushed commits'],
    };
}
export default synchronizeGit;
//# sourceMappingURL=git_synchronizer.js.map