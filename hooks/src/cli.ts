#!/usr/bin/env node
/**
 * Hook CLI Entry Point
 *
 * Usage: node dist/cli.js <hook-name>
 *
 * IMPORTANT: This CLI is designed to ALWAYS output valid JSON to stdout,
 * even on errors. This ensures hook errors surface to Claude's context
 * via additionalContext rather than being silently swallowed.
 */

// Import all hooks to register them
import './index.js';

// Import and run main
import { main, hookRegistry } from './runner.js';

/**
 * Output error as valid JSON that Claude Code can read.
 * This ensures errors surface to Claude's context.
 */
function outputError(error: unknown, hookName?: string): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  const errorStack = error instanceof Error ? error.stack : undefined;

  // Determine hook event type to output correct format
  const hook = hookName ? hookRegistry.find((h) => h.name === hookName) : null;
  const eventName = hook?.eventName ?? 'PostToolUse';

  let output: Record<string, unknown>;

  if (eventName === 'PreToolUse') {
    output = {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason: `HOOK ERROR [${hookName ?? 'unknown'}]: ${errorMessage}`,
      },
    };
  } else if (eventName === 'Stop') {
    output = {
      decision: 'approve',
      reason: `HOOK ERROR [${hookName ?? 'unknown'}]: ${errorMessage}`,
    };
  } else if (eventName === 'UserPromptSubmit' || eventName === 'SessionStart') {
    output = {
      hookEventName: eventName,
      additionalContext: `HOOK ERROR [${hookName ?? 'unknown'}]: ${errorMessage}\n${errorStack ?? ''}`,
    };
  } else {
    // PostToolUse or unknown
    output = {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `HOOK ERROR [${hookName ?? 'unknown'}]: ${errorMessage}\n${errorStack ?? ''}`,
      },
    };
  }

  // Output to stdout so Claude Code reads it
  console.log(JSON.stringify(output));
}

// Get hook name from args
const hookName = process.argv[2];

// Check if hook exists BEFORE running
if (hookName && !hookRegistry.some((h) => h.name === hookName)) {
  const availableHooks = hookRegistry.map((h) => h.name).join(', ');
  outputError(new Error(`Hook "${hookName}" not found. Available: ${availableHooks}`), hookName);
  process.exit(0); // Exit 0 so Claude Code treats output as valid
}

main().catch((error: unknown) => {
  outputError(error, hookName);
  // Exit 0 so Claude Code reads our JSON output instead of showing generic "hook error"
  process.exit(0);
});
