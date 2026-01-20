/**
 * Changelog Generator Hook
 * Tracks commits for changelog generation
 * Event: PostToolUse (Bash git commit)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { log, getClaudeDir as getClaudeDirectory } from '../utils.js';
import { registerHook } from '../runner.js';
// Conventional commit regex
const conventionalCommitRegex = /^(?<type>\w+)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?\s*:\s*(?<description>.+)$/;
/**
 * Get the changelog registry path
 */
function getRegistryPath() {
    return path.join(getClaudeDirectory(), 'ledger', 'changelog-registry.json');
}
/**
 * Load the changelog registry
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
            description: 'Tracks unreleased changes for changelog generation',
        },
    };
}
/**
 * Save the changelog registry
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
 * Get the latest commit info
 */
function getLatestCommit() {
    try {
        const hash = execSync('git rev-parse HEAD', {
            encoding: 'utf8',
            timeout: 5000,
        }).trim();
        const message = execSync('git log -1 --pretty=%s', {
            encoding: 'utf8',
            timeout: 5000,
        }).trim();
        return { hash, message };
    }
    catch {
        return undefined;
    }
}
/**
 * Parse a conventional commit message
 */
function parseCommitMessage(message) {
    const match = conventionalCommitRegex.exec(message);
    if (!match?.groups) {
        return undefined;
    }
    const { type, scope, description, breaking } = match.groups;
    if (!type || !description) {
        return undefined;
    }
    return {
        type: type.toLowerCase(),
        scope,
        description,
        breaking: breaking === '!',
    };
}
/**
 * Check if the command is a successful git commit
 */
function isGitCommit(command) {
    return /git\s+commit\b/.test(command);
}
/**
 * Changelog Generator Hook Implementation
 */
export async function changelogGeneratorHook(input) {
    // Extract command
    const toolInput = input.tool_input;
    const command = typeof toolInput === 'object' && toolInput ? toolInput.command : '';
    // Only process git commit commands
    if (!command || !isGitCommit(command)) {
        return {
            hookSpecificOutput: {
                hookEventName: 'PostToolUse',
            },
        };
    }
    log('Changelog generator: Processing git commit');
    // Get repository root
    const repoRoot = getRepoRoot();
    if (!repoRoot) {
        log('Changelog generator: Not in a git repository');
        return {
            hookSpecificOutput: {
                hookEventName: 'PostToolUse',
            },
        };
    }
    // Get latest commit
    const commit = getLatestCommit();
    if (!commit) {
        log('Changelog generator: Could not get latest commit');
        return {
            hookSpecificOutput: {
                hookEventName: 'PostToolUse',
            },
        };
    }
    // Parse commit message
    const parsed = parseCommitMessage(commit.message);
    if (!parsed) {
        log('Changelog generator: Commit does not follow Conventional Commits format, skipping');
        return {
            hookSpecificOutput: {
                hookEventName: 'PostToolUse',
            },
        };
    }
    // Create changelog entry
    const entry = {
        hash: commit.hash.slice(0, 7),
        type: parsed.type,
        scope: parsed.scope,
        description: parsed.description,
        breaking: parsed.breaking,
        timestamp: new Date().toISOString(),
    };
    // Load registry and add entry
    const registry = loadRegistry();
    registry.repositories[repoRoot] ||= {
        lastRelease: '0.0.0',
        unreleased: [],
    };
    // Check for duplicate (same hash)
    const existing = registry.repositories[repoRoot].unreleased.find((existingEntry) => existingEntry.hash === entry.hash);
    if (existing) {
        log('Changelog generator: Entry already exists for this commit');
    }
    else {
        registry.repositories[repoRoot].unreleased.push(entry);
        saveRegistry(registry);
        log(`Changelog generator: Added entry for ${entry.type}${entry.scope ? `(${entry.scope})` : ''}: ${entry.description}`);
    }
    return {
        hookSpecificOutput: {
            hookEventName: 'PostToolUse',
            additionalContext: `Changelog entry recorded: ${entry.type}${entry.scope ? `(${entry.scope})` : ''}: ${entry.description}`,
        },
    };
}
// Register the hook
registerHook('changelog-generator', 'PostToolUse', changelogGeneratorHook);
export default changelogGeneratorHook;
//# sourceMappingURL=changelog_generator.js.map