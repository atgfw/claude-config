/**
 * N8N Post Update Cleanup
 *
 * PostToolUse hook that cleans up temporary workflow JSON files
 * after successful n8n API operations.
 *
 * Only triggers on SUCCESS - if the n8n operation fails, temp files are preserved
 * for debugging.
 *
 * Issue: #19, #33
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { log, archiveToDateDir } from '../utils.js';
import { registerHook } from '../runner.js';
const CLEANUP_TRIGGER_TOOLS = new Set([
    'mcp__n8n-mcp__n8n_update_full_workflow',
    'mcp__n8n-mcp__n8n_update_partial_workflow',
    'mcp__n8n-mcp__n8n_create_workflow',
]);
/**
 * Check if the tool output indicates success
 */
function isSuccessfulOperation(output) {
    if (!output)
        return false;
    // String output - check for error indicators
    if (typeof output === 'string') {
        const lower = output.toLowerCase();
        if (lower.includes('error') || lower.includes('failed') || lower.includes('exception')) {
            return false;
        }
        // Presence of success indicators
        return (lower.includes('success') ||
            lower.includes('created') ||
            lower.includes('updated') ||
            /id["\s:]+\d+/.test(lower));
    }
    // Object output - check for error field
    if (typeof output === 'object') {
        const obj = output;
        if (obj['error'] ||
            String(obj['message'] ?? '')
                .toLowerCase()
                .includes('error')) {
            return false;
        }
        // Check for success indicators
        return Boolean(obj['id'] || obj['success'] || obj['data']);
    }
    return false;
}
/**
 * Check if a parsed JSON object looks like an n8n workflow.
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
 * Find workflow JSON files in temp directories
 */
function findTempWorkflowFiles(projectDir) {
    const tempDirs = ['temp', 'tmp'];
    const files = [];
    for (const tempDir of tempDirs) {
        const tempPath = path.join(projectDir, tempDir);
        if (!fs.existsSync(tempPath))
            continue;
        try {
            const entries = fs.readdirSync(tempPath, { withFileTypes: false });
            for (const entryName of entries) {
                if (entryName.endsWith('.json')) {
                    const filePath = path.join(tempPath, entryName);
                    // Verify it looks like a workflow
                    try {
                        const content = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
                        if (isWorkflowJson(content)) {
                            files.push(filePath);
                        }
                    }
                    catch {
                        // Not valid JSON or not a workflow - skip
                    }
                }
            }
        }
        catch {
            // Can't read directory - skip
        }
    }
    return files;
}
export async function n8nPostUpdateCleanupHook(input) {
    // Only run for n8n workflow update operations
    if (!CLEANUP_TRIGGER_TOOLS.has(input.tool_name)) {
        return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
    }
    // Check if operation was successful
    if (!isSuccessfulOperation(input.tool_output)) {
        log('[n8n-cleanup] Operation may have failed - preserving temp files for debugging');
        return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
    }
    // Find project directory (use cwd)
    const projectDir = process.cwd();
    // Find and archive workflow files in temp/
    const tempFiles = findTempWorkflowFiles(projectDir);
    if (tempFiles.length === 0) {
        return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
    }
    // Archive files (move to old/ instead of deleting - deletion ban compliant)
    const archived = [];
    for (const file of tempFiles) {
        const archivePath = archiveToDateDir(file);
        if (archivePath) {
            archived.push(path.basename(file));
        }
    }
    if (archived.length > 0) {
        log(`[+] Cleaned up ${archived.length} temp workflow file(s): ${archived.join(', ')}`);
        return {
            hookSpecificOutput: {
                hookEventName: 'PostToolUse',
                additionalContext: `Auto-archived ${archived.length} temporary workflow JSON file(s) after successful n8n update. Files moved to old/ directory.`,
            },
        };
    }
    return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
}
registerHook('n8n-post-update-cleanup', 'PostToolUse', n8nPostUpdateCleanupHook);
export default n8nPostUpdateCleanupHook;
//# sourceMappingURL=n8n_post_update_cleanup.js.map