/**
 * Semantic Version Calculator Hook
 * Tracks releases and calculates version bumps
 * Event: PostToolUse (Bash git tag)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { log, getClaudeDir as getClaudeDirectory } from '../utils.js';
import { registerHook } from '../runner.js';
/**
 * Get the release registry path
 */
function getRegistryPath() {
    return path.join(getClaudeDirectory(), 'ledger', 'release-registry.json');
}
/**
 * Load the release registry
 */
function loadRegistry() {
    const registryPath = getRegistryPath();
    if (fs.existsSync(registryPath)) {
        return JSON.parse(fs.readFileSync(registryPath, 'utf8'));
    }
    return {
        repositories: {},
        lastUpdated: new Date().toISOString(),
        schema: {
            version: '1.0.0',
            description: 'Tracks semantic versioning releases across repositories',
        },
    };
}
/**
 * Save the release registry
 */
function saveRegistry(registry) {
    const registryPath = getRegistryPath();
    registry.lastUpdated = new Date().toISOString();
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
}
/**
 * Get the current git repository root
 */
function getRepoRoot() {
    try {
        return execSync('git rev-parse --show-toplevel', {
            encoding: 'utf8',
            timeout: 5000,
        }).trim();
    }
    catch {
        return undefined;
    }
}
/**
 * Extract version from a git tag command
 */
function extractTagVersion(command) {
    // Match: git tag v1.0.0, git tag -a v1.0.0, git tag 1.0.0
    const tagMatch = /git\s+tag\s+(?:-[a-z]+\s+)*["']?v?(\d+\.\d+\.\d+(?:-[a-z\d.]+)?)["']?/i.exec(command);
    return tagMatch?.[1];
}
/**
 * Get the current commit hash
 */
function getCurrentCommit() {
    try {
        return execSync('git rev-parse HEAD', {
            encoding: 'utf8',
            timeout: 5000,
        }).trim();
    }
    catch {
        return undefined;
    }
}
/**
 * Check if the command is a git tag creation
 */
function isGitTagCreate(command) {
    // Must be git tag but not git tag -d (delete) or git tag -l (list)
    return /git\s+tag\b/.test(command) && !/git\s+tag\s+-[dl]/.test(command);
}
/**
 * Semantic Version Calculator Hook Implementation
 */
export async function semanticVersionCalculatorHook(input) {
    // Extract command
    const toolInput = input.tool_input;
    const command = typeof toolInput === 'object' && toolInput ? toolInput.command : '';
    // Only process git tag creation commands
    if (!command || !isGitTagCreate(command)) {
        return {
            hookSpecificOutput: {
                hookEventName: 'PostToolUse',
            },
        };
    }
    log('Semantic version calculator: Processing git tag');
    // Get repository root
    const repoRoot = getRepoRoot();
    if (!repoRoot) {
        log('Semantic version calculator: Not in a git repository');
        return {
            hookSpecificOutput: {
                hookEventName: 'PostToolUse',
            },
        };
    }
    // Extract version from tag command
    const version = extractTagVersion(command);
    if (!version) {
        log('Semantic version calculator: Could not extract version from tag command');
        return {
            hookSpecificOutput: {
                hookEventName: 'PostToolUse',
            },
        };
    }
    // Get current commit
    const commit = getCurrentCommit();
    if (!commit) {
        log('Semantic version calculator: Could not get current commit');
        return {
            hookSpecificOutput: {
                hookEventName: 'PostToolUse',
            },
        };
    }
    // Create release entry
    const entry = {
        version,
        tag: `v${version}`,
        commit: commit.slice(0, 7),
        date: new Date().toISOString(),
    };
    // Load registry and add entry
    const registry = loadRegistry();
    registry.repositories[repoRoot] ||= {
        currentVersion: '0.0.0',
        releases: [],
    };
    // Update current version
    registry.repositories[repoRoot].currentVersion = version;
    // Check for duplicate (same version)
    const existing = registry.repositories[repoRoot].releases.find((releaseEntry) => releaseEntry.version === entry.version);
    if (existing) {
        log(`Semantic version calculator: Release ${version} already exists`);
    }
    else {
        registry.repositories[repoRoot].releases.push(entry);
        saveRegistry(registry);
        log(`Semantic version calculator: Recorded release ${version}`);
    }
    return {
        hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext: `Release recorded: v${version}`,
        },
    };
}
// Register the hook
registerHook('semantic-version-calculator', 'PostToolUse', semanticVersionCalculatorHook);
export default semanticVersionCalculatorHook;
//# sourceMappingURL=semantic_version_calculator.js.map