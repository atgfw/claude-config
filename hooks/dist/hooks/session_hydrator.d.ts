/**
 * Session Hydrator Hook
 *
 * SessionStart hook that auto-hydrates checklist state from linked artifacts.
 * Reads the active goal's linkedArtifacts and reconciles each one into the registry.
 *
 * This bridges the gap between goal injection and checklist sync:
 * - Goal defines WHAT we're working on
 * - linkedArtifacts defines WHERE the tasks live
 * - This hook loads those tasks on session start
 */
import type { SessionStartInput, SessionStartOutput } from '../types.js';
import { type LinkedArtifacts } from './goal_injector.js';
/**
 * Hydrate checklist state from an OpenSpec change.
 */
declare function hydrateOpenSpec(changeId: string): Promise<boolean>;
/**
 * Hydrate checklist state from a plan file.
 */
declare function hydratePlanFile(planPath: string): Promise<boolean>;
/**
 * Hydrate checklist state from a GitHub issue.
 * Uses gh CLI to fetch issue body.
 */
declare function hydrateGitHubIssue(issueNumber: number): Promise<boolean>;
/**
 * Hydrate all linked artifacts from the active goal.
 */
declare function hydrateLinkedArtifacts(linked: LinkedArtifacts): Promise<{
    hydrated: string[];
    failed: string[];
}>;
/**
 * SessionStart hook - auto-hydrate checklist state from linked artifacts.
 * Also bootstraps the session goal stack from global active-goal.json.
 */
declare function sessionHydrator(_input: SessionStartInput): Promise<SessionStartOutput>;
export { sessionHydrator, hydrateLinkedArtifacts, hydrateOpenSpec, hydratePlanFile, hydrateGitHubIssue, };
//# sourceMappingURL=session_hydrator.d.ts.map