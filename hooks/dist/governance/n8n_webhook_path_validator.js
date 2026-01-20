/**
 * n8n Webhook Path Validator Hook
 *
 * ENFORCES webhook path naming conventions for n8n workflows.
 * Part of the Spinal Cord - global governance for child projects.
 *
 * Rules (see CLAUDE.md "Webhook Path Naming"):
 * 1. Webhook trigger paths must be named (not empty)
 * 2. Must be kebab-case
 * 3. Same or similar name as workflow
 * 4. Long names allowed if perfectly prescriptive
 * 5. Webhook path should NOT be nested (no slashes)
 * 6. Webhook node name itself should always be just 'webhook'
 * 7. Path should never contain the word "test"
 * 8. All webhook triggers must authenticate by a unique secret key
 */
import { log, logBlocked, logAllowed } from '../utils.js';
import { registerHook } from '../runner.js';
// ============================================================================
// System Prefixes (for path matching)
// ============================================================================
const SYSTEM_PREFIXES = [
    'ServiceTitan_',
    'ElevenLabs_',
    'Harvest_',
    'QuickBooks_',
    'Salesforce_',
    'Zendesk_',
    'Twilio_',
    'SendGrid_',
    'GoogleSheets_',
    'GoogleDrive_',
    'GoogleCalendar_',
    'Slack_',
    'Discord_',
    'GitHub_',
    'GitLab_',
    'Jira_',
    'Asana_',
    'Trello_',
    'Notion_',
    'Airtable_',
];
// ============================================================================
// Validation Functions
// ============================================================================
/**
 * Check if path is kebab-case
 * kebab-case: lowercase letters, numbers, hyphens only
 * Must not start or end with hyphen, no consecutive hyphens
 */
export function isKebabCase(path) {
    if (!path || path.length === 0)
        return false;
    return /^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/.test(path);
}
/**
 * Convert various formats to kebab-case
 */
export function toKebabCase(name) {
    return (name
        // Insert hyphen before uppercase letters
        .replace(/([A-Z])/g, '-$1')
        // Convert to lowercase
        .toLowerCase()
        // Replace underscores and spaces with hyphens
        .replace(/[_\s]+/g, '-')
        // Collapse multiple hyphens
        .replace(/-+/g, '-')
        // Remove leading/trailing hyphens
        .replace(/^-|-$/g, ''));
}
/**
 * Check if path contains nested segments (slashes)
 */
export function isNestedPath(path) {
    // Remove leading slash for check
    const cleanPath = path.startsWith('/') ? path.slice(1) : path;
    return cleanPath.includes('/');
}
/**
 * Check if path contains the word "test" (case insensitive)
 * Only matches "test" as a word, not as substring of other words
 */
export function containsTestWord(path) {
    // Match "test" as a word boundary (hyphen, start, or end)
    const testPattern = /(?:^|-)test(?:-|$)/i;
    return testPattern.test(path);
}
/**
 * Check if webhook parameters include header authentication
 */
export function hasAuthenticationHeader(parameters) {
    const auth = parameters['authentication'];
    if (auth !== 'headerAuth')
        return false;
    const options = parameters['options'];
    if (!options)
        return false;
    const headerAuth = options['headerAuth'];
    if (!headerAuth)
        return false;
    const name = headerAuth['name'];
    const value = headerAuth['value'];
    return (typeof name === 'string' && name.length > 0 && typeof value === 'string' && value.length > 0);
}
/**
 * Check if webhook path matches or relates to workflow name
 */
export function pathMatchesWorkflowName(path, workflowName) {
    // Normalize workflow name (remove system prefixes, convert to kebab-case)
    let normalizedWorkflowName = workflowName;
    for (const prefix of SYSTEM_PREFIXES) {
        if (normalizedWorkflowName.startsWith(prefix)) {
            normalizedWorkflowName = normalizedWorkflowName.slice(prefix.length);
            break;
        }
    }
    const kebabWorkflowName = toKebabCase(normalizedWorkflowName);
    // Exact match
    if (path === kebabWorkflowName)
        return true;
    // Path contains the workflow name (longer descriptive paths allowed)
    if (path.includes(kebabWorkflowName))
        return true;
    // Workflow name contains the path (path is a shorter version)
    if (kebabWorkflowName.includes(path))
        return true;
    return false;
}
/**
 * Generate environment variable name for webhook secret
 */
export function generateSecretKeyName(webhookPath) {
    const upperPath = webhookPath.toUpperCase().replace(/-/g, '_');
    return `N8N_IN_SECRET_${upperPath}`;
}
// ============================================================================
// Webhook Validation
// ============================================================================
/**
 * Validate a webhook path
 */
export function validateWebhookPath(path, workflowName) {
    const result = {
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
    };
    // Check path is named
    if (!path || path.trim() === '') {
        result.valid = false;
        result.errors.push('Webhook path must be named');
        result.suggestions.push('Add a descriptive path matching the workflow name');
        return result;
    }
    // Check kebab-case
    if (!isKebabCase(path)) {
        result.valid = false;
        result.errors.push(`Webhook path "${path}" must be kebab-case`);
        result.suggestions.push(`Convert to: ${toKebabCase(path)}`);
    }
    // Check not nested
    if (isNestedPath(path)) {
        result.valid = false;
        result.errors.push(`Webhook path "${path}" should not be nested (no slashes)`);
        const flatPath = path.split('/').pop() ?? path;
        result.suggestions.push(`Use flat path: ${flatPath}`);
    }
    // Check no "test" word
    if (containsTestWord(path)) {
        result.valid = false;
        result.errors.push(`Webhook path "${path}" should not contain the word "test" (n8n has built-in test triggers)`);
        const cleanPath = path.replace(/(?:^|-)test(?:-|$)/gi, '-').replace(/^-|-$/g, '');
        result.suggestions.push(`Remove "test" from path: ${cleanPath}`);
    }
    // Check path matches workflow name (warning only)
    if (result.valid && !pathMatchesWorkflowName(path, workflowName)) {
        result.warnings.push(`Webhook path "${path}" does not match workflow name "${workflowName}"`);
        const suggestedPath = toKebabCase(workflowName.replace(/^[A-Za-z]+_/, ''));
        result.suggestions.push(`Consider using path: ${suggestedPath}`);
    }
    return result;
}
/**
 * Validate a webhook node
 */
export function validateWebhookNode(node, workflowName) {
    const result = {
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
    };
    // Skip non-webhook nodes
    if (node.type !== 'n8n-nodes-base.webhook') {
        result.skipped = true;
        return result;
    }
    // Check node name is exactly 'webhook'
    if (node.name !== 'webhook') {
        result.valid = false;
        result.errors.push(`Webhook node name must be exactly "webhook", got "${node.name}"`);
        result.suggestions.push('Rename the node to "webhook"');
    }
    // Get parameters
    const parameters = node.parameters ?? {};
    const path = parameters['path'];
    // Validate path
    const pathResult = validateWebhookPath(path ?? '', workflowName);
    if (!pathResult.valid) {
        result.valid = false;
    }
    result.errors.push(...pathResult.errors);
    result.warnings.push(...pathResult.warnings);
    result.suggestions.push(...pathResult.suggestions);
    // Check authentication
    if (!hasAuthenticationHeader(parameters)) {
        result.valid = false;
        result.errors.push('Webhook must authenticate by a unique secret key (headerAuth)');
        const secretName = generateSecretKeyName(path ?? 'webhook');
        result.suggestions.push(`Add header auth with env variable: ${secretName}`);
        result.suggestions.push('Configure authentication: "headerAuth" with X-Webhook-Secret header');
    }
    return result;
}
/**
 * Validate all webhook nodes in a workflow payload
 */
export function validateWebhookPayload(payload) {
    const result = {
        valid: true,
        errors: [],
        warnings: [],
        suggestions: [],
    };
    const workflowName = payload.name ?? 'unknown_workflow';
    const nodes = payload.nodes ?? [];
    // Validate each webhook node
    for (const node of nodes) {
        const nodeResult = validateWebhookNode(node, workflowName);
        if (nodeResult.skipped)
            continue;
        if (!nodeResult.valid) {
            result.valid = false;
        }
        // Prefix errors with node context
        result.errors.push(...nodeResult.errors.map((e) => `Webhook node: ${e}`));
        result.warnings.push(...nodeResult.warnings.map((w) => `Webhook node: ${w}`));
        result.suggestions.push(...nodeResult.suggestions);
    }
    return result;
}
// ============================================================================
// Hook Implementation
// ============================================================================
/**
 * Extract workflow data from MCP tool input
 */
function extractWorkflowData(input) {
    const toolInput = input.tool_input;
    if (!toolInput || typeof toolInput !== 'object')
        return null;
    // Check for workflow data in various possible locations
    const workflow = toolInput['workflow'];
    if (workflow)
        return workflow;
    // Check if nodes are directly in tool_input
    if (toolInput['nodes'] && Array.isArray(toolInput['nodes'])) {
        return {
            name: toolInput['name'],
            nodes: toolInput['nodes'],
        };
    }
    // Check for JSON string
    const workflowJson = toolInput['workflow_json'];
    if (workflowJson) {
        try {
            return JSON.parse(workflowJson);
        }
        catch {
            return null;
        }
    }
    return null;
}
/**
 * Main n8n webhook path validator hook
 */
export async function n8nWebhookPathValidatorHook(input) {
    const toolName = input.tool_name ?? '';
    log(`[WEBHOOK PATH] Validating n8n webhook operation: ${toolName}`);
    // Extract workflow data
    const workflow = extractWorkflowData(input);
    if (!workflow) {
        logAllowed('No workflow data to validate');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    // Validate webhook nodes
    const validation = validateWebhookPayload(workflow);
    // Log validation results
    if (validation.errors.length > 0) {
        log('[WEBHOOK PATH] Validation errors:');
        validation.errors.forEach((e) => log(`  - ${e}`));
    }
    if (validation.warnings.length > 0) {
        log('[WEBHOOK PATH] Validation warnings:');
        validation.warnings.forEach((w) => log(`  - ${w}`));
    }
    if (validation.suggestions.length > 0) {
        log('[WEBHOOK PATH] Suggestions:');
        validation.suggestions.forEach((s) => log(`  - ${s}`));
    }
    // Block if invalid
    if (!validation.valid) {
        const errorSummary = validation.errors.join('; ');
        const suggestionSummary = validation.suggestions.length > 0
            ? `\n\nSuggestions:\n${validation.suggestions.map((s) => `  - ${s}`).join('\n')}`
            : '';
        logBlocked(`Webhook path validation failed: ${errorSummary}`, 'Webhook Path Naming Convention - see CLAUDE.md');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'deny',
                permissionDecisionReason: `WEBHOOK PATH VIOLATION: ${errorSummary}${suggestionSummary}`,
            },
        };
    }
    // Allow with warnings
    if (validation.warnings.length > 0) {
        const warningSummary = validation.warnings.join('; ');
        logAllowed(`Webhook path validation passed with warnings: ${warningSummary}`);
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
                permissionDecisionReason: `WEBHOOK PATH WARNING: ${warningSummary}`,
            },
        };
    }
    // Clean pass
    logAllowed('Webhook path validation passed');
    return {
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'allow',
            permissionDecisionReason: 'Webhook path conventions validated',
        },
    };
}
// Register the hook
registerHook('n8n-webhook-path-validator', 'PreToolUse', n8nWebhookPathValidatorHook);
export default n8nWebhookPathValidatorHook;
//# sourceMappingURL=n8n_webhook_path_validator.js.map