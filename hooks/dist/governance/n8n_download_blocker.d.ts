/**
 * N8N Download Blocker
 *
 * BLOCKS mcp__n8n-mcp__n8n_get_workflow to prevent downloading full workflow JSON.
 * Users should use partial update tools instead of download-edit-upload pattern.
 *
 * ALLOWED:
 * - mcp__n8n-mcp__n8n_list_workflows (metadata only)
 * - mcp__n8n-mcp__n8n_update_partial_workflow (targeted updates)
 * - mcp__n8n-mcp__n8n_get_workflow with documentation_only: true flag
 *
 * Issue: #19, #33
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
export declare function n8nDownloadBlockerHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default n8nDownloadBlockerHook;
//# sourceMappingURL=n8n_download_blocker.d.ts.map