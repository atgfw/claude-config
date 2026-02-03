/**
 * Full Path Validator Hook
 *
 * Enforces that all file paths in Claude Code operations are absolute (full) paths.
 * Relative paths cause ambiguity when cwd changes and make audit logs inconsistent.
 *
 * GitHub Issue: #31
 * Trigger: PreToolUse on Read, Write, Edit, Glob, Grep
 */
import * as path from 'node:path';
import { registerHook } from '../runner.js';
// Tools that accept file paths
const FILE_PATH_TOOLS = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'MultiEdit', 'NotebookEdit'];
// Path parameters by tool
const PATH_PARAMS = {
    Read: ['file_path'],
    Write: ['file_path'],
    Edit: ['file_path'],
    Glob: ['path', 'pattern'], // pattern may contain path prefix
    Grep: ['path'],
    MultiEdit: ['file_path'],
    NotebookEdit: ['notebook_path'],
};
/**
 * Check if a path is absolute.
 * Handles both Unix (/path) and Windows (C:\path, D:/path) formats.
 */
function isAbsolutePath(filePath) {
    // Empty or undefined is not valid
    if (!filePath || filePath.trim() === '') {
        return false;
    }
    // Unix absolute path
    if (filePath.startsWith('/')) {
        return true;
    }
    // Windows absolute path (C:\, D:/, etc.)
    if (/^[a-zA-Z]:[\\/]/.test(filePath)) {
        return true;
    }
    // UNC path (\\server\share)
    if (filePath.startsWith('\\\\')) {
        return true;
    }
    return false;
}
/**
 * Expand a relative path to absolute using cwd.
 */
function expandToAbsolute(relativePath) {
    return path.resolve(process.cwd(), relativePath);
}
/**
 * Extract file paths from tool input.
 */
function extractPaths(toolName, toolInput) {
    const paramNames = PATH_PARAMS[toolName] ?? [];
    const paths = [];
    for (const param of paramNames) {
        const value = toolInput[param];
        if (typeof value === 'string' && value.trim() !== '') {
            // For Glob pattern, only check if it looks like a path (not just *.ts)
            if (param === 'pattern') {
                // Skip pure glob patterns like *.ts, **/*.js
                if (!value.includes('/') && !value.includes('\\')) {
                    continue;
                }
                // Extract the path portion before any glob wildcards
                const pathPortion = value.split(/[*?]/).at(0) ?? '';
                if (pathPortion && pathPortion !== value) {
                    paths.push(pathPortion);
                }
            }
            else {
                paths.push(value);
            }
        }
    }
    return paths;
}
/**
 * PreToolUse hook - validate file paths are absolute.
 */
async function fullPathValidator(input) {
    const { tool_name, tool_input } = input;
    // Only validate file operation tools
    if (!FILE_PATH_TOOLS.includes(tool_name)) {
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    // Extract paths from input
    const paths = extractPaths(tool_name, tool_input);
    // Check each path
    const relativePaths = [];
    for (const filePath of paths) {
        if (!isAbsolutePath(filePath)) {
            relativePaths.push({
                path: filePath,
                suggested: expandToAbsolute(filePath),
            });
        }
    }
    // If any relative paths found, block with helpful message
    if (relativePaths.length > 0) {
        const suggestions = relativePaths.map((p) => `  "${p.path}" → "${p.suggested}"`).join('\n');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'deny',
                permissionDecisionReason: `BLOCK: Relative file paths detected. All file paths must be absolute.\n\nRelative paths found:\n${suggestions}\n\nUse the suggested absolute paths instead. See CLAUDE.md "Full File Paths" rule.`,
            },
        };
    }
    return {
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'allow',
        },
    };
}
registerHook('full-path-validator', 'PreToolUse', fullPathValidator);
export { fullPathValidator as fullPathValidatorHook, isAbsolutePath, expandToAbsolute, extractPaths, };
export default fullPathValidator;
//# sourceMappingURL=full_path_validator.js.map