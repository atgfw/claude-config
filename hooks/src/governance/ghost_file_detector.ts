/**
 * Ghost File Detector
 *
 * PREVENTS treating local files as source of truth when cloud APIs are authoritative.
 *
 * Critical Rule from CLAUDE.md:
 * - LIVE APIs are source of truth
 * - Local files (governance.yaml, registry.yaml) are documentation/cache only
 * - Always query LIVE APIs before creating cloud objects
 *
 * Ghost Files: Local files that claim to represent cloud state but are stale/wrong
 *
 * Detects:
 * - Reads of governance.yaml, registry.yaml, manifests when creating cloud objects
 * - Suggests using LIVE API queries instead
 */

import { PreToolUseInput, PreToolUseOutput } from '../types.js';
import { log } from '../utils.js';
import { registerHook } from '../runner.js';
import * as path from 'node:path';

const GHOST_FILE_PATTERNS = [
  'governance.yaml',
  'governance.yml',
  'registry.yaml',
  'registry.yml',
  'workflow-registry.yaml',
  'agent-manifest.yaml',
  'agent-manifest.yml',
];

/**
 * Check if filename matches ghost file patterns
 */
function isGhostFile(filePath: string): boolean {
  const filename = path.basename(filePath).toLowerCase();
  return GHOST_FILE_PATTERNS.some((pattern) => filename.includes(pattern));
}

export async function ghostFileDetectorHook(input: PreToolUseInput): Promise<PreToolUseOutput> {
  // Only check Read operations
  if (input.tool_name !== 'Read') {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  const toolInput = input.tool_input as Record<string, unknown>;
  const filePath = toolInput['file_path'] as string;

  if (!filePath) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  // Check for ghost files
  if (isGhostFile(filePath)) {
    const filename = path.basename(filePath);
    log(`[GHOST FILE] WARNING: Reading ${filename} - remember to query LIVE APIs for cloud state`);

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason:
          `GOVERNANCE WARNING: Reading "${filename}" which may be a ghost file (stale/outdated). ` +
          `Local files are documentation only. LIVE APIs are source of truth. ` +
          `Before creating cloud objects (n8n workflows, ElevenLabs agents), query LIVE APIs: ` +
          `n8n: mcp__n8n-mcp__n8n_list_workflows | ElevenLabs: mcp__elevenlabs-mcp__list_agents`,
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

// Register the hook
registerHook('ghost-file-detector', 'PreToolUse', ghostFileDetectorHook);
