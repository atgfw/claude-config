/**
 * OpenSpec Issue Bridge Hook (PostToolUse)
 *
 * Detects when an OpenSpec proposal.md is written and auto-creates
 * a corresponding GitHub issue. Links the issue to the OpenSpec change
 * in the sync registry.
 *
 * This bridges manual OpenSpec creation (via /openspec:proposal skill)
 * to the GitHub issue tracking system.
 */
import { registerHook } from '../runner.js';
import { log } from '../utils.js';
import { createFromOpenSpec } from '../github/issue_crud.js';
import { linkOpenSpec } from '../github/task_source_sync.js';
/** Extract the OpenSpec change ID from a proposal.md file path */
export function extractChangeId(filePath) {
    // Match: .../openspec/changes/<change-id>/proposal.md
    const match = filePath.replace(/\\/g, '/').match(/openspec\/changes\/([^/]+)\/proposal\.md$/);
    return match?.[1] ?? null;
}
/**
 * PostToolUse hook - auto-create GitHub issue when proposal.md is written.
 */
async function openspecIssueBridge(input) {
    const { tool_name, tool_input } = input;
    // Only process Write/Edit operations
    if (tool_name !== 'Write' && tool_name !== 'Edit') {
        return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
    }
    const filePath = tool_input?.file_path ?? '';
    const changeId = extractChangeId(filePath);
    if (!changeId) {
        return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
    }
    // Skip archive proposals
    if (filePath.includes('/archive/') || filePath.includes('\\archive\\')) {
        return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
    }
    log(`[openspec-bridge] Detected proposal write: ${changeId}`);
    try {
        const issueNumber = createFromOpenSpec(changeId);
        if (issueNumber) {
            linkOpenSpec(issueNumber, changeId);
            log(`[openspec-bridge] Created and linked issue #${issueNumber} for ${changeId}`);
            return {
                hookSpecificOutput: {
                    hookEventName: 'PostToolUse',
                    additionalContext: `GitHub issue #${issueNumber} auto-created for OpenSpec proposal "${changeId}"`,
                },
            };
        }
        // Null means duplicate detected or file already implemented
        log(`[openspec-bridge] Issue not created (duplicate or already implemented)`);
    }
    catch (error) {
        log(`[openspec-bridge] Issue creation failed: ${error.message}`);
    }
    return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
}
registerHook('openspec-issue-bridge', 'PostToolUse', openspecIssueBridge);
export { openspecIssueBridge };
export default openspecIssueBridge;
//# sourceMappingURL=openspec_issue_bridge.js.map