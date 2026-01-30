/**
 * Goal Injector - UserPromptSubmit hook
 * Maintains and injects a "sharp pointed goal" into every turn via additionalContext.
 */
import type { UserPromptSubmitInput, UserPromptSubmitOutput } from '../types.js';
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
export declare function detectGoalSet(prompt: string): boolean;
export declare function detectGoalClear(prompt: string): boolean;
export declare function extractGoalText(prompt: string): string;
export declare function formatGoalContext(goal: ActiveGoal): string;
export declare function hasDehydratedFields(goal: ActiveGoal): boolean;
declare function goalInjector(input: UserPromptSubmitInput): Promise<UserPromptSubmitOutput>;
/**
 * Get active goal context for embedding in other systems.
 * Returns null if no goal is active.
 */
export declare function getActiveGoalContext(): {
    summary: string;
    fields: Record<string, string>;
} | null;
export { goalInjector as goalInjectorHook };
export default goalInjector;
//# sourceMappingURL=goal_injector.d.ts.map