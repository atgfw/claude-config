/**
 * Checklist Sync Hooks
 *
 * PostToolUse hooks that trigger checklist reconciliation on file operations.
 * - Read triggers: reconcile when tasks.md or plan files are read
 * - Write triggers: reconcile and propagate when files are written
 */
import { registerHook } from '../runner.js';
import { reconcileArtifact } from '../sync/checklist_reconciler.js';
import { propagateToLinkedArtifacts } from '../sync/checklist_propagator.js';
// Patterns to match checklist-containing files
const OPENSPEC_TASKS_PATTERN = /[/\\]openspec[/\\]changes[/\\]([^/\\]+)[/\\]tasks\.md$/i;
const PLAN_FILE_PATTERN = /[/\\]plans?[/\\]([^/\\]+\.md)$/i;
/**
 * Determine artifact type and ID from file path.
 */
function parseFilePath(filePath) {
    const openspecMatch = OPENSPEC_TASKS_PATTERN.exec(filePath);
    if (openspecMatch?.[1]) {
        return { type: 'openspec', id: openspecMatch[1] };
    }
    const planMatch = PLAN_FILE_PATTERN.exec(filePath);
    if (planMatch) {
        return { type: 'plan', id: filePath };
    }
    return null;
}
/**
 * PostToolUse hook for Read operations.
 * Triggers reconciliation when tasks.md or plan files are read.
 */
async function checklistReadHook(input) {
    if (input.tool_name !== 'Read') {
        return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
    }
    const filePath = input.tool_input['file_path'];
    if (!filePath) {
        return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
    }
    const parsed = parseFilePath(filePath);
    if (!parsed) {
        return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
    }
    // Get file content from tool output
    const content = input.tool_output;
    if (!content) {
        return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
    }
    // Reconcile with registry
    const result = reconcileArtifact(parsed.type, parsed.id, content);
    if (result.driftDetected) {
        return {
            hookSpecificOutput: {
                hookEventName: 'PostToolUse',
                additionalContext: `Checklist drift detected in ${parsed.type}: +${result.itemsAdded} added, -${result.itemsRemoved} removed, ~${result.statusChanges} status changes`,
            },
        };
    }
    return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
}
/**
 * PostToolUse hook for Write/Edit operations.
 * Triggers reconciliation and propagation when checklist files are written.
 */
async function checklistWriteHook(input) {
    if (input.tool_name !== 'Write' && input.tool_name !== 'Edit') {
        return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
    }
    const filePath = input.tool_input['file_path'];
    if (!filePath) {
        return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
    }
    const parsed = parseFilePath(filePath);
    if (!parsed) {
        return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
    }
    // Get content - for Write it's in tool_input, for Edit we need the result
    let content;
    if (input.tool_name === 'Write') {
        content = input.tool_input['content'];
    }
    // For Edit, we don't have full content easily available, skip reconciliation
    if (!content) {
        return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
    }
    // Reconcile with registry
    const result = reconcileArtifact(parsed.type, parsed.id, content);
    // Propagate changes to linked artifacts
    const propagated = await propagateToLinkedArtifacts(parsed.type, parsed.id);
    const messages = [];
    if (result.driftDetected) {
        messages.push(`Checklist reconciled: +${result.itemsAdded} added, -${result.itemsRemoved} removed, ~${result.statusChanges} changed`);
    }
    if (propagated.length > 0) {
        messages.push(`Propagated to: ${propagated.join(', ')}`);
    }
    if (messages.length > 0) {
        return {
            hookSpecificOutput: {
                hookEventName: 'PostToolUse',
                additionalContext: messages.join('. '),
            },
        };
    }
    return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
}
// Register hooks
registerHook('checklist-read', 'PostToolUse', checklistReadHook);
registerHook('checklist-write', 'PostToolUse', checklistWriteHook);
export { checklistReadHook, checklistWriteHook, parseFilePath, OPENSPEC_TASKS_PATTERN, PLAN_FILE_PATTERN, };
//# sourceMappingURL=checklist_sync_hooks.js.map