/**
 * Artifact Goal Injector - Validates goal context in OpenSpec proposals and plan files
 *
 * Uses PostToolUse to check Write operations to openspec/ and plan .md files.
 * If goal section is missing, adds additionalContext instructing inclusion.
 *
 * This ensures all artifacts have embedded goal context for traceability.
 */
import type { PostToolUseInput, PostToolUseOutput } from '../types.js';
declare const OPENSPEC_PATTERN: RegExp;
declare const PLAN_PATTERN: RegExp;
/**
 * Format goal context as a markdown ## Goal section.
 */
declare function formatGoalSection(goalContext: {
    summary: string;
    fields: Record<string, string>;
}): string;
/**
 * Check if content already has a ## Goal section.
 */
declare function hasGoalSection(content: string): boolean;
/**
 * PostToolUse hook - check goal presence in OpenSpec and plan files after write
 */
declare function artifactGoalInjector(input: PostToolUseInput): Promise<PostToolUseOutput>;
export { artifactGoalInjector, formatGoalSection, hasGoalSection, OPENSPEC_PATTERN, PLAN_PATTERN };
//# sourceMappingURL=artifact_goal_injector.d.ts.map