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
import { getClaudeDir, isPathMatch, logTerse, logWarn } from '../utils.js';
import { loadGoal, type LinkedArtifacts } from './goal_injector.js';
import { reconcileArtifact } from '../sync/checklist_reconciler.js';
import {
  getSessionId,
  loadGoalStack,
  saveGoalStack,
  type GoalLevel,
} from '../session/goal_stack.js';

/**
 * Bootstrap session goal stack from global active-goal.json.
 * Clears stale task goals and pushes the global goal as an epic/issue.
 *
 * IMPORTANT: Only bootstraps if the global goal's project matches current working directory.
 * This prevents cross-session goal bleeding.
 */
function bootstrapGoalStack(sessionId: string): string | null {
  const goal = loadGoal();

  // Load existing stack
  const stack = loadGoalStack(sessionId);

  // Clear stale task goals (tasks are ephemeral, don't persist across sessions)
  const originalLength = stack.stack.length;
  stack.stack = stack.stack.filter((g) => !g.source.claude_task_id);

  if (stack.stack.length < originalLength) {
    logTerse(`[+] Cleared ${originalLength - stack.stack.length} stale task goals`);
  }

  // If no goal in active-goal.json, nothing to bootstrap
  if (!goal.goal && !goal.summary) {
    if (stack.stack.length > 0) {
      saveGoalStack(stack);
    }
    return null;
  }

  // PROJECT SCOPE CHECK: Only bootstrap if goal's project matches current working directory
  // This prevents goals from Session A bleeding into Session B in a different project
  const currentWorkingDir = process.cwd();
  const goalProjectDir = goal.fields?.where;

  if (goalProjectDir && goalProjectDir !== 'unknown') {
    // Use isPathMatch for proper path comparison (prevents sibling directory false positives)
    // e.g., /projects/myapp should NOT match /projects/myapp2
    if (!isPathMatch(currentWorkingDir, goalProjectDir)) {
      logTerse(
        `[!] Skipping global goal - different project (goal: ${goalProjectDir}, cwd: ${currentWorkingDir})`
      );
      if (stack.stack.length > 0) {
        saveGoalStack(stack);
      }
      return null;
    }
  }

  // Check if global goal already in stack
  const globalGoalId = 'global-goal';
  const existingGlobal = stack.stack.find((g) => g.id === globalGoalId);

  // Safely extract fields with null check
  const fields = goal.fields ?? {};

  if (existingGlobal) {
    // Update if summary changed
    if (existingGlobal.summary !== (goal.summary ?? goal.goal)) {
      existingGlobal.summary = goal.summary ?? goal.goal ?? '';
      existingGlobal.fields = {
        who: fields.who ?? 'unknown',
        what: fields.what ?? 'unknown',
        when: fields.when ?? 'unknown',
        where: fields.where ?? 'unknown',
        why: fields.why ?? 'unknown',
        how: fields.how ?? 'unknown',
        which: fields.which ?? 'Target object not specified',
        lest: fields.lest ?? 'Failure modes not defined',
        with: fields.with ?? 'Dependencies not enumerated',
        measuredBy: fields.measuredBy ?? 'Success metrics not defined',
      };
      saveGoalStack(stack);
      logTerse(`[+] Updated global goal: ${existingGlobal.summary}`);
    }
    return existingGlobal.summary;
  }

  // Push global goal as epic (highest level)
  const globalGoal: GoalLevel = {
    id: globalGoalId,
    type: 'epic',
    summary: goal.summary ?? goal.goal ?? '',
    fields: {
      who: fields.who ?? 'unknown',
      what: fields.what ?? 'unknown',
      when: fields.when ?? 'unknown',
      where: fields.where ?? 'unknown',
      why: fields.why ?? 'unknown',
      how: fields.how ?? 'unknown',
      which: fields.which ?? 'Target object not specified',
      lest: fields.lest ?? 'Failure modes not defined',
      with: fields.with ?? 'Dependencies not enumerated',
      measuredBy: fields.measuredBy ?? 'Success metrics not defined',
    },
    source: { manual: true },
    pushedAt: new Date().toISOString(),
    pushedBy: 'SessionStart',
  };

  // Push to END of stack (epic is highest level, should be last)
  stack.stack.push(globalGoal);
  saveGoalStack(stack);
  logTerse(`[+] Bootstrapped goal: ${globalGoal.summary}`);

  return globalGoal.summary;
}

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
 * Also bootstraps the session goal stack from global active-goal.json.
 */
async function sessionHydrator(_input: SessionStartInput): Promise<SessionStartOutput> {
  const sessionId = getSessionId();
  const messages: string[] = [];

  // Bootstrap goal stack from global active-goal.json
  const bootstrappedGoal = bootstrapGoalStack(sessionId);
  if (bootstrappedGoal) {
    messages.push(`Goal: ${bootstrappedGoal}`);
  }

  const goal = loadGoal();

  // No linked artifacts - return with just goal bootstrap info
  if (!goal.linkedArtifacts) {
    if (messages.length > 0) {
      return {
        hookEventName: 'SessionStart',
        additionalContext: `[Session Bootstrap] ${messages.join('. ')}`,
      };
    }
    return { hookEventName: 'SessionStart' };
  }

  const linked = goal.linkedArtifacts;
  const hasLinks =
    linked.openspec ||
    (linked.plan_files && linked.plan_files.length > 0) ||
    (linked.github_issues && linked.github_issues.length > 0);

  if (!hasLinks) {
    if (messages.length > 0) {
      return {
        hookEventName: 'SessionStart',
        additionalContext: `[Session Bootstrap] ${messages.join('. ')}`,
      };
    }
    return { hookEventName: 'SessionStart' };
  }

  // Hydrate all linked artifacts
  const { hydrated, failed } = await hydrateLinkedArtifacts(linked);

  if (hydrated.length > 0) {
    messages.push(`Hydrated: ${hydrated.join(', ')}`);
  }

  if (failed.length > 0) {
    messages.push(`Failed to hydrate: ${failed.join(', ')}`);
  }

  if (messages.length > 0) {
    return {
      hookEventName: 'SessionStart',
      additionalContext: `[Session Bootstrap] ${messages.join('. ')}`,
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
