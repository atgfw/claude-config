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

import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import type {
  SessionStartInput,
  SessionStartOutput,
  UserPromptSubmitInput,
  UserPromptSubmitOutput,
} from '../types.js';
import { registerHook } from '../runner.js';
import { getClaudeDir, log } from '../utils.js';
import {
  getSessionId,
  loadGoalStack,
  saveGoalStack,
  pushGoal,
  createDefaultFields,
  extractFieldsFromDescription,
  type GoalLevel,
  type SessionGoalStack,
} from '../session/goal_stack.js';

// ============================================================================
// Types
// ============================================================================

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

interface ActiveGoalFile {
  goal: string | null;
  summary: string | null;
  fields: Record<string, string>;
  linkedArtifacts?: {
    openspec?: string;
    github_issues?: number[];
    plan_files?: string[];
  };
  updatedAt?: string;
}

// ============================================================================
// Context Source Queries
// ============================================================================

/**
 * Parse git branch for issue reference.
 * Patterns: feature/issue-123, bugfix/123-description, fix-123, etc.
 */
function parseGitBranch(workingDir: string): GitBranchInfo | null {
  try {
    const branch = execSync('git branch --show-current', {
      cwd: workingDir,
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();

    if (!branch || branch === 'main' || branch === 'master') {
      return { branch };
    }

    // Extract issue number from branch name
    // Patterns: feature/123, feature/issue-123, bugfix/123-fix-login, 123-description
    const patterns = [
      /^(?:feature|bugfix|hotfix|chore|docs|fix)\/(?:issue-)?(\d+)/i,
      /^(?:feature|bugfix|hotfix|chore|docs|fix)\/(\d+)-/i,
      /^(\d+)-/,
      /-(\d+)$/,
    ];

    for (const pattern of patterns) {
      const match = branch.match(pattern);
      if (match?.[1]) {
        const issueNumber = Number.parseInt(match[1], 10);
        const typeMatch = branch.match(/^(feature|bugfix|hotfix|chore|docs|fix)\//i);
        return {
          branch,
          issueNumber,
          issueType: (typeMatch?.[1]?.toLowerCase() as GitBranchInfo['issueType']) ?? 'feature',
        };
      }
    }

    return { branch };
  } catch {
    return null;
  }
}

/**
 * Fetch GitHub issue details using gh CLI.
 */
function fetchGitHubIssue(
  issueNumber: number,
  workingDir: string
): { title: string; body: string; labels: string[] } | null {
  try {
    const result = execSync(`gh issue view ${issueNumber} --json title,body,labels`, {
      cwd: workingDir,
      encoding: 'utf-8',
      timeout: 10000,
    });
    const data = JSON.parse(result);
    return {
      title: data.title ?? `Issue #${issueNumber}`,
      body: data.body ?? '',
      labels: (data.labels ?? []).map((l: { name: string }) => l.name),
    };
  } catch {
    return null;
  }
}

/**
 * Load active-goal.json for linked artifacts.
 */
function loadActiveGoalFile(): ActiveGoalFile | null {
  const goalPath = path.join(getClaudeDir(), 'ledger', 'active-goal.json');
  try {
    const raw = fs.readFileSync(goalPath, 'utf-8');
    return JSON.parse(raw) as ActiveGoalFile;
  } catch {
    return null;
  }
}

/**
 * Load OpenSpec proposal by change ID.
 */
function loadOpenSpecProposal(changeId: string): OpenSpecProposal | null {
  const proposalPath = path.join(getClaudeDir(), 'openspec', 'changes', changeId, 'proposal.md');

  try {
    const content = fs.readFileSync(proposalPath, 'utf-8');

    // Extract title from first # heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const title = titleMatch?.[1] ?? changeId;

    // Check for status markers
    let status: OpenSpecProposal['status'] = 'draft';
    if (content.includes('[x] Implementation complete') || content.includes('Status: completed')) {
      status = 'completed';
    } else if (content.includes('[x] Design approved') || content.includes('Status: in-progress')) {
      status = 'in-progress';
    }

    // Check if archived
    if (proposalPath.includes('/archive/')) {
      status = 'archived';
    }

    return {
      changeId,
      title,
      description: content.substring(0, 500),
      status,
    };
  } catch {
    return null;
  }
}

/**
 * Get most recent commit message for intent detection.
 */
function getRecentCommitIntent(workingDir: string): string | null {
  try {
    const message = execSync('git log -1 --format=%s', {
      cwd: workingDir,
      encoding: 'utf-8',
      timeout: 5000,
    }).trim();
    return message || null;
  } catch {
    return null;
  }
}

// ============================================================================
// Goal Derivation Logic
// ============================================================================

/**
 * Create a goal from GitHub issue data.
 */
function goalFromGitHubIssue(
  issueNumber: number,
  issue: { title: string; body: string; labels: string[] }
): GoalLevel {
  const fields = issue.body
    ? extractFieldsFromDescription(issue.body)
    : createDefaultFields(issue.title);

  // Enhance fields from issue context
  if (fields.who === 'Claude Code session') {
    fields.who = `GitHub Issue #${issueNumber} stakeholders`;
  }
  if (fields.where === process.cwd()) {
    fields.where = `GitHub Issue #${issueNumber}`;
  }

  return {
    id: `issue-${issueNumber}`,
    type: 'issue',
    summary: issue.title,
    fields,
    source: { github_issue: issueNumber },
    pushedAt: new Date().toISOString(),
    pushedBy: 'SessionStart',
  };
}

/**
 * Create a goal from OpenSpec proposal.
 */
function goalFromOpenSpec(proposal: OpenSpecProposal): GoalLevel {
  const fields = extractFieldsFromDescription(proposal.description);

  // Set defaults for OpenSpec context
  if (fields.who === 'Claude Code session') {
    fields.who = 'Spinal Cord governance system';
  }
  if (fields.where === process.cwd()) {
    fields.where = `OpenSpec: ${proposal.changeId}`;
  }

  return {
    id: `openspec-${proposal.changeId}`,
    type: 'epic',
    summary: proposal.title,
    fields,
    source: { openspec_change: proposal.changeId },
    pushedAt: new Date().toISOString(),
    pushedBy: 'SessionStart',
  };
}

/**
 * Create a goal from active-goal.json global override.
 */
function goalFromActiveGoalFile(activeGoal: ActiveGoalFile): GoalLevel {
  return {
    id: 'global-active-goal',
    type: 'epic',
    summary: activeGoal.summary ?? activeGoal.goal ?? 'Unknown goal',
    fields: {
      who: activeGoal.fields?.who ?? 'unknown',
      what: activeGoal.fields?.what ?? 'unknown',
      when: activeGoal.fields?.when ?? 'unknown',
      where: activeGoal.fields?.where ?? 'unknown',
      why: activeGoal.fields?.why ?? 'unknown',
      how: activeGoal.fields?.how ?? 'unknown',
      which: activeGoal.fields?.which ?? 'Target not specified',
      lest: activeGoal.fields?.lest ?? 'Failure modes not defined',
      with: activeGoal.fields?.with ?? 'Dependencies not enumerated',
      measuredBy: activeGoal.fields?.measuredBy ?? 'Metrics not defined',
    },
    source: { manual: true },
    pushedAt: activeGoal.updatedAt ?? new Date().toISOString(),
    pushedBy: 'SessionStart',
  };
}

/**
 * Derive goal from all available context sources.
 * Returns the highest-confidence goal based on priority cascade.
 */
function deriveGoalFromContext(workingDir: string): DerivedGoal {
  // 1. Check git branch for issue reference
  const branchInfo = parseGitBranch(workingDir);
  if (branchInfo?.issueNumber) {
    const issue = fetchGitHubIssue(branchInfo.issueNumber, workingDir);
    if (issue) {
      return {
        source: 'git-branch',
        goal: goalFromGitHubIssue(branchInfo.issueNumber, issue),
        confidence: 'high',
        reason: `Derived from git branch: ${branchInfo.branch} → Issue #${branchInfo.issueNumber}`,
      };
    }
    // Issue number found but couldn't fetch - still use it
    return {
      source: 'git-branch',
      goal: goalFromGitHubIssue(branchInfo.issueNumber, {
        title: `Issue #${branchInfo.issueNumber}`,
        body: '',
        labels: [],
      }),
      confidence: 'medium',
      reason: `Branch references issue #${branchInfo.issueNumber} (could not fetch details)`,
    };
  }

  // 2. Check active-goal.json for linked OpenSpec
  const activeGoal = loadActiveGoalFile();
  if (activeGoal?.linkedArtifacts?.openspec) {
    const proposal = loadOpenSpecProposal(activeGoal.linkedArtifacts.openspec);
    if (proposal && proposal.status !== 'completed' && proposal.status !== 'archived') {
      return {
        source: 'openspec',
        goal: goalFromOpenSpec(proposal),
        confidence: 'high',
        reason: `Linked OpenSpec proposal: ${proposal.changeId}`,
      };
    }
  }

  // 3. Check active-goal.json for linked GitHub issues
  if (activeGoal?.linkedArtifacts?.github_issues?.length) {
    const issueNumber = activeGoal.linkedArtifacts.github_issues[0];
    if (issueNumber) {
      const issue = fetchGitHubIssue(issueNumber, workingDir);
      if (issue) {
        return {
          source: 'active-goal',
          goal: goalFromGitHubIssue(issueNumber, issue),
          confidence: 'high',
          reason: `Linked GitHub issue from active-goal.json: #${issueNumber}`,
        };
      }
    }
  }

  // 4. Use active-goal.json if it has a defined goal
  if (activeGoal?.goal || activeGoal?.summary) {
    return {
      source: 'active-goal',
      goal: goalFromActiveGoalFile(activeGoal),
      confidence: 'medium',
      reason: 'Using goal from active-goal.json',
    };
  }

  // 5. Check recent commit for intent
  const commitMessage = getRecentCommitIntent(workingDir);
  if (commitMessage && !commitMessage.startsWith('chore(sync)')) {
    // Parse conventional commit
    const conventionalMatch = commitMessage.match(/^(\w+)(?:\([^)]+\))?:\s*(.+)/);
    if (conventionalMatch) {
      const [, type, description] = conventionalMatch;
      return {
        source: 'commit',
        goal: {
          id: `commit-intent-${Date.now()}`,
          type: 'task',
          summary: description ?? commitMessage,
          fields: {
            ...createDefaultFields(description ?? commitMessage),
            how: `Continue ${type} work from last commit`,
          },
          source: { manual: false },
          pushedAt: new Date().toISOString(),
          pushedBy: 'SessionStart',
        },
        confidence: 'low',
        reason: `Inferred from recent commit: ${commitMessage.substring(0, 50)}...`,
      };
    }
  }

  // 6. No goal derivable
  return {
    source: 'none',
    goal: null,
    confidence: 'low',
    reason: 'No work context found to derive goal from',
  };
}

// ============================================================================
// Stack Hydration
// ============================================================================

/**
 * Hydrate session goal stack from derived context.
 * Only adds goals if stack is empty or working directory changed.
 */
function hydrateGoalStack(
  sessionId: string,
  workingDir: string,
  derived: DerivedGoal
): { hydrated: boolean; message: string } {
  const stack = loadGoalStack(sessionId);

  // Check if stack already has goals
  if (stack.stack.length > 0) {
    const currentFocus = stack.stack[0];
    // Don't override existing goals
    return {
      hydrated: false,
      message: `Existing goal in focus: "${currentFocus?.summary}"`,
    };
  }

  // Check if working directory matches (project-scoped goals)
  if (stack.working_directory && stack.working_directory !== workingDir) {
    // Different project - clear and rehydrate
    log(`[goal-auto-derivation] Project changed: ${stack.working_directory} → ${workingDir}`);
    const newStack: SessionGoalStack = {
      session_id: sessionId,
      working_directory: workingDir,
      stack: [],
      history: stack.history, // Preserve history
      lastModified: new Date().toISOString(),
    };
    saveGoalStack(newStack);
  }

  // Hydrate with derived goal
  if (derived.goal) {
    pushGoal(sessionId, derived.goal);
    return {
      hydrated: true,
      message: `Auto-derived goal (${derived.source}): "${derived.goal.summary}"`,
    };
  }

  return {
    hydrated: false,
    message: derived.reason,
  };
}

// ============================================================================
// Hook Implementations
// ============================================================================

/**
 * SessionStart hook - auto-derive and hydrate goal on session start.
 */
async function goalAutoDerivationSessionStart(
  input: SessionStartInput
): Promise<SessionStartOutput> {
  const sessionId = getSessionId(input);
  const workingDir = input.working_directory ?? process.cwd();

  log(`[goal-auto-derivation] SessionStart: deriving goal for ${workingDir}`);

  // Derive goal from context
  const derived = deriveGoalFromContext(workingDir);

  // Hydrate stack
  const result = hydrateGoalStack(sessionId, workingDir, derived);

  if (result.hydrated) {
    log(`[goal-auto-derivation] ${result.message}`);
    return {
      hookEventName: 'SessionStart',
      additionalContext: `Goal auto-derived from ${derived.source}: "${derived.goal?.summary}"\nConfidence: ${derived.confidence}\nReason: ${derived.reason}`,
    };
  }

  if (derived.source === 'none') {
    return {
      hookEventName: 'SessionStart',
      additionalContext: `No goal auto-derived. ${derived.reason}\nConsider: working on a feature branch, linking an OpenSpec proposal, or defining active-goal.json`,
    };
  }

  return {
    hookEventName: 'SessionStart',
    additionalContext: result.message,
  };
}

/**
 * UserPromptSubmit hook - detect context changes that might affect goal.
 * Only re-derives if explicit signals detected (branch change, new issue reference).
 */
async function goalAutoDerivationPromptSubmit(
  input: UserPromptSubmitInput
): Promise<UserPromptSubmitOutput> {
  const { prompt } = input;
  const sessionId = getSessionId(input);
  const workingDir = process.cwd();

  // Check for explicit goal change signals in prompt
  const issueRefMatch = prompt.match(/(?:issue|#)(\d+)/i);
  const openspecMatch = prompt.match(/openspec[:\s]+(\S+)/i);

  if (issueRefMatch || openspecMatch) {
    const derived = deriveGoalFromContext(workingDir);

    if (derived.goal) {
      const stack = loadGoalStack(sessionId);
      const currentFocus = stack.stack[0];

      // Only update if different goal
      if (currentFocus?.id !== derived.goal.id) {
        pushGoal(sessionId, derived.goal);
        return {
          hookEventName: 'UserPromptSubmit',
          additionalContext: `Goal context updated from prompt reference: "${derived.goal.summary}"`,
        };
      }
    }
  }

  return { hookEventName: 'UserPromptSubmit' };
}

// ============================================================================
// Registration
// ============================================================================

registerHook('goal-auto-derivation-session', 'SessionStart', goalAutoDerivationSessionStart);
registerHook('goal-auto-derivation-prompt', 'UserPromptSubmit', goalAutoDerivationPromptSubmit);

export {
  goalAutoDerivationSessionStart,
  goalAutoDerivationPromptSubmit,
  deriveGoalFromContext,
  hydrateGoalStack,
  parseGitBranch,
  fetchGitHubIssue,
  loadOpenSpecProposal,
  type DerivedGoal,
  type GitBranchInfo,
  type OpenSpecProposal,
};
export default goalAutoDerivationSessionStart;
