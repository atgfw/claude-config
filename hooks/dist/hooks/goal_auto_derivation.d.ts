/**
 * Goal Auto-Derivation Hook
 *
 * Automatically derives the active goal from work context sources.
 * Uses LLM-NATIVE prompting - Claude extracts fields, not regex parsing.
 *
 * Priority cascade:
 * 1. Git branch issue reference (feature/issue-123 → prompt Claude to hydrate)
 * 2. OpenSpec linkedArtifacts in active-goal.json
 * 3. Fallback: soft prompt to define
 *
 * KEY DESIGN: This hook DETECTS context and PROMPTS Claude to extract.
 * It does NOT parse text with regex. The LLM does semantic understanding.
 *
 * Runs at: SessionStart, UserPromptSubmit (to detect context changes)
 */
import type { SessionStartInput, SessionStartOutput, UserPromptSubmitInput, UserPromptSubmitOutput } from '../types.js';
import { type GoalLevel, type GoalFields } from '../session/goal_stack.js';
interface DerivedGoal {
    source: 'git-branch' | 'openspec' | 'active-goal' | 'none';
    goal: GoalLevel | null;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
    /** If true, fields need LLM extraction */
    needsExtraction: boolean;
    /** Issue number for LLM extraction prompt */
    issueNumber?: number;
}
interface GitBranchInfo {
    branch: string;
    issueNumber?: number;
    issueType?: 'feature' | 'bugfix' | 'hotfix' | 'chore' | 'docs';
}
interface OpenSpecProposal {
    changeId: string;
    title: string;
    status: 'draft' | 'in-progress' | 'completed' | 'archived';
}
/**
 * Parse git branch for issue reference.
 * Only extracts the issue number - does NOT try to parse issue content.
 */
declare function parseGitBranch(workingDir: string): GitBranchInfo | null;
/**
 * Fetch GitHub issue title only (for goal summary).
 * Does NOT parse the body - that's for the LLM.
 */
declare function fetchGitHubIssueTitle(issueNumber: number, workingDir: string): string | null;
/**
 * Load OpenSpec proposal title by change ID.
 */
declare function loadOpenSpecProposal(changeId: string): OpenSpecProposal | null;
/**
 * Generate prompt for Claude to extract goal fields from a GitHub issue.
 * This is the KEY function - Claude does the semantic extraction, not regex.
 */
declare function generateIssueExtractionPrompt(issueNumber: number, issueTitle: string): string;
/**
 * Generate prompt for Claude to extract goal fields from an OpenSpec proposal.
 */
declare function generateOpenSpecExtractionPrompt(changeId: string, title: string): string;
/**
 * Check if goal fields need LLM extraction (mostly placeholders).
 */
declare function needsExtraction(fields: GoalFields): boolean;
/**
 * Derive goal from context sources.
 * Returns minimal goal + flag for whether LLM extraction is needed.
 */
declare function deriveGoalFromContext(workingDir: string): DerivedGoal;
/**
 * Hydrate session goal stack from derived context.
 */
declare function hydrateGoalStack(sessionId: string, workingDir: string, derived: DerivedGoal): {
    hydrated: boolean;
    message: string;
};
/**
 * SessionStart hook - auto-derive goal and emit LLM extraction prompt if needed.
 */
declare function goalAutoDerivationSessionStart(input: SessionStartInput): Promise<SessionStartOutput>;
/**
 * UserPromptSubmit hook - detect context changes that might affect goal.
 */
declare function goalAutoDerivationPromptSubmit(input: UserPromptSubmitInput): Promise<UserPromptSubmitOutput>;
export { goalAutoDerivationSessionStart, goalAutoDerivationPromptSubmit, deriveGoalFromContext, hydrateGoalStack, parseGitBranch, fetchGitHubIssueTitle, loadOpenSpecProposal, needsExtraction, generateIssueExtractionPrompt, generateOpenSpecExtractionPrompt, type DerivedGoal, type GitBranchInfo, type OpenSpecProposal, };
export default goalAutoDerivationSessionStart;
//# sourceMappingURL=goal_auto_derivation.d.ts.map