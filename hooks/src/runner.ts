/**
 * Hook Runner
 * Entry point for executing hooks from Claude Code
 */

import type { HookInput, HookOutput, HookEventName } from './types.js';
import { readStdin, parseJson, outputJson, log, logError, logSeparator, loadEnv } from './utils.js';

// Hook registry - hooks register themselves here
type HookHandler<TInput extends HookInput, TOutput extends HookOutput> = (
  input: TInput
) => Promise<TOutput>;

interface RegisteredHook {
  name: string;
  eventName: HookEventName;
  handler: HookHandler<HookInput, HookOutput>;
}

const hookRegistry: RegisteredHook[] = [];

/**
 * Register a hook handler
 */
export function registerHook<TInput extends HookInput, TOutput extends HookOutput>(
  name: string,
  eventName: HookEventName,
  handler: HookHandler<TInput, TOutput>
): void {
  hookRegistry.push({
    name,
    eventName,
    handler: handler as unknown as HookHandler<HookInput, HookOutput>,
  });
}

/**
 * Run a specific hook by name
 */
export async function runHook(hookName: string): Promise<void> {
  // Load environment variables
  loadEnv();

  // Find the hook
  const hook = hookRegistry.find((h) => h.name === hookName);
  if (!hook) {
    logError(new Error(`Hook not found: ${hookName}`));
    process.exit(1);
  }

  logSeparator(`${hook.name.toUpperCase()} HOOK`);

  try {
    // Read input from stdin
    const rawInput = await readStdin();
    const input = parseJson<HookInput>(rawInput);

    if (!input) {
      log('[WARN] Could not parse input JSON, using empty object');
    }

    // Execute the hook
    const output = await hook.handler(input ?? ({} as HookInput));

    // Output result
    outputJson(output);
  } catch (error) {
    logError(error instanceof Error ? error : new Error(String(error)), hook.name);

    // Output a safe default on error
    if (hook.eventName === 'PreToolUse') {
      outputJson({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'allow',
          permissionDecisionReason: `Hook error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        },
      });
    } else if (hook.eventName === 'Stop') {
      outputJson({
        decision: 'approve',
        reason: `Hook error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    } else {
      outputJson({
        hookEventName: hook.eventName,
        additionalContext: `Hook error: ${error instanceof Error ? error.message : 'Unknown error'}`,
      });
    }
  }
}

/**
 * Main entry point
 * Usage: node dist/runner.js <hook-name>
 */
export async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    log('Usage: node runner.js <hook-name>');
    log('');
    log('Available hooks:');
    for (const hook of hookRegistry) {
      log(`  - ${hook.name} (${hook.eventName})`);
    }
    process.exit(1);
  }

  const hookName = args[0];
  if (!hookName) {
    log('Error: Hook name is required');
    process.exit(1);
  }

  await runHook(hookName);
}

// Export for testing
export { hookRegistry };
