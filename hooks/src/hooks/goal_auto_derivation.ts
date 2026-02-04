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
  type GoalLevel,
  type GoalFields,
  type SessionGoalStack,
} from '../session/goal_stack.js';

// ============================================================================
// Types
// ============================================================================

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
// Context Detection (minimal - just detect, don't parse)
// ============================================================================

/**
 * Parse git branch for issue reference.
 * Only extracts the issue number - does NOT try to parse issue content.
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
 * Fetch GitHub issue title only (for goal summary).
 * Does NOT parse the body - that's for the LLM.
 */
function fetchGitHubIssueTitle(issueNumber: number, workingDir: string): string | null {
  try {
    const result = execSync(`gh issue view ${issueNumber} --json title`, {
      cwd: workingDir,
      encoding: 'utf-8',
      timeout: 10000,
    });
    const data = JSON.parse(result);
    return data.title ?? null;
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
 * Load OpenSpec proposal title by change ID.
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
    if (proposalPath.includes('/archive/')) {
      status = 'archived';
    }

    return { changeId, title, status };
  } catch {
    return null;
  }
}

// ============================================================================
// LLM Extraction Prompts (the core of LLM-native approach)
// ============================================================================

/**
 * Generate prompt for Claude to extract goal fields from a GitHub issue.
 * This is the KEY function - Claude does the semantic extraction, not regex.
 */
function generateIssueExtractionPrompt(issueNumber: number, issueTitle: string): string {
  return `GOAL FIELD EXTRACTION REQUIRED (Issue #${issueNumber}: ${issueTitle})

You need to populate the goal fields by reading the GitHub issue. This is a ONE-TIME task.

STEPS:
1. Read the issue: \`gh issue view ${issueNumber} --json body,labels\`
2. Extract these fields semantically (understand the meaning, don't regex parse):

   **WHO:** Who benefits or is affected? (stakeholders, users, systems)
   **WHAT:** What is the desired outcome? (the goal, not the problem)
   **WHEN:** Timeline or priority? (from labels or explicit mentions)
   **WHERE:** What files/systems are affected? (paths mentioned in implementation)
   **WHY:** What problem does this solve? (from Problem section)
   **HOW:** What approach will be used? (from Solution/Implementation section)
   **WHICH:** Specific target objects? (file paths, functions, components)
   **LEST:** What must NOT happen? (constraints like "must not break X")
   **WITH:** What tools/dependencies are needed? (mentioned technologies)
   **MEASURED BY:** How do we know it's done? (acceptance criteria)

3. Update the goal file with extracted values:
   \`\`\`json
   // Write to ~/.claude/ledger/active-goal.json
   {
     "goal": "${issueTitle}",
     "summary": "${issueTitle}",
     "fields": {
       "who": "extracted value",
       "what": "extracted value",
       "when": "extracted value",
       "where": "extracted value",
       "why": "extracted value",
       "how": "extracted value",
       "which": "extracted value",
       "lest": "extracted value",
       "with": "extracted value",
       "measuredBy": "extracted value"
     },
     "linkedArtifacts": { "github_issues": [${issueNumber}] },
     "updatedAt": "ISO timestamp"
   }
   \`\`\`

IMPORTANT: Extract MEANINGFUL content, not placeholders. If a field isn't explicitly stated, infer from context.
After extraction, proceed with the user's original request.`;
}

/**
 * Generate prompt for Claude to extract goal fields from an OpenSpec proposal.
 */
function generateOpenSpecExtractionPrompt(changeId: string, title: string): string {
  return `GOAL FIELD EXTRACTION REQUIRED (OpenSpec: ${changeId})

You need to populate the goal fields by reading the OpenSpec proposal. This is a ONE-TIME task.

STEPS:
1. Read the proposal: \`~/.claude/openspec/changes/${changeId}/proposal.md\`
2. Extract these fields semantically:

   **WHO:** Who benefits from this change?
   **WHAT:** What is the desired outcome?
   **WHEN:** Timeline or priority?
   **WHERE:** What files/systems are affected?
   **WHY:** What problem does this solve?
   **HOW:** What approach will be used?
   **WHICH:** Specific target objects?
   **LEST:** What must NOT happen?
   **WITH:** What tools/dependencies are needed?
   **MEASURED BY:** How do we know it's done?

3. Update ~/.claude/ledger/active-goal.json with extracted values.

Title: ${title}
After extraction, proceed with the user's original request.`;
}

// ============================================================================
// Goal Creation (minimal - just scaffolding for LLM to fill)
// ============================================================================

/**
 * Create a minimal goal from GitHub issue.
 * Fields are placeholders - LLM will extract real values.
 */
function createMinimalIssueGoal(issueNumber: number, title: string): GoalLevel {
  return {
    id: `issue-${issueNumber}`,
    type: 'issue',
    summary: title,
    fields: createDefaultFields(title),
    source: { github_issue: issueNumber },
    pushedAt: new Date().toISOString(),
    pushedBy: 'SessionStart',
  };
}

/**
 * Create a minimal goal from OpenSpec proposal.
 */
function createMinimalOpenSpecGoal(changeId: string, title: string): GoalLevel {
  return {
    id: `openspec-${changeId}`,
    type: 'epic',
    summary: title,
    fields: createDefaultFields(title),
    source: { openspec_change: changeId },
    pushedAt: new Date().toISOString(),
    pushedBy: 'SessionStart',
  };
}

/**
 * Create a goal from active-goal.json (already has fields).
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

// ============================================================================
// Goal Derivation (detect context, decide if extraction needed)
// ============================================================================

/**
 * Check if goal fields need LLM extraction (mostly placeholders).
 */
function needsExtraction(fields: GoalFields): boolean {
  const placeholderPatterns = [
    'not specified',
    'not defined',
    'not enumerated',
    'unknown',
    'Target object',
    'Failure modes',
    'Dependencies',
    'Success metrics',
  ];

  let placeholderCount = 0;
  for (const value of Object.values(fields)) {
    const lower = value.toLowerCase();
    if (placeholderPatterns.some((p) => lower.includes(p.toLowerCase()))) {
      placeholderCount++;
    }
    // Markdown headers = garbage from failed parsing
    if (value.startsWith('##') || value.startsWith('# ')) {
      placeholderCount++;
    }
  }

  return placeholderCount >= 3;
}

/**
 * Derive goal from context sources.
 * Returns minimal goal + flag for whether LLM extraction is needed.
 */
function deriveGoalFromContext(workingDir: string): DerivedGoal {
  // 1. Check git branch for issue reference
  const branchInfo = parseGitBranch(workingDir);
  if (branchInfo?.issueNumber) {
    const title = fetchGitHubIssueTitle(branchInfo.issueNumber, workingDir);
    const goalTitle = title ?? `Issue #${branchInfo.issueNumber}`;
    const goal = createMinimalIssueGoal(branchInfo.issueNumber, goalTitle);

    return {
      source: 'git-branch',
      goal,
      confidence: 'high',
      reason: `Derived from git branch: ${branchInfo.branch} → Issue #${branchInfo.issueNumber}`,
      needsExtraction: true, // Always extract from GitHub issues
      issueNumber: branchInfo.issueNumber,
    };
  }

  // 2. Check active-goal.json for linked OpenSpec
  const activeGoal = loadActiveGoalFile();
  if (activeGoal?.linkedArtifacts?.openspec) {
    const proposal = loadOpenSpecProposal(activeGoal.linkedArtifacts.openspec);
    if (proposal && proposal.status !== 'completed' && proposal.status !== 'archived') {
      const goal = createMinimalOpenSpecGoal(proposal.changeId, proposal.title);
      return {
        source: 'openspec',
        goal,
        confidence: 'high',
        reason: `Linked OpenSpec proposal: ${proposal.changeId}`,
        needsExtraction: true,
      };
    }
  }

  // 3. Check active-goal.json for linked GitHub issues
  if (activeGoal?.linkedArtifacts?.github_issues?.length) {
    const issueNumber = activeGoal.linkedArtifacts.github_issues[0];
    if (issueNumber) {
      const title = fetchGitHubIssueTitle(issueNumber, workingDir);
      const goalTitle = title ?? `Issue #${issueNumber}`;
      const goal = createMinimalIssueGoal(issueNumber, goalTitle);

      return {
        source: 'active-goal',
        goal,
        confidence: 'high',
        reason: `Linked GitHub issue from active-goal.json: #${issueNumber}`,
        needsExtraction: needsExtraction(goal.fields),
        issueNumber,
      };
    }
  }

  // 4. Use active-goal.json if it has a defined goal
  if (activeGoal?.goal || activeGoal?.summary) {
    const goal = goalFromActiveGoalFile(activeGoal);
    return {
      source: 'active-goal',
      goal,
      confidence: 'medium',
      reason: 'Using goal from active-goal.json',
      needsExtraction: needsExtraction(goal.fields),
      issueNumber: activeGoal.linkedArtifacts?.github_issues?.[0],
    };
  }

  // 5. No goal derivable
  return {
    source: 'none',
    goal: null,
    confidence: 'low',
    reason: 'No work context found to derive goal from',
    needsExtraction: false,
  };
}

// ============================================================================
// Stack Hydration
// ============================================================================

/**
 * Hydrate session goal stack from derived context.
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
    return {
      hydrated: false,
      message: `Existing goal in focus: "${currentFocus?.summary}"`,
    };
  }

  // Check if working directory matches (project-scoped goals)
  if (stack.working_directory && stack.working_directory !== workingDir) {
    log(`[goal-auto-derivation] Project changed: ${stack.working_directory} → ${workingDir}`);
    const newStack: SessionGoalStack = {
      session_id: sessionId,
      working_directory: workingDir,
      stack: [],
      history: stack.history,
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
 * SessionStart hook - auto-derive goal and emit LLM extraction prompt if needed.
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

  // Generate LLM extraction prompt if needed
  if (derived.needsExtraction && derived.goal) {
    if (derived.source === 'git-branch' || derived.source === 'active-goal') {
      if (derived.issueNumber) {
        const prompt = generateIssueExtractionPrompt(derived.issueNumber, derived.goal.summary);
        return {
          hookEventName: 'SessionStart',
          additionalContext: prompt,
        };
      }
    } else if (derived.source === 'openspec') {
      const changeId = derived.goal.source.openspec_change;
      if (changeId) {
        const prompt = generateOpenSpecExtractionPrompt(changeId, derived.goal.summary);
        return {
          hookEventName: 'SessionStart',
          additionalContext: prompt,
        };
      }
    }
  }

  // Check existing goal for extraction needs
  if (!result.hydrated) {
    const stack = loadGoalStack(sessionId);
    const currentFocus = stack.stack[0];
    if (currentFocus && needsExtraction(currentFocus.fields)) {
      const issueNumber = currentFocus.source.github_issue;
      if (issueNumber) {
        const prompt = generateIssueExtractionPrompt(issueNumber, currentFocus.summary);
        return {
          hookEventName: 'SessionStart',
          additionalContext: prompt,
        };
      }
    }
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

        // Emit extraction prompt for new goal
        if (derived.needsExtraction && derived.issueNumber) {
          const extractPrompt = generateIssueExtractionPrompt(
            derived.issueNumber,
            derived.goal.summary
          );
          return {
            hookEventName: 'UserPromptSubmit',
            additionalContext: `Goal context updated.\n\n${extractPrompt}`,
          };
        }

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
  fetchGitHubIssueTitle,
  loadOpenSpecProposal,
  needsExtraction,
  generateIssueExtractionPrompt,
  generateOpenSpecExtractionPrompt,
  type DerivedGoal,
  type GitBranchInfo,
  type OpenSpecProposal,
};
export default goalAutoDerivationSessionStart;
