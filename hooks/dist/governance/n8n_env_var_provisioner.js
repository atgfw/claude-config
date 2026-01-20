/**
 * n8n Environment Variable Provisioner Hook
 *
 * AUTO-DETECTS environment variable references in workflows and:
 * 1. Writes them to ~/.claude/.env for local tracking
 * 2. Warns about $vars usage (requires n8n license)
 * 3. Logs Docker compose env configuration
 *
 * Detects:
 * - $vars['VAR_NAME'] references (WARNS - requires license)
 * - $env.VAR_NAME references (preferred - reads from server env)
 * - {{$env.VAR_NAME}} in expressions
 *
 * Part of the Spinal Cord governance system.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { log, logAllowed, logBlocked } from '../utils.js';
import { registerHook } from '../runner.js';
// Known environment variable patterns and their default/suggested values
const ENV_VAR_PATTERNS = {
    // 3CX variables
    '3CX_BASE_URL': {
        name: '3CX_BASE_URL',
        value: 'https://atgintegrations.3cx.us',
        description: '3CX PBX server URL',
    },
    '3CX_CLIENT_ID': {
        name: '3CX_CLIENT_ID',
        value: 'test',
        description: '3CX API client ID',
    },
    '3CX_CLIENT_SECRET': {
        name: '3CX_CLIENT_SECRET',
        value: '73mjtfcp7sJyt3044gnex4xEvfOPcFno',
        description: '3CX API client secret',
    },
    // Webhook secrets follow pattern: N8N_IN_SECRET_*
};
/**
 * Extract all environment variable references from workflow JSON
 */
function extractEnvVarReferences(workflow) {
    const envVars = new Set();
    const jsonString = JSON.stringify(workflow);
    // Match $vars['VAR_NAME'] pattern
    const varsPattern = /\$vars\['([A-Z0-9_]+)'\]/g;
    let match;
    while ((match = varsPattern.exec(jsonString)) !== null) {
        if (match[1])
            envVars.add(match[1]);
    }
    // Match $env.VAR_NAME pattern
    const envPattern = /\$env\.([A-Z0-9_]+)/g;
    while ((match = envPattern.exec(jsonString)) !== null) {
        if (match[1])
            envVars.add(match[1]);
    }
    // Match {{$env.VAR_NAME}} in expressions
    const exprPattern = /\{\{\s*\$env\.([A-Z0-9_]+)\s*\}\}/g;
    while ((match = exprPattern.exec(jsonString)) !== null) {
        if (match[1])
            envVars.add(match[1]);
    }
    return envVars;
}
/**
 * Extract workflow data from MCP tool input
 */
function extractWorkflowData(input) {
    const toolInput = input.tool_input;
    if (!toolInput || typeof toolInput !== 'object')
        return null;
    const workflow = toolInput['workflow'];
    if (workflow)
        return workflow;
    if (toolInput['nodes'] && Array.isArray(toolInput['nodes'])) {
        return {
            name: toolInput['name'],
            nodes: toolInput['nodes'],
        };
    }
    return null;
}
/**
 * Get required env vars with their configurations
 */
function getRequiredEnvVars(envVarNames) {
    const configs = [];
    for (const name of envVarNames) {
        if (ENV_VAR_PATTERNS[name]) {
            configs.push(ENV_VAR_PATTERNS[name]);
        }
        else if (name.startsWith('N8N_IN_SECRET_')) {
            // Generate a random secret for webhook auth
            const secret = generateRandomSecret();
            configs.push({
                name,
                value: secret,
                description: `Webhook authentication secret`,
            });
        }
        else {
            // Unknown variable - add with placeholder
            configs.push({
                name,
                value: `<CONFIGURE_${name}>`,
                description: `Required environment variable`,
            });
        }
    }
    return configs;
}
/**
 * Generate a random secret for webhook authentication
 */
function generateRandomSecret() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 32; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
}
/**
 * Get path to ~/.claude/.env
 */
function getClaudeEnvPath() {
    return path.join(os.homedir(), '.claude', '.env');
}
/**
 * Read existing env vars from ~/.claude/.env
 */
function readExistingEnvVars() {
    const envPath = getClaudeEnvPath();
    const existing = new Map();
    if (fs.existsSync(envPath)) {
        const content = fs.readFileSync(envPath, 'utf8');
        for (const line of content.split('\n')) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#')) {
                const eqIndex = trimmed.indexOf('=');
                if (eqIndex > 0) {
                    const key = trimmed.slice(0, eqIndex);
                    const value = trimmed.slice(eqIndex + 1);
                    existing.set(key, value);
                }
            }
        }
    }
    return existing;
}
/**
 * Append new env vars to ~/.claude/.env
 */
function appendEnvVars(configs) {
    const envPath = getClaudeEnvPath();
    const existing = readExistingEnvVars();
    const toAdd = [];
    for (const config of configs) {
        if (!existing.has(config.name)) {
            toAdd.push(config);
        }
    }
    if (toAdd.length > 0) {
        const lines = ['', '# Auto-provisioned by n8n-env-var-provisioner hook'];
        for (const config of toAdd) {
            if (config.description) {
                lines.push(`# ${config.description}`);
            }
            lines.push(`${config.name}=${config.value}`);
        }
        fs.appendFileSync(envPath, lines.join('\n') + '\n');
    }
    return toAdd.length;
}
/**
 * Check if workflow uses $vars (requires n8n license)
 */
function usesVarsPattern(workflow) {
    const jsonString = JSON.stringify(workflow);
    return /\$vars\[/.test(jsonString);
}
/**
 * n8n Environment Variable Provisioner Hook Implementation
 */
export async function n8nEnvVarProvisionerHook(input) {
    const toolName = input.tool_name ?? '';
    // Only process n8n workflow creation/update tools
    if (!toolName.includes('n8n_create_workflow') && !toolName.includes('n8n_update')) {
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    log(`[ENV VAR PROVISIONER] Checking environment variables for: ${toolName}`);
    const workflow = extractWorkflowData(input);
    if (!workflow) {
        logAllowed('No workflow data to analyze');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    // Check for $vars usage (requires license)
    if (usesVarsPattern(workflow)) {
        logBlocked('Workflow uses $vars pattern which requires n8n Variables license', 'Use $env.VAR_NAME pattern instead (reads from server environment)');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'deny',
                permissionDecisionReason: 'BLOCKED: Workflow uses $vars["..."] pattern which requires n8n Variables license. ' +
                    'Change to $env.VAR_NAME pattern instead (reads from server environment variables).',
            },
        };
    }
    // Extract all env var references
    const envVarNames = extractEnvVarReferences(workflow);
    if (envVarNames.size === 0) {
        logAllowed('No environment variables detected in workflow');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    // Get configurations for required env vars
    const envVarConfigs = getRequiredEnvVars(envVarNames);
    // Write to ~/.claude/.env
    const addedCount = appendEnvVars(envVarConfigs);
    log('');
    log('[ENV VAR PROVISIONER] Required environment variables:');
    log('');
    for (const config of envVarConfigs) {
        log(`  ${config.name}=${config.value}`);
        if (config.description) {
            log(`    # ${config.description}`);
        }
    }
    if (addedCount > 0) {
        log('');
        log(`[ENV VAR PROVISIONER] Added ${addedCount} new variable(s) to ~/.claude/.env`);
    }
    log('');
    log('[ENV VAR PROVISIONER] For n8n Docker deployment, add to docker-compose.yml:');
    log('');
    log('  environment:');
    for (const config of envVarConfigs) {
        log(`    - ${config.name}=${config.value}`);
    }
    log('');
    logAllowed(`Detected ${envVarNames.size} environment variable(s) - saved to ~/.claude/.env`);
    return {
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'allow',
        },
    };
}
// Register the hook
registerHook('n8n-env-var-provisioner', 'PreToolUse', n8nEnvVarProvisionerHook);
export default n8nEnvVarProvisionerHook;
//# sourceMappingURL=n8n_env_var_provisioner.js.map