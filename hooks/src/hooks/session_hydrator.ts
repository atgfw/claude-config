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

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { SessionStartInput, SessionStartOutput } from '../types.js';
import { registerHook } from '../runner.js';
import { getClaudeDir, logTerse, logWarn } from '../utils.js';
import { loadGoal, type LinkedArtifacts } from './goal_injector.js';
import { reconcileArtifact } from '../sync/checklist_reconciler.js';

/**
 * Resolve a plan file path to absolute.
 * Supports: absolute paths, ~/ prefix, relative to ~/.claude
 */
function resolvePlanPath(planPath: string): string {
  if (path.isAbsolute(planPath)) {
    return planPath;
  }
  if (planPath.startsWith('~/')) {
    return path.join(process.env['HOME'] ?? process.env['USERPROFILE'] ?? '', planPath.slice(2));
  }
  // Relative to ~/.claude
  return path.join(getClaudeDir(), planPath);
}

/**
 * Hydrate checklist state from an OpenSpec change.
 */
async function hydrateOpenSpec(changeId: string): Promise<boolean> {
  const tasksPath = path.join(getClaudeDir(), 'openspec', 'changes', changeId, 'tasks.md');

  if (!fs.existsSync(tasksPath)) {
    logWarn(`OpenSpec tasks not found: ${changeId}`);
    return false;
  }

  try {
    const content = fs.readFileSync(tasksPath, 'utf-8');
    reconcileArtifact('openspec', changeId, content);
    logTerse(`[+] Hydrated openspec: ${changeId}`);
    return true;
  } catch (error) {
    logWarn(`Failed to hydrate openspec ${changeId}: ${error}`);
    return false;
  }
}

/**
 * Hydrate checklist state from a plan file.
 */
async function hydratePlanFile(planPath: string): Promise<boolean> {
  const resolvedPath = resolvePlanPath(planPath);

  if (!fs.existsSync(resolvedPath)) {
    logWarn(`Plan file not found: ${planPath}`);
    return false;
  }

  try {
    const content = fs.readFileSync(resolvedPath, 'utf-8');
    reconcileArtifact('plan', resolvedPath, content);
    logTerse(`[+] Hydrated plan: ${path.basename(planPath)}`);
    return true;
  } catch (error) {
    logWarn(`Failed to hydrate plan ${planPath}: ${error}`);
    return false;
  }
}

/**
 * Hydrate checklist state from a GitHub issue.
 * Uses gh CLI to fetch issue body.
 */
async function hydrateGitHubIssue(issueNumber: number): Promise<boolean> {
  try {
    const { execSync } = await import('node:child_process');
    const issueJson = execSync(`gh issue view ${issueNumber} --json body`, {
      encoding: 'utf-8',
      timeout: 15_000,
    });
    const { body } = JSON.parse(issueJson) as { body: string };

    if (body) {
      reconcileArtifact('github_issue', String(issueNumber), body);
      logTerse(`[+] Hydrated github#${issueNumber}`);
      return true;
    }
    return false;
  } catch (error) {
    logWarn(`Failed to hydrate github#${issueNumber}: ${error}`);
    return false;
  }
}

/**
 * Hydrate all linked artifacts from the active goal.
 */
async function hydrateLinkedArtifacts(linked: LinkedArtifacts): Promise<{
  hydrated: string[];
  failed: string[];
}> {
  const hydrated: string[] = [];
  const failed: string[] = [];

  // Hydrate OpenSpec
  if (linked.openspec) {
    if (await hydrateOpenSpec(linked.openspec)) {
      hydrated.push(`openspec:${linked.openspec}`);
    } else {
      failed.push(`openspec:${linked.openspec}`);
    }
  }

  // Hydrate plan files
  if (linked.plan_files) {
    for (const planPath of linked.plan_files) {
      if (await hydratePlanFile(planPath)) {
        hydrated.push(`plan:${path.basename(planPath)}`);
      } else {
        failed.push(`plan:${planPath}`);
      }
    }
  }

  // Hydrate GitHub issues
  if (linked.github_issues) {
    for (const issueNum of linked.github_issues) {
      if (await hydrateGitHubIssue(issueNum)) {
        hydrated.push(`github#${issueNum}`);
      } else {
        failed.push(`github#${issueNum}`);
      }
    }
  }

  return { hydrated, failed };
}

/**
 * SessionStart hook - auto-hydrate checklist state from linked artifacts.
 */
async function sessionHydrator(_input: SessionStartInput): Promise<SessionStartOutput> {
  const goal = loadGoal();

  // No linked artifacts - nothing to hydrate
  if (!goal.linkedArtifacts) {
    return { hookEventName: 'SessionStart' };
  }

  const linked = goal.linkedArtifacts;
  const hasLinks =
    linked.openspec ||
    (linked.plan_files && linked.plan_files.length > 0) ||
    (linked.github_issues && linked.github_issues.length > 0);

  if (!hasLinks) {
    return { hookEventName: 'SessionStart' };
  }

  // Hydrate all linked artifacts
  const { hydrated, failed } = await hydrateLinkedArtifacts(linked);

  // Build context message
  const messages: string[] = [];

  if (hydrated.length > 0) {
    messages.push(`Hydrated: ${hydrated.join(', ')}`);
  }

  if (failed.length > 0) {
    messages.push(`Failed to hydrate: ${failed.join(', ')}`);
  }

  if (messages.length > 0) {
    return {
      hookEventName: 'SessionStart',
      additionalContext: `[Session Hydration] ${messages.join('. ')}`,
    };
  }

  return { hookEventName: 'SessionStart' };
}

registerHook('session-hydrator', 'SessionStart', sessionHydrator);

export {
  sessionHydrator,
  hydrateLinkedArtifacts,
  hydrateOpenSpec,
  hydratePlanFile,
  hydrateGitHubIssue,
};
