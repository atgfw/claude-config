/**
 * LLM Model Validator Hook
 *
 * BLOCKS Write/Edit operations that contain banned LLM model strings.
 * Enforces use of approved models only across all project files.
 *
 * Approved: gpt-5.2, gemini-3-flash-preview
 * Banned: gpt-4o, gpt-4.1, gpt-3.5, claude-2, claude-instant
 *
 * Exception: files in old/ directories (archived content).
 */
import { logBlocked, logAllowed } from '../utils.js';
import { registerHook } from '../runner.js';
const APPROVED_MODELS = ['gpt-5.2', 'gemini-3-flash-preview'];
const BANNED_PATTERNS = /gpt-4o[\w-]*|gpt-4\.1[\w-]*|gpt-3\.5[\w-]*|claude-2[\w-]*|claude-instant[\w-]*/gi;
const WRITE_TOOLS = new Set(['Write', 'Edit', 'MultiEdit', 'NotebookEdit']);
const MCP_WRITE_PATTERN = /^mcp__.*__(write|edit|create)_/;
function isWriteTool(toolName) {
    return WRITE_TOOLS.has(toolName) || MCP_WRITE_PATTERN.test(toolName);
}
function isOldDirectory(filePath) {
    return /[\\/]old[\\/]/.test(filePath);
}
function extractContent(toolInput) {
    const parts = [];
    for (const key of ['content', 'new_string', 'new_source']) {
        if (typeof toolInput[key] === 'string') {
            parts.push(toolInput[key]);
        }
    }
    return parts.join('\n');
}
function extractFilePath(toolInput) {
    for (const key of ['file_path', 'path', 'notebook_path']) {
        if (typeof toolInput[key] === 'string') {
            return toolInput[key];
        }
    }
    return '';
}
function allow(reason) {
    if (reason)
        logAllowed(reason);
    return {
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'allow',
        },
    };
}
function deny(reason) {
    logBlocked(reason);
    return {
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: reason,
        },
    };
}
export async function llmModelValidatorHook(input) {
    if (!isWriteTool(input.tool_name)) {
        return allow();
    }
    const filePath = extractFilePath(input.tool_input);
    if (isOldDirectory(filePath)) {
        return allow('old/ directory exempt');
    }
    const content = extractContent(input.tool_input);
    if (!content) {
        return allow();
    }
    // Reset regex lastIndex since it uses /g flag
    BANNED_PATTERNS.lastIndex = 0;
    const matches = [];
    let match = BANNED_PATTERNS.exec(content);
    while (match) {
        matches.push(match[0]);
        match = BANNED_PATTERNS.exec(content);
    }
    if (matches.length > 0) {
        const unique = [...new Set(matches)];
        return deny(`Banned LLM model(s) found: ${unique.join(', ')}. ` +
            `Approved models: ${APPROVED_MODELS.join(', ')}`);
    }
    return allow();
}
registerHook('llm-model-validator', 'PreToolUse', llmModelValidatorHook);
export default llmModelValidatorHook;
//# sourceMappingURL=llm_model_validator.js.map