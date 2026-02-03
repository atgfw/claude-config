/**
 * Bun Enforcer Hook
 *
 * PreToolUse hook that blocks npm, node, and npx commands,
 * requiring bun equivalents instead.
 *
 * Mappings:
 * - npm install → bun install
 * - npm run → bun run
 * - npm test → bun test
 * - npx → bunx
 * - node script.js → bun script.js
 * - node -e → bun -e
 */
import { registerHook } from '../runner.js';
import { logTerse } from '../utils.js';
const BLOCKED_PATTERNS = [
    // npm commands
    {
        pattern: /\bnpm\s+install\b/,
        replacement: 'bun install',
        description: 'npm install',
    },
    {
        pattern: /\bnpm\s+i\b/,
        replacement: 'bun install',
        description: 'npm i',
    },
    {
        pattern: /\bnpm\s+run\b/,
        replacement: 'bun run',
        description: 'npm run',
    },
    {
        pattern: /\bnpm\s+test\b/,
        replacement: 'bun test',
        description: 'npm test',
    },
    {
        pattern: /\bnpm\s+start\b/,
        replacement: 'bun run start',
        description: 'npm start',
    },
    {
        pattern: /\bnpm\s+build\b/,
        replacement: 'bun run build',
        description: 'npm build',
    },
    {
        pattern: /\bnpm\s+ci\b/,
        replacement: 'bun install --frozen-lockfile',
        description: 'npm ci',
    },
    {
        pattern: /\bnpm\s+exec\b/,
        replacement: 'bunx',
        description: 'npm exec',
    },
    // npx commands
    {
        pattern: /\bnpx\s+/,
        replacement: 'bunx ',
        description: 'npx',
    },
    // node commands
    {
        pattern: /\bnode\s+([^\s]+\.(?:js|mjs|cjs))\b/,
        replacement: 'bun $1',
        description: 'node script.js',
    },
    {
        pattern: /\bnode\s+-e\b/,
        replacement: 'bun -e',
        description: 'node -e',
    },
    {
        pattern: /\bnode\s+--eval\b/,
        replacement: 'bun -e',
        description: 'node --eval',
    },
    // Catch-all for remaining npm commands
    {
        pattern: /\bnpm\s+\w+/,
        replacement: 'bun equivalent',
        description: 'npm command',
    },
];
// Exceptions - these are allowed
const ALLOWED_PATTERNS = [
    // Reading package.json is fine
    /\bcat\b.*package\.json/,
    // Checking npm version for diagnostics
    /\bnpm\s+--version\b/,
    /\bnpm\s+-v\b/,
    // npm config for reading only
    /\bnpm\s+config\s+get\b/,
];
export function detectBlockedCommands(command) {
    // Check if command matches an exception
    for (const allowed of ALLOWED_PATTERNS) {
        if (allowed.test(command)) {
            return { blocked: false, matches: [] };
        }
    }
    const matches = [];
    for (const { pattern, replacement, description } of BLOCKED_PATTERNS) {
        if (pattern.test(command)) {
            matches.push({
                found: description,
                replacement,
            });
        }
    }
    return {
        blocked: matches.length > 0,
        matches,
    };
}
// ============================================================================
// Hook Implementation
// ============================================================================
async function bunEnforcerHook(input) {
    // Only check Bash commands
    if (input.tool_name !== 'Bash') {
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    const toolInput = input.tool_input;
    const command = toolInput.command;
    if (!command) {
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    const result = detectBlockedCommands(command);
    if (!result.blocked) {
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    // Build suggestion message
    const suggestions = result.matches.map((m) => `  ${m.found} → ${m.replacement}`).join('\n');
    const message = `[X] Blocked: Use bun instead of npm/node/npx\n${suggestions}`;
    logTerse(message);
    return {
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: message,
        },
    };
}
// Register the hook
registerHook('bun-enforcer', 'PreToolUse', bunEnforcerHook);
export { bunEnforcerHook };
export default bunEnforcerHook;
//# sourceMappingURL=bun_enforcer.js.map