/**
 * Inline Script Validator Hook
 * BLOCKS complex inline scripts that fail due to quote/escape issues
 * Enforces: "Never use complex inline scripts - They WILL fail. Use temp file pattern."
 */

import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
import { log, logBlocked, logAllowed } from '../utils.js';
import { registerHook } from '../runner.js';

/**
 * Patterns for complex inline scripts that WILL fail
 */
const COMPLEX_INLINE_PATTERNS = [
  // node -e with JSON, template literals, or mixed quotes
  /node\s+(-e|--eval)\s+["'][^"']*[{}\[\]`$][^"']*["']/i,
  // node -e with template literals
  /node\s+(-e|--eval)\s+["'][^"']*`[^"']*["']/i,
  // powershell -Command with $ variables or complex expressions
  /powershell\s+(-Command|-C)\s+["'][^"']*\$[^"']*["']/i,
  // heredoc with backticks or $() substitution
  /<<\s*['"]?EOF['"]?.*`/s,
  /<<\s*['"]?EOF['"]?.*\$\(/s,
  // Multiple quote levels (triple nesting or more)
  /["'].*["'].*["'].*["']/,
];

/**
 * Check if command contains complex inline script patterns
 */
function containsComplexInlineScript(command: string): boolean {
  return COMPLEX_INLINE_PATTERNS.some((pattern) => pattern.test(command));
}

/**
 * Inline Script Validator Hook Implementation
 *
 * Checks bash commands for complex inline scripts that will fail:
 * - node -e with JSON, template literals, or mixed quotes
 * - powershell -Command with $ variables
 * - heredoc with backticks or $() substitution
 * - Multiple levels of quote nesting
 */
export async function inlineScriptValidatorHook(input: PreToolUseInput): Promise<PreToolUseOutput> {
  // Extract command from input
  const command = extractCommand(input);

  if (!command) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  log(`Checking for complex inline scripts in: ${command.substring(0, 100)}...`);

  // Check for complex inline scripts
  if (containsComplexInlineScript(command)) {
    logBlocked(
      'Complex inline script detected',
      'Never use complex inline scripts - They WILL fail. Use temp file pattern instead.'
    );
    log('');
    log('WRONG (will fail):');
    log('  node -e "console.log(JSON.stringify({ key: \\"value\\" }))"');
    log('  powershell -Command "$data = Get-Content file.json; $data.field"');
    log('  cat <<EOF with $() or backticks inside');
    log('');
    log('CORRECT (temp file pattern):');
    log('  1. Write simple content to temp file using heredoc (no special chars)');
    log('  2. Copy to target: powershell -Command "Copy-Item source target -Force"');
    log('  3. Or execute: node /path/to/tempfile.js');
    log('');
    log('For complex content:');
    log('  - Use Write tool directly (works when Morph MCP unavailable)');
    log('  - Split into multiple simple heredocs');
    log('  - Use Node.js fs.writeFileSync with base64 encoding');
    log('');

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          'Complex inline scripts banned - use temp file pattern per CLAUDE.md',
      },
    };
  }

  logAllowed('No complex inline scripts detected');

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
    },
  };
}

/**
 * Extract command from tool input
 */
function extractCommand(input: PreToolUseInput): string | undefined {
  const toolInput = input.tool_input;
  if (toolInput && typeof toolInput === 'object') {
    const cmd = toolInput['command'];
    if (typeof cmd === 'string') {
      return cmd;
    }
  }
  return undefined;
}

// Register the hook
registerHook('inline-script-validator', 'PreToolUse', inlineScriptValidatorHook);

export default inlineScriptValidatorHook;
