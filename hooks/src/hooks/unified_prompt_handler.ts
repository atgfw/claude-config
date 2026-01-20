/**
 * Unified Prompt Handler - Consolidates UserPromptSubmit hooks into 1
 */

import * as fs from 'fs';
import * as path from 'path';
import type { UserPromptSubmitInput, UserPromptSubmitOutput } from '../types.js';
import { log, getClaudeDir } from '../utils.js';
import { registerHook } from '../runner.js';

async function unifiedPromptHandler(input: UserPromptSubmitInput): Promise<UserPromptSubmitOutput> {
  const prompt = input.prompt || '';

  // CHECK 1: MCP registry exists
  const registryPath = path.join(getClaudeDir(), 'mcp', 'mcp-registry.json');
  if (!fs.existsSync(registryPath)) {
    log('MCP registry missing');
  }

  // CHECK 2: Workflow intent
  if (/create.*workflow|new.*workflow/i.test(prompt)) {
    log('Intent: WORKFLOW_CREATE');
  } else if (/delete.*workflow/i.test(prompt)) {
    log('Intent: WORKFLOW_DELETE');
  }

  // CHECK 3: Escalation patterns
  const escalation = ['you keep', 'you always', 'wrong again'];
  for (const phrase of escalation) {
    if (prompt.toLowerCase().includes(phrase)) {
      log('Escalation detected');
      break;
    }
  }

  return { hookEventName: 'UserPromptSubmit' };
}

registerHook('unified-prompt-handler', 'UserPromptSubmit', unifiedPromptHandler);
export default unifiedPromptHandler;
