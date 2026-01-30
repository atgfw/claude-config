/**
 * Issue Convention Validator Hook
 * WARNS when gh issue create titles/bodies don't follow conventions
 * Enforcement: WARN (soft) - always allows, logs warnings
 */
import { execSync } from 'node:child_process';
import { logWarn, logAllowed } from '../utils.js';
import { registerHook } from '../runner.js';
// ============================================================================
// Constants
// ============================================================================
const VALID_SYSTEMS = [
    'hooks',
    'n8n',
    'elevenlabs',
    'servicetitan',
    'mcp',
    'governance',
    'infra',
];
const VALID_TYPES = ['feat', 'fix', 'chore', 'docs', 'refactor', 'perf', 'test'];
const SYSTEMS_PATTERN = VALID_SYSTEMS.join('|');
const TYPES_PATTERN = VALID_TYPES.join('|');
/**
 * Matches: [<system>] <type>(<scope>): <description>
 *      or: [<system>] <type>: <description>
 * Description must be lowercase start, no trailing period
 */
export const TITLE_REGEX = new RegExp(`^\\[(${SYSTEMS_PATTERN})\\] (${TYPES_PATTERN})(\\([a-z][a-z0-9-]*\\))?: [a-z].+[^.]$`);
export const REQUIRED_BODY_SECTIONS = [
    '## Problem',
    '## Solution',
    '## Acceptance Criteria',
    '## Source',
];
// ============================================================================
// Validation Functions
// ============================================================================
/**
 * Validate an issue title against conventions
 */
export function validateTitle(title) {
    const warnings = [];
    if (title.length > 72) {
        warnings.push(`Title exceeds 72 chars (${title.length})`);
    }
    if (!TITLE_REGEX.test(title)) {
        // Provide specific diagnostics
        const systemMatch = title.match(/^\[([^\]]*)\]/);
        if (!systemMatch) {
            warnings.push('Missing system prefix [<system>]');
        }
        else if (!VALID_SYSTEMS.includes(systemMatch[1])) {
            warnings.push(`Invalid system "${systemMatch[1]}". Valid: ${VALID_SYSTEMS.join(', ')}`);
        }
        const typeMatch = title.match(/^\[[^\]]*\]\s*(\w+)/);
        if (typeMatch && !VALID_TYPES.includes(typeMatch[1])) {
            warnings.push(`Invalid type "${typeMatch[1]}". Valid: ${VALID_TYPES.join(', ')}`);
        }
        if (/[A-Z]/.test(title.replace(/^\[[^\]]*\]\s*\w+(\([^)]*\))?:\s*/, '').charAt(0))) {
            warnings.push('Description must start lowercase');
        }
        if (title.endsWith('.')) {
            warnings.push('Title must not end with a period');
        }
    }
    return { valid: warnings.length === 0, warnings };
}
/**
 * Validate an issue body for required sections
 */
export function validateBody(body) {
    const warnings = [];
    for (const section of REQUIRED_BODY_SECTIONS) {
        if (!body.includes(section)) {
            warnings.push(`Missing required section: ${section}`);
        }
    }
    return { valid: warnings.length === 0, warnings };
}
/**
 * Search for duplicate issues using gh CLI
 * Returns open issues with >80% keyword overlap
 */
export function findDuplicates(title) {
    // Extract meaningful keywords (skip system prefix and type)
    const descriptionMatch = title.match(/:\s*(.+)$/);
    const description = descriptionMatch?.[1] ?? title;
    const keywords = description
        .toLowerCase()
        .split(/\s+/)
        .filter((w) => w.length > 2);
    if (keywords.length === 0) {
        return [];
    }
    const searchQuery = keywords.join(' ');
    let output;
    try {
        output = execSync(`gh issue list --search "${searchQuery}" --json number,title,state`, {
            encoding: 'utf-8',
            timeout: 10000,
        });
    }
    catch {
        return [];
    }
    let issues;
    try {
        issues = JSON.parse(output);
    }
    catch {
        return [];
    }
    const openIssues = issues.filter((i) => i.state === 'OPEN');
    return openIssues.filter((issue) => {
        const issueWords = new Set(issue.title
            .toLowerCase()
            .split(/\s+/)
            .filter((w) => w.length > 2));
        const titleWords = new Set(keywords);
        const union = new Set([...issueWords, ...titleWords]);
        const intersection = [...titleWords].filter((w) => issueWords.has(w));
        const overlap = union.size > 0 ? intersection.length / union.size : 0;
        return overlap > 0.8;
    });
}
// ============================================================================
// Hook Implementation
// ============================================================================
/**
 * Extract --title value from a gh issue create command
 */
function extractTitleFromCommand(command) {
    // Match --title "value" or --title 'value'
    const match = command.match(/--title\s+["']([^"']+)["']/);
    return match ? match[1] : undefined;
}
/**
 * Extract --body value from a gh issue create command
 */
function extractBodyFromCommand(command) {
    const match = command.match(/--body\s+["']([^"']+)["']/);
    return match ? match[1] : undefined;
}
/**
 * Issue Convention Validator Hook
 */
export async function issueConventionValidatorHook(input) {
    const toolInput = input.tool_input;
    const command = typeof toolInput === 'object' && toolInput
        ? toolInput['command']
        : undefined;
    if (input.tool_name !== 'Bash' || !command || !command.includes('gh issue create')) {
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    const title = extractTitleFromCommand(command);
    if (title) {
        const titleResult = validateTitle(title);
        for (const warning of titleResult.warnings) {
            logWarn(`Issue title: ${warning}`);
        }
        const duplicates = findDuplicates(title);
        if (duplicates.length > 0) {
            for (const dup of duplicates) {
                logWarn(`Possible duplicate: #${dup.number} "${dup.title}"`);
            }
        }
    }
    const body = extractBodyFromCommand(command);
    if (body) {
        const bodyResult = validateBody(body);
        for (const warning of bodyResult.warnings) {
            logWarn(`Issue body: ${warning}`);
        }
    }
    logAllowed('Issue convention warnings logged');
    return {
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'allow',
            permissionDecisionReason: 'Issue convention warnings logged',
        },
    };
}
// Register the hook
registerHook('issue-convention-validator', 'PreToolUse', issueConventionValidatorHook);
export default issueConventionValidatorHook;
//# sourceMappingURL=issue_conventions.js.map