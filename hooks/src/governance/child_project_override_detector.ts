/**
 * Child Project Override Detector
 *
 * PREVENTS child projects from creating local configuration that overrides
 * the global Spinal Cord (~/.claude) configuration.
 *
 * Critical Rules from CLAUDE.md:
 * - Child projects MUST NOT override global configuration
 * - No local .mcp.json, hooks, settings.json, or .env
 * - All configuration flows DOWN from ~/.claude/
 *
 * Detects:
 * - Write operations creating .mcp.json in project directories
 * - Write operations creating settings.json outside ~/.claude
 * - Write operations creating hooks/ directory outside ~/.claude
 * - Write operations creating .env outside ~/.claude
 */

import { PreToolUseInput, PreToolUseOutput } from '../types.js';
import { logBlocked } from '../utils.js';
import { registerHook } from '../runner.js';
import * as path from 'node:path';
import * as os from 'node:os';

const CLAUDE_DIR = path.join(os.homedir(), '.claude');

const BANNED_CHILD_FILES = ['.mcp.json', 'settings.json', '.env'];

const BANNED_CHILD_DIRECTORIES = ['hooks'];

/**
 * Check if path is within the .claude directory
 */
function isWithinClaudeDir(filePath: string): boolean {
  const normalized = path.normalize(filePath);
  const claudeDirNormalized = path.normalize(CLAUDE_DIR);
  return normalized.startsWith(claudeDirNormalized);
}

/**
 * Check if filename matches banned child project files
 */
function isBannedFile(filePath: string): boolean {
  const filename = path.basename(filePath);
  return BANNED_CHILD_FILES.includes(filename);
}

/**
 * Check if path includes banned child project directories
 */
function isBannedDirectory(filePath: string): boolean {
  const parts = filePath.split(path.sep);
  return parts.some((part) => BANNED_CHILD_DIRECTORIES.includes(part));
}

export async function childProjectOverrideDetectorHook(
  input: PreToolUseInput
): Promise<PreToolUseOutput> {
  // Only check Write operations
  if (input.tool_name !== 'Write') {
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

  // If file is within .claude directory, always allow
  if (isWithinClaudeDir(filePath)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  // Check for banned files in child projects
  if (isBannedFile(filePath)) {
    const filename = path.basename(filePath);
    logBlocked(
      `Attempted to create ${filename} in child project`,
      'Child projects MUST NOT override global configuration'
    );

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `BLOCKED: Child projects MUST NOT override global configuration. ` +
          `Found attempt to create "${filename}" outside ~/.claude/. ` +
          `The Spinal Cord (~/.claude) is the sole source of configuration. ` +
          `All ${filename} files must live in ~/.claude/ only. ` +
          `Child projects inherit configuration, never override.`,
      },
    };
  }

  // Check for banned directories in child projects
  if (isBannedDirectory(filePath)) {
    logBlocked(
      `Attempted to create hooks/ directory in child project`,
      'Child projects MUST NOT have local hooks'
    );

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `BLOCKED: Child projects MUST NOT create local hooks. ` +
          `Found attempt to create hooks/ directory outside ~/.claude/. ` +
          `All hooks live in ~/.claude/hooks/ and apply universally. ` +
          `Global Hook Supremacy: hooks are not optional conveniences - they are the law.`,
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
registerHook('child-project-override-detector', 'PreToolUse', childProjectOverrideDetectorHook);
