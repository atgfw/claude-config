/**
 * Work Request Issue Bridge
 *
 * UserPromptSubmit hook that intelligently detects substantive work requests
 * and auto-creates GitHub issues. Filters out conversational prompts, questions,
 * meta-commands, and short messages to avoid garbage issue creation.
 *
 * Registered BEFORE goal-auto-derivation so the new issue exists when derivation runs.
 */

import * as path from 'node:path';
import type { UserPromptSubmitInput, UserPromptSubmitOutput } from '../types.js';
import { logTerse, logWarn } from '../utils.js';
import { registerHook } from '../runner.js';
import { createIssue, computeKeywordOverlap } from '../github/issue_crud.js';
import { loadRegistry } from '../github/task_source_sync.js';
import { getSessionId, loadGoalStack, pushGoal, createIssueGoal } from '../session/goal_stack.js';

// ============================================================================
// Configuration
// ============================================================================

/** Minimum prompt length to consider as a work request */
const MIN_PROMPT_LENGTH = 30;

/** Action verbs that indicate a work request */
const ACTION_VERBS = new Set([
  'implement',
  'fix',
  'create',
  'build',
  'add',
  'refactor',
  'migrate',
  'update',
  'remove',
  'delete',
  'move',
  'rename',
  'extract',
  'consolidate',
  'optimize',
  'improve',
  'integrate',
  'configure',
  'setup',
  'install',
  'deploy',
  'write',
  'modify',
  'change',
  'replace',
  'convert',
  'upgrade',
  'downgrade',
  'enable',
  'disable',
  'merge',
  'split',
]);

/** Patterns that indicate conversational/question prompts (skip these) */
const CONVERSATIONAL_PATTERNS = [
  /^(what|how|why|when|where|who|which|can you|could you|would you|show me|tell me|explain|describe)\b/i,
  /^(yes|no|ok|okay|sure|thanks|thank you|please|hi|hello|hey)\b/i,
  /\?$/,
];

/** Meta-commands to skip */
const META_PATTERNS = [
  /^\//,
  /^(audit|review|check|inspect|analyze|list|status|help|clear|exit|quit)\b/i,
  /^(proceed|continue|go ahead|do it|looks good|lgtm|approved?)\b/i,
];

/** Overlap threshold for duplicate detection against open issues */
const DUPLICATE_OVERLAP_THRESHOLD = 0.6;

// ============================================================================
// Detection Logic
// ============================================================================

/**
 * Detect if a prompt is a substantive work request.
 * Returns the detected verb and cleaned title, or null if not a work request.
 */
function detectWorkRequest(prompt: string): { verb: string; title: string; type: string } | null {
  const trimmed = prompt.trim();

  // Length check
  if (trimmed.length < MIN_PROMPT_LENGTH) {
    return null;
  }

  // Skip conversational prompts
  for (const pattern of CONVERSATIONAL_PATTERNS) {
    if (pattern.test(trimmed)) {
      return null;
    }
  }

  // Skip meta-commands
  for (const pattern of META_PATTERNS) {
    if (pattern.test(trimmed)) {
      return null;
    }
  }

  // Find action verb in first 50 characters
  const firstChunk = trimmed.slice(0, 50).toLowerCase();
  const words = firstChunk.split(/\s+/);

  let foundVerb: string | undefined;
  for (const word of words.slice(0, 8)) {
    const cleaned = word.replace(/[^a-z]/g, '');
    if (ACTION_VERBS.has(cleaned)) {
      foundVerb = cleaned;
      break;
    }
  }

  if (!foundVerb) {
    return null;
  }

  // Derive issue type from verb
  let issueType: string;
  if (['fix', 'repair', 'resolve', 'debug'].includes(foundVerb)) {
    issueType = 'fix';
  } else if (
    ['refactor', 'migrate', 'consolidate', 'extract', 'move', 'rename'].includes(foundVerb)
  ) {
    issueType = 'refactor';
  } else {
    issueType = 'feat';
  }

  // Use first line (or first 120 chars) as issue title
  const firstLine = trimmed.split('\n')[0] ?? trimmed;
  const title = firstLine.length > 120 ? firstLine.slice(0, 117) + '...' : firstLine;

  return { verb: foundVerb, title, type: issueType };
}

/**
 * Derive system prefix from working directory.
 */
function deriveSystemPrefix(workingDir: string): string {
  const dirName = path.basename(workingDir).toLowerCase();

  if (dirName.includes('n8n')) return 'n8n';
  if (dirName.includes('claude') || dirName === '.claude') return 'infra';
  if (dirName.includes('elevenlabs')) return 'elevenlabs';
  if (dirName.includes('servicetitan')) return 'servicetitan';
  if (dirName.includes('rewst')) return 'rewst';

  return 'general';
}

/**
 * Check for duplicate against open issues in the sync registry.
 */
function isDuplicateOfOpenIssue(title: string): boolean {
  try {
    const registry = loadRegistry();
    for (const entry of registry.entries) {
      if (entry.status !== 'open' || !entry.goal_summary) continue;
      if (computeKeywordOverlap(title, entry.goal_summary) >= DUPLICATE_OVERLAP_THRESHOLD) {
        return true;
      }
    }
  } catch {
    // Registry read failed - allow creation
  }

  return false;
}

// ============================================================================
// Hook Implementation
// ============================================================================

async function workRequestIssueBridge(
  input: UserPromptSubmitInput
): Promise<UserPromptSubmitOutput> {
  const prompt = input.prompt;
  const sessionId = input.session_id ?? getSessionId();

  // Check if session already has an issue-level goal (prevents duplicates within session)
  const stack = loadGoalStack(sessionId);
  const hasIssueGoal = stack.stack.some((g) => g.type === 'issue' || g.type === 'epic');
  if (hasIssueGoal) {
    return { hookEventName: 'UserPromptSubmit' };
  }

  // Detect work request
  const detected = detectWorkRequest(prompt);
  if (!detected) {
    return { hookEventName: 'UserPromptSubmit' };
  }

  // Check for duplicates
  const systemPrefix = deriveSystemPrefix(stack.working_directory || process.cwd());
  const fullTitle = `[${systemPrefix}] ${detected.type}: ${detected.title}`;

  if (isDuplicateOfOpenIssue(fullTitle)) {
    return { hookEventName: 'UserPromptSubmit' };
  }

  // Create the issue
  const issueNumber = createIssue({
    title: fullTitle,
    body: [
      '## Work Request',
      '',
      `**Detected verb:** ${detected.verb}`,
      `**Type:** ${detected.type}`,
      `**System:** ${systemPrefix}`,
      '',
      '### Original Request',
      '',
      prompt.length > 500 ? prompt.slice(0, 497) + '...' : prompt,
      '',
      '---',
      '_Auto-created from work request detection._',
    ].join('\n'),
    labels: [`type/${detected.type}`, 'source/auto-detection'],
    source: 'manual',
  });

  if (!issueNumber) {
    return { hookEventName: 'UserPromptSubmit' };
  }

  // Link issue to session goal stack
  try {
    const goal = createIssueGoal(issueNumber, detected.title);
    pushGoal(sessionId, goal);
    logTerse(`[+] Auto-created issue #${issueNumber} and linked to session`);
  } catch {
    logWarn(`Created issue #${issueNumber} but failed to link to session`);
  }

  return {
    hookEventName: 'UserPromptSubmit',
    additionalContext: `Auto-created GitHub issue #${issueNumber} for this work request. Track progress there.`,
  };
}

// Register hook
registerHook('work-request-issue-bridge', 'UserPromptSubmit', workRequestIssueBridge);

export { detectWorkRequest, deriveSystemPrefix, isDuplicateOfOpenIssue };
export default workRequestIssueBridge;
