/**
 * Hook Runner
 * Entry point for executing hooks from Claude Code
 */
import type { HookInput, HookOutput, HookEventName } from './types.js';
type HookHandler<TInput extends HookInput, TOutput extends HookOutput> = (input: TInput) => Promise<TOutput>;
interface RegisteredHook {
    name: string;
    eventName: HookEventName;
    handler: HookHandler<HookInput, HookOutput>;
}
declare const hookRegistry: RegisteredHook[];
/**
 * Register a hook handler
 */
export declare function registerHook<TInput extends HookInput, TOutput extends HookOutput>(name: string, eventName: HookEventName, handler: HookHandler<TInput, TOutput>): void;
/**
 * Run a specific hook by name
 */
export declare function runHook(hookName: string): Promise<void>;
/**
 * Main entry point
 * Usage: node dist/runner.js <hook-name>
 */
export declare function main(): Promise<void>;
export { hookRegistry };
//# sourceMappingURL=runner.d.ts.map