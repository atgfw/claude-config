/**
 * Goal Injector - Injects sharp pointed goal into ALL hook event types
 * Registers for: UserPromptSubmit, PostToolUse, SessionStart
 * Ensures every turn has goal context via additionalContext.
 *
 * Goal management is EXPLICIT via direct file edit only.
 * This hook is READ-ONLY - it never modifies the goal file.
 */
import type { UserPromptSubmitInput, UserPromptSubmitOutput, PostToolUseInput, PostToolUseOutput, SessionStartInput, SessionStartOutput } from '../types.js';
declare const GOAL_FIELDS: readonly ["who", "what", "when", "where", "why", "how"];
type GoalField = (typeof GOAL_FIELDS)[number];
export interface ActiveGoal {
    goal: string | null;
    fields: Record<GoalField, string>;
    summary: string | null;
    updatedAt: string | null;
    history: Array<{
        summary: string;
        clearedAt: string;
    }>;
}
export declare function getGoalPath(): string;
export declare function loadGoal(): ActiveGoal;
export declare function createEmptyGoal(): ActiveGoal;
export declare function saveGoal(goal: ActiveGoal): void;
export declare function formatGoalContext(goal: ActiveGoal): string;
export declare function hasDehydratedFields(goal: ActiveGoal): boolean;
/**
 * UserPromptSubmit hook - inject goal context on every user prompt
 * READ-ONLY: Does not modify goal file
 */
declare function goalInjector(_input: UserPromptSubmitInput): Promise<UserPromptSubmitOutput>;
/**
 * Get active goal context for embedding in other systems.
 * Returns null if no goal is active.
 */
export declare function getActiveGoalContext(): {
    summary: string;
    fields: Record<string, string>;
} | null;
/**
 * PostToolUse hook - inject goal context after every tool use
 */
declare function goalInjectorPostToolUse(_input: PostToolUseInput): Promise<PostToolUseOutput>;
/**
 * SessionStart hook - inject goal context at session start
 */
declare function goalInjectorSessionStart(_input: SessionStartInput): Promise<SessionStartOutput>;
export { goalInjector as goalInjectorHook, goalInjectorPostToolUse, goalInjectorSessionStart };
export default goalInjector;
//# sourceMappingURL=goal_injector.d.ts.map