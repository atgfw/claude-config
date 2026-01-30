/**
 * Stale Workflow JSON Detector
 *
 * WARNS when n8n workflow JSON files are accessed outside temp/old directories.
 * Local project folders should be documentation/temp workspaces only.
 * The n8n API is the single source of truth for workflow state.
 *
 * Issue: #19
 */
import { log } from '../utils.js';
import { registerHook } from '../runner.js';
import * as path from 'node:path';
import * as fs from 'node:fs';
const FILE_TOOLS = new Set(['Read', 'Write', 'Edit']);
const EXCLUDED_FILENAMES = new Set([
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'vitest.config.json',
    'mcp-registry.json',
    'settings.json',
    'bun.lock',
]);
const EXCLUDED_DIR_SEGMENTS = new Set(['temp', 'tmp', 'old', 'node_modules', 'dist', '.git']);
function allow() {
    return {
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'allow',
        },
    };
}
/**
 * Check if a parsed JSON object looks like an n8n workflow.
 * Requires both `nodes` (array) and `connections` (object).
 */
function isWorkflowJson(data) {
    if (!data || typeof data !== 'object')
        return false;
    const obj = data;
    return (Array.isArray(obj['nodes']) &&
        typeof obj['connections'] === 'object' &&
        obj['connections'] !== null);
}
/**
 * Check if the file path contains an excluded directory segment.
 */
function isInExcludedDir(filePath) {
    const normalized = filePath.replace(/\\/g, '/');
    const segments = normalized.split('/');
    return segments.some((seg) => EXCLUDED_DIR_SEGMENTS.has(seg.toLowerCase()));
}
export async function staleWorkflowJsonDetectorHook(input) {
    if (!FILE_TOOLS.has(input.tool_name))
        return allow();
    const toolInput = input.tool_input;
    const filePath = (toolInput['file_path'] ?? toolInput['path']);
    if (!filePath)
        return allow();
    // Only check .json files
    if (!filePath.toLowerCase().endsWith('.json'))
        return allow();
    // Skip known config filenames
    const filename = path.basename(filePath).toLowerCase();
    if (EXCLUDED_FILENAMES.has(filename))
        return allow();
    if (filename.endsWith('.config.json'))
        return allow();
    // Skip excluded directories
    if (isInExcludedDir(filePath))
        return allow();
    // Determine if this is workflow JSON
    let isWorkflow = false;
    // For Write operations, check the content being written
    if (input.tool_name === 'Write' && typeof toolInput['content'] === 'string') {
        try {
            isWorkflow = isWorkflowJson(JSON.parse(toolInput['content']));
        }
        catch {
            // Not valid JSON, skip
        }
    }
    // For Read/Edit, check the existing file on disk
    if (!isWorkflow && (input.tool_name === 'Read' || input.tool_name === 'Edit')) {
        try {
            const content = fs.readFileSync(filePath, 'utf-8');
            isWorkflow = isWorkflowJson(JSON.parse(content));
        }
        catch {
            // File doesn't exist or isn't valid JSON
        }
    }
    if (!isWorkflow)
        return allow();
    log(`[!] Stale workflow JSON detected: ${path.basename(filePath)}`);
    return {
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'allow',
            permissionDecisionReason: `WARNING: "${path.basename(filePath)}" appears to be n8n workflow JSON stored locally. ` +
                `The n8n API is the source of truth for workflow state. ` +
                `Local project folders should only contain documentation and temp files. ` +
                `Use the download-edit-upload pattern: fetch from API, edit in temp/, push back, then remove the local copy.`,
        },
    };
}
registerHook('stale-workflow-json-detector', 'PreToolUse', staleWorkflowJsonDetectorHook);
//# sourceMappingURL=stale_workflow_json_detector.js.map