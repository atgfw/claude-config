/**
 * Unified Write Gate - Consolidates 6 PreToolUse hooks into 1
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { logBlocked, logAllowed, isMorphAvailable, getClaudeDir } from '../utils.js';
import { registerHook } from '../runner.js';
function findProjectRoot(startDir) {
    const markers = ['.git', 'package.json', 'PROJECT-DIRECTIVE.md'];
    let current = startDir;
    for (let i = 0; i < 10; i++) {
        for (const marker of markers) {
            if (fs.existsSync(path.join(current, marker)))
                return current;
        }
        const parent = path.dirname(current);
        if (parent === current)
            break;
        current = parent;
    }
    return null;
}
async function unifiedWriteGate(input) {
    const toolName = input.tool_name;
    const filePath = String(input.tool_input?.file_path || '');
    const content = String(input.tool_input?.content || '');
    const claudeDir = getClaudeDir();
    // CHECK 1: Morph preference
    if (false && isMorphAvailable() && (toolName === 'Write' || toolName === 'Edit')) {
        logBlocked('Morph MCP available', 'Use mcp__desktop-commander instead');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'deny',
                permissionDecisionReason: 'Use mcp__desktop-commander__write_file or edit_block',
            },
        };
    }
    // CHECK 2: Child project override detection
    const overrideFiles = ['.mcp.json', 'settings.json', '.env'];
    const fileName = path.basename(filePath);
    // Normalize paths for Windows compatibility (forward vs backslash)
    const normalizedFilePath = filePath.replace(/\\/g, '/');
    const normalizedClaudeDir = claudeDir.replace(/\\/g, '/');
    if (!normalizedFilePath.startsWith(normalizedClaudeDir) && overrideFiles.includes(fileName)) {
        logBlocked('Child override', 'Use global ~/.claude/ config');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'deny',
                permissionDecisionReason: 'Child projects MUST NOT override spinal cord',
            },
        };
    }
    // CHECK 3: Pre-build gate
    if (/\.(ts|js|py|go|rs|java|tsx|jsx)$/.test(filePath) &&
        !/openspec|specs|\.test\.|\.spec\./i.test(filePath)) {
        const dir = path.dirname(filePath);
        if (dir && dir !== '.') {
            const projectRoot = findProjectRoot(dir);
            if (projectRoot && !fs.existsSync(path.join(projectRoot, 'PROJECT-DIRECTIVE.md'))) {
                logBlocked('Missing directive', 'Create PROJECT-DIRECTIVE.md first');
                return {
                    hookSpecificOutput: {
                        hookEventName: 'PreToolUse',
                        permissionDecision: 'deny',
                        permissionDecisionReason: `Create PROJECT-DIRECTIVE.md at ${projectRoot}`,
                    },
                };
            }
        }
    }
    // CHECK 4: Code node test validator
    if (/tests[\/\\]code-nodes[\/\\].*\.test\.js$/.test(filePath)) {
        logBlocked('Wrong extension', 'Use .test.ts');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'deny',
                permissionDecisionReason: 'Use .test.ts extension for code node tests',
            },
        };
    }
    if (/tests[\/\\]code-nodes[\/\\].*\.test\.ts$/.test(filePath) && content) {
        if (!content.includes("from 'vitest'") && !content.includes('from "vitest"')) {
            logBlocked('Missing Vitest', 'Import vitest');
            return {
                hookSpecificOutput: {
                    hookEventName: 'PreToolUse',
                    permissionDecision: 'deny',
                    permissionDecisionReason: 'Add: import { describe, it, expect } from "vitest"',
                },
            };
        }
    }
    // CHECK 5: Spec completeness
    if (/spec\.(yaml|yml)$/i.test(filePath) && content) {
        const required = ['inputs:', 'outputs:', 'logic:'];
        const missing = required.filter((s) => !content.includes(s));
        if (missing.length > 0) {
            logBlocked('Incomplete spec', `Missing: ${missing.join(', ')}`);
            return {
                hookSpecificOutput: {
                    hookEventName: 'PreToolUse',
                    permissionDecision: 'deny',
                    permissionDecisionReason: `Spec needs: ${missing.join(', ')}`,
                },
            };
        }
    }
    logAllowed('Write allowed');
    return { hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: 'allow' } };
}
registerHook('unified-write-gate', 'PreToolUse', unifiedWriteGate);
export default unifiedWriteGate;
//# sourceMappingURL=unified_write_gate.js.map