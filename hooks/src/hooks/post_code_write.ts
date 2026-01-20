/**
 * Post-Code-Write Hook
 * BLOCKS until code-reviewer is invoked after writing code
 * Enforces: "After writing code | code-reviewer | Immediately after Write/Edit"
 */

import type { PostToolUseInput, PostToolUseOutput } from '../types.js';
import { log, logBlocked, logAllowed, flagExists, archiveFlag, setFlag } from '../utils.js';
import { registerHook } from '../runner.js';

const REVIEW_FLAG = 'code-review-completed';
const VISUAL_VALIDATION_NEEDED_FLAG = 'visual-validation-needed';

// Frontend file patterns that require visual validation
const FRONTEND_EXTENSIONS = [
  '.html',
  '.htm',
  '.css',
  '.scss',
  '.sass',
  '.less',
  '.jsx',
  '.tsx',
  '.vue',
  '.svelte',
];
const FRONTEND_PATH_PATTERNS = [
  '/components/',
  '/pages/',
  '/views/',
  '/ui/',
  '/frontend/',
  '/src/app/',
  '/src/routes/',
];

function isFrontendFile(filePath: string): boolean {
  const lowerPath = filePath.toLowerCase();
  for (const ext of FRONTEND_EXTENSIONS) {
    if (lowerPath.endsWith(ext)) return true;
  }
  for (const pattern of FRONTEND_PATH_PATTERNS) {
    if (lowerPath.includes(pattern)) return true;
  }
  return false;
}

/**
 * Post-Code-Write Hook Implementation
 *
 * After Write/Edit operations, enforces that code review was performed.
 * Uses a flag file to track whether code-reviewer was invoked.
 * Also sets visual-validation-needed flag for frontend files.
 */
export async function postCodeWriteHook(input: PostToolUseInput): Promise<PostToolUseOutput> {
  log(`Tool executed: ${input.tool_name}`);

  // Extract file info for logging
  const toolInput = input.tool_input;
  const filePath =
    toolInput && typeof toolInput === 'object' && 'file_path' in toolInput
      ? String(toolInput['file_path'])
      : undefined;

  if (filePath) {
    log(`File: ${filePath}`);
    // Check if this is frontend code that needs visual validation
    if (isFrontendFile(filePath)) {
      setFlag(VISUAL_VALIDATION_NEEDED_FLAG);
      log('[INFO] Frontend file detected - visual validation will be required');
    }
  }
  log('');

  // Check if code review was completed
  if (!flagExists(REVIEW_FLAG)) {
    logBlocked(
      'Code review required before continuing',
      'After writing code | code-reviewer | Immediately after Write/Edit'
    );
    log('');
    log('REQUIRED ACTION:');
    log('  1. Invoke code-reviewer subagent:');
    log("     Task(subagent_type='code-reviewer', prompt='Review the code changes')");
    log('');
    log('  2. After review completes, create flag:');
    log('     touch ~/.claude/code-review-completed');
    log('');

    return {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        decision: 'block',
        reason: 'Code review required - invoke code-reviewer subagent',
      },
    };
  }

  // Code review completed
  logAllowed('Code review completed');

  // Archive the flag (deletion ban compliant) for next write
  archiveFlag(REVIEW_FLAG);

  return {
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: 'Code review completed',
    },
  };
}

// Register the hook
registerHook('post-code-write', 'PostToolUse', postCodeWriteHook);

export default postCodeWriteHook;
