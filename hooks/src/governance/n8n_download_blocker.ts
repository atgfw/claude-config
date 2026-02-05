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
import { log } from '../utils.js';
import { registerHook } from '../runner.js';

const BLOCKED_TOOLS = new Set(['mcp__n8n-mcp__n8n_get_workflow']);

const ALLOWED_ALTERNATIVES = [
  'mcp__n8n-mcp__n8n_list_workflows - View workflow metadata',
  'mcp__n8n-mcp__n8n_update_partial_workflow - Update specific nodes/fields',
  'mcp__n8n-mcp__n8n_update_full_workflow - Push complete workflow from spec',
];

function allow(): PreToolUseOutput {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
    },
  };
}

export async function n8nDownloadBlockerHook(input: PreToolUseInput): Promise<PreToolUseOutput> {
  if (!BLOCKED_TOOLS.has(input.tool_name)) {
    return allow();
  }

  // Check for documentation_only escape hatch
  const toolInput = input.tool_input as Record<string, unknown>;
  if (toolInput['documentation_only'] === true) {
    log('[+] n8n_get_workflow allowed for documentation (documentation_only: true)');
    return allow();
  }

  log('[X] n8n workflow download blocked');

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        `BLOCKED: Downloading full workflow JSON is not allowed. ` +
        `Cloud-only storage is enforced for n8n workflows. ` +
        `\n\nUse these alternatives instead:\n` +
        ALLOWED_ALTERNATIVES.map((a) => `  - ${a}`).join('\n') +
        `\n\nIf you need to document workflow structure, use: n8n_get_workflow with documentation_only: true`,
    },
  };
}

registerHook('n8n-download-blocker', 'PreToolUse', n8nDownloadBlockerHook);
export default n8nDownloadBlockerHook;
