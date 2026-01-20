/**
 * Commit Message Validator Hook
 * Validates commit messages follow Conventional Commits 1.0.0
 * Enforcement: WARN - Display warning but allow commit
 */
import { log, logAllowed } from '../utils.js';
import { registerHook } from '../runner.js';
// Allowed commit types per Conventional Commits spec
const allowedTypes = new Set([
    'feat', // New feature (MINOR bump)
    'fix', // Bug fix (PATCH bump)
    'docs', // Documentation only
    'style', // Formatting, no code change
    'refactor', // Code change, no feature/fix
    'perf', // Performance improvement (PATCH bump)
    'test', // Adding/updating tests
    'build', // Build system/dependencies
    'ci', // CI configuration
    'chore', // Maintenance tasks
]);
// Regex to parse conventional commit message
// Format: <type>(<scope>)!: <description>
const conventionalCommitRegex = /^(?<type>\w+)(?:\((?<scope>[^)]+)\))?(?<breaking>!)?\s*:\s*(?<description>.+)$/;
/**
 * Extract commit message from git commit command
 */
function extractCommitMessage(command) {
    // Match -m "message" or -m 'message' or --message="message" or --message "message"
    const shortFlagMatch = /-m\s+["']([^"']+)["']/i.exec(command);
    if (shortFlagMatch) {
        return shortFlagMatch[1];
    }
    const longFlagMatch = /--message[=\s]+["']([^"']+)["']/i.exec(command);
    if (longFlagMatch) {
        return longFlagMatch[1];
    }
    // Match -m message (without quotes, single word)
    const unquotedMatch = /-m\s+(\S+)/i.exec(command);
    if (unquotedMatch) {
        return unquotedMatch[1];
    }
    return undefined;
}
/**
 * Validate a commit message against Conventional Commits spec
 */
function validateCommitMessage(message) {
    const result = {
        valid: true,
        errors: [],
        warnings: [],
    };
    // Check if message is empty
    if (!message.trim()) {
        result.valid = false;
        result.errors.push('Commit message cannot be empty');
        return result;
    }
    // Get first line (subject)
    const subject = message.split('\n')[0]?.trim() ?? '';
    // Try to parse as conventional commit
    const match = conventionalCommitRegex.exec(subject);
    if (!match?.groups) {
        result.valid = false;
        result.errors.push('Message does not follow Conventional Commits format', 'Expected: <type>(<scope>): <description>', 'Example: feat(api): add user authentication endpoint');
        return result;
    }
    const { type, scope, description, breaking } = match.groups;
    result.type = type;
    result.scope = scope;
    result.description = description;
    result.breaking = breaking === '!';
    // Validate type
    if (!type || !allowedTypes.has(type.toLowerCase())) {
        result.valid = false;
        result.errors.push(`Invalid type "${type}"`, `Allowed types: ${[...allowedTypes].join(', ')}`);
    }
    else if (type !== type.toLowerCase()) {
        result.warnings.push(`Type should be lowercase: "${type}" -> "${type.toLowerCase()}"`);
    }
    // Validate description
    if (description?.trim()) {
        // Check description guidelines
        if (description.endsWith('.')) {
            result.warnings.push('Description should not end with a period');
        }
        if (description.length > 72) {
            result.warnings.push(`Description exceeds 72 characters (${description.length})`);
        }
        // Check for imperative mood (simple heuristic)
        const firstWord = description.trim().split(' ')[0]?.toLowerCase() ?? '';
        const pastTenseIndicators = ['added', 'fixed', 'changed', 'updated', 'removed', 'deleted'];
        if (pastTenseIndicators.includes(firstWord)) {
            result.warnings.push(`Use imperative mood: "${firstWord}" -> "${firstWord.replace(/ed$/, '')}" or "${firstWord.replace(/d$/, '')}"`);
        }
    }
    else {
        result.valid = false;
        result.errors.push('Description cannot be empty');
    }
    return result;
}
/**
 * Check if the command is a git commit with message
 */
function isGitCommitWithMessage(command) {
    return /git\s+commit\b.*-m\b/.test(command) || /git\s+commit\b.*--message\b/.test(command);
}
/**
 * Log a warning (non-blocking)
 */
function logWarning(title, details) {
    log('');
    log(`[WARNING] ${title}`);
    if (details) {
        log('');
        log('From CLAUDE.md:');
        log(`> ${details}`);
    }
}
/**
 * Commit Message Validator Hook Implementation
 */
export async function commitMessageValidatorHook(input) {
    // Extract command
    const toolInput = input.tool_input;
    const command = typeof toolInput === 'object' && toolInput ? toolInput.command : '';
    log(`Command: ${command || '(empty)'}`);
    // Check if this is a git commit with -m flag
    if (!command || !isGitCommitWithMessage(command)) {
        logAllowed('Not a git commit with message');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    // Extract the commit message
    const commitMessage = extractCommitMessage(command);
    if (!commitMessage) {
        logAllowed('Could not extract commit message');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    log(`Validating commit message: "${commitMessage}"`);
    // Validate the message
    const validation = validateCommitMessage(commitMessage);
    if (validation.valid && validation.warnings.length === 0) {
        logAllowed('Commit message follows Conventional Commits format');
        if (validation.breaking) {
            log('  Note: This is a BREAKING CHANGE commit (will trigger MAJOR version bump)');
        }
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    // Log issues (but allow the commit)
    if (!validation.valid) {
        logWarning('Commit message does not follow Conventional Commits format', 'All commits should follow Conventional Commits 1.0.0 standard');
        log('');
        log('ERRORS:');
        for (const error of validation.errors) {
            log(`  - ${error}`);
        }
    }
    if (validation.warnings.length > 0) {
        if (validation.valid) {
            logWarning('Commit message has style issues');
        }
        log('');
        log('WARNINGS:');
        for (const warning of validation.warnings) {
            log(`  - ${warning}`);
        }
    }
    log('');
    log('CONVENTIONAL COMMITS FORMAT:');
    log('  <type>(<scope>): <description>');
    log('');
    log('  Types: feat, fix, docs, style, refactor, perf, test, build, ci, chore');
    log('  Breaking change: Add ! after type, e.g., feat!: or feat(api)!:');
    log('');
    log('EXAMPLES:');
    log('  feat(auth): add OAuth2 support');
    log('  fix: resolve null pointer in middleware');
    log('  docs: update API documentation');
    log('  feat!: remove deprecated endpoint');
    log('');
    // WARN only - allow the commit to proceed
    logAllowed('Commit allowed (soft enforcement)');
    return {
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'allow',
            permissionDecisionReason: validation.valid
                ? `Warning: ${validation.warnings.length} style issue(s) in commit message`
                : `Warning: Commit message does not follow Conventional Commits format`,
        },
    };
}
// Register the hook
registerHook('commit-message-validator', 'PreToolUse', commitMessageValidatorHook);
export default commitMessageValidatorHook;
//# sourceMappingURL=commit_message_validator.js.map