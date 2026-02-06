/**
 * GitHub Issue CRUD Utilities
 * Handles automatic issue creation/closing via gh CLI.
 * This is a utility module -- hooks call these functions.
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { logTerse, logWarn, getClaudeDir } from '../utils.js';
import { getLabelsForTitle, getLabelsForSource } from './label_taxonomy.js';
import { detectImplementedFile } from './issue_file_detector.js';
import { getActiveGoalContext } from '../hooks/goal_injector.js';

// ============================================================================
// Constants
// ============================================================================

const STOPWORDS = new Set([
  'a',
  'an',
  'the',
  'and',
  'or',
  'but',
  'in',
  'on',
  'at',
  'to',
  'for',
  'of',
  'with',
  'by',
  'from',
  'is',
  'it',
  'as',
  'be',
  'was',
  'are',
  'this',
  'that',
  'not',
  'no',
  'do',
  'if',
  'so',
  'up',
]);

const DUPLICATE_THRESHOLD = 0.8;

// ============================================================================
// Types
// ============================================================================

export interface CreateIssueOpts {
  title: string;
  body: string;
  labels?: string[];
  source?: 'correction-ledger' | 'escalation' | 'openspec' | 'manual';
}

export interface CorrectionEntry {
  description: string;
  system?: string;
  id?: string;
}

export interface EscalationEntry {
  description: string;
  category?: string;
  severity: string;
  id?: string;
}

// ============================================================================
// Keyword Overlap
// ============================================================================

/**
 * Tokenize a string into lowercase alphanumeric tokens, filtering stopwords
 */
function tokenize(text: string): Set<string> {
  const tokens = text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((t) => t.length > 0 && !STOPWORDS.has(t));
  return new Set(tokens);
}

/**
 * Compute keyword overlap between two strings.
 * Returns intersection.size / union.size (Jaccard similarity).
 */
export function computeKeywordOverlap(a: string, b: string): number {
  const tokensA = tokenize(a);
  const tokensB = tokenize(b);

  if (tokensA.size === 0 && tokensB.size === 0) return 1;
  if (tokensA.size === 0 || tokensB.size === 0) return 0;

  let intersectionSize = 0;
  for (const token of tokensA) {
    if (tokensB.has(token)) intersectionSize++;
  }

  const unionSize = new Set([...tokensA, ...tokensB]).size;
  return unionSize === 0 ? 0 : intersectionSize / unionSize;
}

// ============================================================================
// Core CRUD
// ============================================================================

/**
 * Create a GitHub issue with duplicate detection.
 * Returns the created issue number, or null if duplicate/failure.
 */
export function createIssue(opts: CreateIssueOpts): number | null {
  const { title, source } = opts;
  let { body } = opts;

  // Guard: minimum title length (prevents garbage test issues)
  const titleWithoutPrefix = title.replace(/^\[[\w-]+\]\s*\w+:\s*/, '').trim();
  if (titleWithoutPrefix.length < 20) {
    logWarn(`Title too short (${titleWithoutPrefix.length} chars): "${title}"`);
    return null;
  }

  // Guard: reject test pattern titles
  const testPatterns = /\b(pattern (one|two|three)|status update test|test issue creation)\b/i;
  if (testPatterns.test(title)) {
    logWarn(`Rejected test pattern title: "${title}"`);
    return null;
  }

  // Inject goal section if not already present
  if (!body.includes('## Goal')) {
    const goalCtx = getActiveGoalContext();
    if (goalCtx) {
      const fieldLines = Object.entries(goalCtx.fields)
        .filter(([, v]) => v !== 'unknown')
        .map(([k, v]) => `- ${k.toUpperCase()}: ${v}`);
      const goalSection = ['## Goal', goalCtx.summary, ...fieldLines, ''].join('\n');
      body = goalSection + '\n' + body;
    }
  }

  // Pre-creation gate: check if referenced file already exists on disk
  const existingFile = detectImplementedFile(title);
  if (existingFile) {
    logWarn(`Already implemented: ${existingFile}`);
    return null;
  }

  // Duplicate detection
  try {
    const searchResult = execSync(
      `gh issue list --search "${title.replace(/"/g, '\\"')}" --state open --json number,title`,
      { encoding: 'utf-8', timeout: 15000 }
    ).trim();

    const existing: Array<{ number: number; title: string }> = JSON.parse(searchResult || '[]');

    for (const issue of existing) {
      if (computeKeywordOverlap(title, issue.title) >= DUPLICATE_THRESHOLD) {
        logWarn(`Duplicate: #${issue.number}`);
        return null;
      }
    }
  } catch {
    // Search failed -- proceed with creation anyway
  }

  // Compute labels
  const labels: string[] = [...(opts.labels ?? [])];
  labels.push(...getLabelsForTitle(title));
  if (source) {
    labels.push(...getLabelsForSource(source));
  }
  const uniqueLabels = [...new Set(labels)];

  // Create issue
  try {
    const labelArg = uniqueLabels.length > 0 ? ` --label "${uniqueLabels.join(',')}"` : '';

    const output = execSync(
      `gh issue create --title "${title.replace(/"/g, '\\"')}" --body "${body.replace(/"/g, '\\"')}"${labelArg}`,
      { encoding: 'utf-8', timeout: 15000 }
    ).trim();

    // gh issue create outputs the URL: https://github.com/owner/repo/issues/123
    const match = output.match(/\/issues\/(\d+)/);
    if (match) {
      const issueNumber = Number.parseInt(match[1] ?? '0', 10);
      logTerse(`[+] Created issue #${issueNumber}`);
      return issueNumber;
    }

    return null;
  } catch {
    logWarn('Failed to create issue');
    return null;
  }
}

/**
 * Close a GitHub issue by number.
 * Returns true on success.
 */
export function closeIssue(issueNumber: number, _reason?: string): boolean {
  try {
    execSync(`gh issue close ${issueNumber} --reason completed`, {
      encoding: 'utf-8',
      timeout: 15000,
    });
    logTerse(`[+] Closed issue #${issueNumber}`);
    return true;
  } catch {
    logWarn(`Failed to close issue #${issueNumber}`);
    return false;
  }
}

// ============================================================================
// Domain-Specific Creators
// ============================================================================

/**
 * Create an issue from a correction ledger entry.
 */
export function createFromCorrection(entry: CorrectionEntry): number | null {
  const system = entry.system ?? 'hooks';
  const title = `[${system}] fix: ${entry.description}`;

  const bodyParts = [
    '## Correction Details',
    '',
    `**System:** ${system}`,
    `**Description:** ${entry.description}`,
  ];
  if (entry.id) {
    bodyParts.push(`**Correction ID:** ${entry.id}`);
  }
  bodyParts.push('', '---', '_Auto-created from correction-ledger._');

  return createIssue({
    title,
    body: bodyParts.join('\n'),
    labels: ['source/correction-ledger', 'priority/p1-high'],
    source: 'correction-ledger',
  });
}

/**
 * Create an issue from an escalation entry.
 * Only creates for high or critical severity.
 */
export function createFromEscalation(entry: EscalationEntry): number | null {
  const severity = entry.severity.toLowerCase();
  if (severity !== 'high' && severity !== 'critical') {
    return null;
  }

  const priorityLabel = severity === 'critical' ? 'priority/p0-critical' : 'priority/p1-high';
  const category = entry.category ?? 'governance';
  const title = `[${category}] fix: ${entry.description}`;

  const bodyParts = [
    '## Escalation Details',
    '',
    `**Category:** ${category}`,
    `**Severity:** ${entry.severity}`,
    `**Description:** ${entry.description}`,
  ];
  if (entry.id) {
    bodyParts.push(`**Escalation ID:** ${entry.id}`);
  }
  bodyParts.push('', '---', '_Auto-created from escalation registry._');

  return createIssue({
    title,
    body: bodyParts.join('\n'),
    labels: ['source/escalation', priorityLabel],
    source: 'escalation',
  });
}

/**
 * Create an issue from an OpenSpec change proposal.
 */
export function createFromOpenSpec(changeId: string, summary?: string): number | null {
  let resolvedSummary = summary;

  if (!resolvedSummary) {
    try {
      const proposalPath = path.join(
        getClaudeDir(),
        'openspec',
        'changes',
        changeId,
        'proposal.md'
      );
      const content = fs.readFileSync(proposalPath, 'utf-8');
      // Use first non-empty, non-heading line as summary
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          resolvedSummary = trimmed;
          break;
        }
      }
    } catch {
      // proposal.md not found or unreadable
    }
  }

  const title = `[infra] feat: ${resolvedSummary ?? changeId}`;
  const body = [
    '## OpenSpec Proposal',
    '',
    `**Change ID:** ${changeId}`,
    resolvedSummary ? `**Summary:** ${resolvedSummary}` : '',
    '',
    '---',
    '_Auto-created from openspec proposal._',
  ]
    .filter(Boolean)
    .join('\n');

  return createIssue({
    title,
    body,
    labels: ['source/openspec', 'lifecycle/specced'],
    source: 'openspec',
  });
}
