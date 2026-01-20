/**
 * Pre-Task-Start Hook
 * Validates MCP servers, subagents, and child project compliance before starting any task
 * Uses compact mode to skip validation if session was recently validated
 */
import type { UserPromptSubmitInput, UserPromptSubmitOutput } from '../types.js';
/**
 * Pre-Task-Start Hook Implementation
 *
 * Before any task begins, verifies that the environment is ready:
 * - MCP servers are healthy
 * - Required subagents are available
 * - Child project is not overriding global config
 *
 * Uses compact mode: skips full validation if session was validated recently.
 */
export declare function preTaskStartHook(_input: UserPromptSubmitInput): Promise<UserPromptSubmitOutput>;
export default preTaskStartHook;
//# sourceMappingURL=pre_task_start.d.ts.map