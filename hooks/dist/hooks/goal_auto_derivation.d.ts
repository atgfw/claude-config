/**
 * Goal Auto-Derivation Hook
 *
 * Automatically derives the active goal from work context sources.
 * No manual goal setting required - focus is determined by what you're working on.
 *
 * Priority cascade:
 * 1. Git branch issue reference (feature/issue-123 → hydrate from GitHub issue)
 * 2. OpenSpec linkedArtifacts in active-goal.json
 * 3. Active Claude Code task (in_progress status)
 * 4. Most recent commit message intent
 * 5. Fallback: soft prompt to define
 *
 * Runs at: SessionStart, UserPromptSubmit (to detect context changes)
 */
import type { SessionStartInput, SessionStartOutput, UserPromptSubmitInput, UserPromptSubmitOutput } from '../types.js';
import { type GoalLevel } from '../session/goal_stack.js';
interface DerivedGoal {
    source: 'git-branch' | 'openspec' | 'active-goal' | 'task' | 'commit' | 'none';
    goal: GoalLevel | null;
    confidence: 'high' | 'medium' | 'low';
    reason: string;
}
interface GitBranchInfo {
    branch: string;
    issueNumber?: number;
    issueType?: 'feature' | 'bugfix' | 'hotfix' | 'chore' | 'docs';
}
interface OpenSpecProposal {
    changeId: string;
    title: string;
    description: string;
    status: 'draft' | 'in-progress' | 'completed' | 'archived';
}
/**
 * Parse git branch for issue reference.
 * Patterns: feature/issue-123, bugfix/123-description, fix-123, etc.
 */
declare function parseGitBranch(workingDir: string): GitBranchInfo | null;
/**
 * Fetch GitHub issue details using gh CLI.
 */
declare function fetchGitHubIssue(issueNumber: number, workingDir: string): {
    title: string;
    body: string;
    labels: string[];
} | null;
/**
 * Load OpenSpec proposal by change ID.
 */
declare function loadOpenSpecProposal(changeId: string): OpenSpecProposal | null;
/**
 * Derive goal from all available context sources.
 * Returns the highest-confidence goal based on priority cascade.
 */
declare function deriveGoalFromContext(workingDir: string): DerivedGoal;
/**
 * Hydrate session goal stack from derived context.
 * Only adds goals if stack is empty or working directory changed.
 * Now includes pre-push validation and enrichment.
 */
declare function hydrateGoalStack(sessionId: string, workingDir: string, derived: DerivedGoal): {
    hydrated: boolean;
    message: string;
};
/**
 * SessionStart hook - auto-derive and hydrate goal on session start.
 * Now includes LLM-based self-healing prompt for goals with garbage fields.
 */
declare function goalAutoDerivationSessionStart(input: SessionStartInput): Promise<SessionStartOutput>;
/**
 * UserPromptSubmit hook - detect context changes that might affect goal.
 * Only re-derives if explicit signals detected (branch change, new issue reference).
 */
declare function goalAutoDerivationPromptSubmit(input: UserPromptSubmitInput): Promise<UserPromptSubmitOutput>;
export { goalAutoDerivationSessionStart, goalAutoDerivationPromptSubmit, deriveGoalFromContext, hydrateGoalStack, parseGitBranch, fetchGitHubIssue, loadOpenSpecProposal, type DerivedGoal, type GitBranchInfo, type OpenSpecProposal, };
export default goalAutoDerivationSessionStart;
//# sourceMappingURL=goal_auto_derivation.d.ts.map