/**
 * Context Summary Trigger
 * Detects context threshold (4%) and instructs Claude to generate and save a conversation summary
 * before clearing context. This preserves continuity across sessions.
 */
import type { UserPromptSubmitInput, UserPromptSubmitOutput } from '../types.js';
/**
 * Extract project name from the working directory path
 */
export declare function extractProjectName(cwd: string): string;
/**
 * Generate the summary filename in format: projectname_summary_YYYY-MM-DD-HH-MM.md
 */
export declare function generateSummaryFilename(cwd: string): string;
/**
 * Get the full path to the summary file
 */
export declare function getSummaryFilePath(cwd: string): string;
/**
 * Generate the instruction text for Claude to create and save a summary
 */
export declare function generateSummaryInstructions(cwd: string, pct: number): string;
/**
 * Main hook function
 */
declare function contextSummaryTrigger(_input: UserPromptSubmitInput): Promise<UserPromptSubmitOutput>;
export { contextSummaryTrigger };
export default contextSummaryTrigger;
//# sourceMappingURL=context-summary-trigger.d.ts.map