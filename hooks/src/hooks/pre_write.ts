/**
 * Pre-Write Hook
 * BLOCKS Write/Edit when Morph MCP is available
 * BLOCKS emoji content
 * WARNS on file governance violations (non-blocking)
 */

import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
import {
  log,
  logBlocked,
  logAllowed,
  containsEmoji,
  isMorphAvailable,
  getMcpServerHealth,
} from '../utils.js';
import { registerHook } from '../runner.js';
import { checkFileGovernance } from '../governance/file_governance.js';

/**
 * Pre-Write Hook Implementation
 *
 * Checks Write/Edit operations for:
 * 1. Emoji content (BLOCK)
 * 2. Morph MCP availability (BLOCK - should use edit_file instead)
 * 3. File governance rules (WARN - non-blocking)
 */
export async function preWriteHook(input: PreToolUseInput): Promise<PreToolUseOutput> {
  const { filePath, content } = extractWriteInput(input);

  log(`File: ${filePath || '(unknown)'}`);
  log('');

  // BLOCK: Check for emoji in content
  if (content && containsEmoji(content)) {
    logBlocked('Emoji detected in file content', 'Never use emojis anywhere for any reason.');
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: 'Emojis banned per CLAUDE.md',
      },
    };
  }

  // BLOCK: Check if MCP file tools are available
  const morphAvailable = isMorphAvailable();
  const desktopCommanderHealthy = getMcpServerHealth('desktop-commander') === 'healthy';
  if (morphAvailable || desktopCommanderHealthy) {
    const tools: string[] = [];
    if (morphAvailable) {
      tools.push('mcp__morph__edit_file');
    }
    if (desktopCommanderHealthy) {
      tools.push('mcp__desktop-commander__write_file');
    }

    logBlocked('MCP file tools are available', 'Use MCP tools for ALL file modifications');
    log('');
    log('REQUIRED: Use one of the following tools instead:');
    for (const tool of tools) {
      log(`  - ${tool}`);
    }
    log(`  File: ${filePath || '(specify file)'}`);

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `Use MCP tools instead: ${tools.join(' or ')}`,
      },
    };
  }
  // WARN: Check file governance (non-blocking)
  if (filePath && content) {
    const warnings = checkFileGovernance(filePath, content);
    if (warnings.length > 0) {
      log('[GOVERNANCE WARNINGS]');
      for (const w of warnings) {
        log(`  [${w.rule}] ${w.message}`);
        if (w.suggestion) {
          log(`       -> ${w.suggestion}`);
        }
      }
      log('');
    }
  }

  // ALLOW: Write permitted
  logAllowed('Write allowed');

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
    },
  };
}
function extractWriteInput(input: PreToolUseInput): { filePath?: string; content?: string } {
  const toolInput = input.tool_input;
  if (!toolInput || typeof toolInput !== 'object') return {};

  const filePath = toolInput['file_path'];
  const content = toolInput['content'];

  return {
    filePath: typeof filePath === 'string' ? filePath : undefined,
    content: typeof content === 'string' ? content : undefined,
  };
}

registerHook('pre-write', 'PreToolUse', preWriteHook);

export default preWriteHook;
