/**
 * Goal Compliance Gate Hook
 *
 * Stop hook that validates the active goal against Task Specification v1.0 schema.
 * Blocks session stop if goal is non-compliant with required sections.
 *
 * Required sections for compliance:
 * - Focus (title with action verb)
 * - Which (target object with path)
 * - Lest (at least 1 failure mode)
 * - With (tools/dependencies listed)
 * - Measured By (at least 1 success metric)
 */

import type { StopInput, StopOutput } from '../types.js';
import { registerHook } from '../runner.js';
import { logTerse } from '../utils.js';
import { getSessionId, loadGoalStack, type GoalLevel } from '../session/goal_stack.js';

// ============================================================================
// Compliance Check Types
// ============================================================================

export interface ComplianceCheck {
  section: string;
  required: boolean;
  present: boolean;
  message?: string;
}

export interface ComplianceResult {
  compliant: boolean;
  score: number; // 0-100
  checks: ComplianceCheck[];
  missing_required: string[];
}

// ============================================================================
// Goal Field Analysis
// ============================================================================

/**
 * Check if a goal field has meaningful content (not placeholder).
 */
function hasContent(value: string | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim().toLowerCase();

  // Check for placeholder values
  const placeholders = ['unknown', 'tbd', 'todo', 'fixme', 'n/a', 'none', ''];
  if (placeholders.includes(trimmed)) return false;

  // Check minimum length
  if (trimmed.length < 10) return false;

  return true;
}

/**
 * Check if title is a meaningful action-oriented title.
 * - Must be at least 50 characters
 * - Must start with a capital letter (imperative form)
 * - Must not start with vague words
 */
function hasActionTitle(summary: string): boolean {
  if (!summary) return false;
  if (summary.length < 50) return false;

  // Must start with capital (imperative form)
  if (!/^[A-Z]/.test(summary)) return false;

  // Must not start with vague words
  const vagueStarters = [
    'the',
    'a',
    'an',
    'this',
    'that',
    'some',
    'any',
    'work',
    'stuff',
    'things',
    'handle',
    'deal',
  ];
  const firstWord = summary.split(/\s+/)[0]?.toLowerCase() ?? '';
  if (vagueStarters.includes(firstWord)) return false;

  return true;
}

/**
 * Check if goal has target object specification (§8 WHICH).
 * Requires explicit `which` field with path-like content.
 */
function hasTargetObject(fields: GoalLevel['fields']): boolean {
  // Check explicit WHICH field first (Task Specification v1.0)
  const which = fields.which?.toLowerCase() ?? '';
  const where = fields.where?.toLowerCase() ?? '';
  const combined = `${which} ${where}`;

  // Check for path-like patterns (supports both Unix and Windows paths)
  const pathPatterns = [
    /\.(ts|js|json|md|yaml|yml|py)/, // File extensions
    /\/[a-z_-]+\//i, // Unix path segments
    /\\[a-z_-]+\\/i, // Windows path segments (backslashes)
    /[a-z]:\\/i, // Windows drive letter (C:\, D:\, etc.)
    /https?:\/\//, // URLs
    /github\.com/, // GitHub references
    /#\d+/, // Issue references
  ];

  return pathPatterns.some((pattern) => pattern.test(combined));
}

/**
 * Check if goal has failure modes defined (§9 LEST).
 * Requires explicit `lest` field with constraint content.
 */
function hasFailureModes(fields: GoalLevel['fields']): boolean {
  // Check explicit LEST field first (Task Specification v1.0)
  const lest = fields.lest?.toLowerCase() ?? '';
  const allContent = Object.values(fields).join(' ').toLowerCase();

  // Lest field must have meaningful content (not default placeholder)
  if (lest.includes('failure modes not defined') || lest.length < 20) {
    // Fall back to checking all fields
    const failureModeKeywords = [
      'must not',
      'should not',
      'cannot',
      'prevent',
      'avoid',
      'lest',
      'failure',
      'risk',
      'blocked',
      'never',
    ];
    return failureModeKeywords.some((keyword) => allContent.includes(keyword));
  }

  return true;
}

/**
 * Check if goal has dependencies/tools defined (§10 WITH).
 * Requires explicit `with` field with tool/dependency content.
 */
function hasDependencies(fields: GoalLevel['fields']): boolean {
  // Check explicit WITH field first (Task Specification v1.0)
  const withField = fields.with?.toLowerCase() ?? '';
  const how = fields.how?.toLowerCase() ?? '';
  const combined = `${withField} ${how}`;

  const toolKeywords = [
    'bun',
    'typescript',
    'vitest',
    'hook',
    'api',
    'mcp',
    'workflow',
    'script',
    'cli',
    'command',
    'tool',
    'python',
    'node',
    'npm',
    'dependency',
    'require',
    'access',
    'credential',
  ];

  return toolKeywords.some((keyword) => combined.includes(keyword));
}

/**
 * Check if goal has success metrics defined (§11 MEASURED BY).
 * Requires explicit `measuredBy` field with metric content.
 */
function hasSuccessMetrics(fields: GoalLevel['fields']): boolean {
  // Check explicit MEASURED BY field first (Task Specification v1.0)
  const measuredBy = fields.measuredBy?.toLowerCase() ?? '';
  const allContent = Object.values(fields).join(' ').toLowerCase();

  // MeasuredBy field must have meaningful content (not default placeholder)
  if (measuredBy.includes('success metrics not defined') || measuredBy.length < 20) {
    // Fall back to checking all fields
    const metricKeywords = [
      'test',
      'passing',
      'coverage',
      'metric',
      'measure',
      'success',
      'complete',
      'validated',
      'verified',
      '%',
      'latency',
      'error rate',
      'threshold',
    ];
    return metricKeywords.some((keyword) => allContent.includes(keyword));
  }

  return true;
}

// ============================================================================
// Compliance Validation
// ============================================================================

/**
 * Validate a goal against the Task Specification v1.0 schema.
 */
export function validateGoalCompliance(goal: GoalLevel): ComplianceResult {
  const checks: ComplianceCheck[] = [];

  // §1 Focus Declaration - action-oriented title
  const hasFocus = hasActionTitle(goal.summary);
  checks.push({
    section: 'Focus',
    required: true,
    present: hasFocus,
    message: hasFocus
      ? undefined
      : 'Title should start with imperative verb (Implement, Create, Fix, etc.)',
  });

  // §2 Who - stakeholder defined
  const hasWho = hasContent(goal.fields.who);
  checks.push({
    section: 'Who',
    required: false,
    present: hasWho,
    message: hasWho ? undefined : 'Stakeholder/executor not clearly defined',
  });

  // §3 What - outcome defined
  const hasWhat = hasContent(goal.fields.what);
  checks.push({
    section: 'What',
    required: true,
    present: hasWhat,
    message: hasWhat ? undefined : 'Desired outcome not clearly defined',
  });

  // §4 When - timing defined
  const hasWhen = hasContent(goal.fields.when);
  checks.push({
    section: 'When',
    required: false,
    present: hasWhen,
    message: hasWhen ? undefined : 'Timing/trigger not defined',
  });

  // §5 Where - locations defined
  const hasWhere = hasContent(goal.fields.where);
  checks.push({
    section: 'Where',
    required: false,
    present: hasWhere,
    message: hasWhere ? undefined : 'Artifact locations not defined',
  });

  // §6 Why - purpose defined
  const hasWhy = hasContent(goal.fields.why);
  checks.push({
    section: 'Why',
    required: false,
    present: hasWhy,
    message: hasWhy ? undefined : 'Purpose/value not defined',
  });

  // §7 How - approach defined
  const hasHow = hasContent(goal.fields.how);
  checks.push({
    section: 'How',
    required: false,
    present: hasHow,
    message: hasHow ? undefined : 'Implementation approach not defined',
  });

  // §8 Which - target object with path
  const hasWhich = hasTargetObject(goal.fields);
  checks.push({
    section: 'Which',
    required: true,
    present: hasWhich,
    message: hasWhich
      ? undefined
      : 'Target object path not specified (WHERE should contain file paths or URLs)',
  });

  // §9 Lest - failure modes
  const hasLest = hasFailureModes(goal.fields);
  checks.push({
    section: 'Lest',
    required: true,
    present: hasLest,
    message: hasLest ? undefined : 'No failure modes defined (add "must not" constraints)',
  });

  // §10 With - dependencies
  const hasWith = hasDependencies(goal.fields);
  checks.push({
    section: 'With',
    required: true,
    present: hasWith,
    message: hasWith ? undefined : 'No tools/dependencies defined in HOW',
  });

  // §11 Measured By - success metrics
  const hasMeasuredBy = hasSuccessMetrics(goal.fields);
  checks.push({
    section: 'MeasuredBy',
    required: true,
    present: hasMeasuredBy,
    message: hasMeasuredBy ? undefined : 'No success metrics defined',
  });

  // Calculate results
  const requiredChecks = checks.filter((c) => c.required);
  const allPassing = checks.filter((c) => c.present);

  const missing_required = requiredChecks.filter((c) => !c.present).map((c) => c.section);

  const score = Math.round((allPassing.length / checks.length) * 100);

  return {
    compliant: missing_required.length === 0,
    score,
    checks,
    missing_required,
  };
}

/**
 * Format compliance result for output.
 */
export function formatComplianceResult(result: ComplianceResult): string {
  if (result.compliant) {
    return `[+] Goal compliant (${result.score}%)`;
  }

  const lines: string[] = [
    `[X] Goal non-compliant (${result.score}%)`,
    `Missing required sections: ${result.missing_required.join(', ')}`,
  ];

  // Add suggestions for missing sections
  for (const check of result.checks) {
    if (check.required && !check.present && check.message) {
      lines.push(`  - ${check.section}: ${check.message}`);
    }
  }

  return lines.join('\n');
}

// ============================================================================
// Stale Goal Detection
// ============================================================================

/**
 * Check if a goal has mostly placeholder fields (stale auto-derived goal).
 * These should be skipped for compliance validation.
 */
function isStaleGoal(goal: GoalLevel): boolean {
  const placeholderPatterns = [
    'not specified',
    'not defined',
    'not enumerated',
    'Target object',
    'Failure modes',
    'Dependencies',
    'Success metrics',
    'Following implementation plan',
    'Task in progress',
  ];

  const fields = goal.fields;
  let placeholderCount = 0;
  const fieldValues = [
    fields.which,
    fields.lest,
    fields.with,
    fields.measuredBy,
    fields.how,
    fields.why,
  ];

  for (const value of fieldValues) {
    if (placeholderPatterns.some((p) => value.includes(p))) {
      placeholderCount++;
    }
  }

  // If 4+ of 6 key fields are placeholders, goal is stale
  return placeholderCount >= 4;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Stop hook that validates goal compliance before allowing session end.
 */
async function goalComplianceGateHook(input: StopInput): Promise<StopOutput> {
  const sessionId = input.session_id ?? getSessionId();
  const stack = loadGoalStack(sessionId);

  // If no goals, allow stop (nothing to validate)
  if (stack.stack.length === 0) {
    return {
      decision: 'approve',
      reason: 'No active goal - session can end',
    };
  }

  // Find the epic/issue level goal (bottom of stack, highest level)
  // Stack order: [0] = current focus (task), [last] = epic
  const epicGoal = stack.stack.find((g) => g.type === 'epic' || g.type === 'issue');

  if (!epicGoal) {
    // No epic/issue level goal - check if there's any goal at all
    const currentGoal = stack.stack[0];
    if (!currentGoal) {
      return {
        decision: 'approve',
        reason: 'No current goal focus',
      };
    }

    // Only task-level goals exist - skip compliance (ephemeral)
    if (currentGoal.type === 'task' || currentGoal.type === 'subtask') {
      return {
        decision: 'approve',
        reason: 'Only task-level goals - compliance check skipped (define an epic/issue goal)',
      };
    }
  }

  // Validate the epic/issue goal (the main objective)
  const goalToValidate = epicGoal ?? stack.stack[0];
  if (!goalToValidate) {
    return {
      decision: 'approve',
      reason: 'No goal to validate',
    };
  }

  // Skip validation for stale auto-derived goals with placeholder fields
  if (isStaleGoal(goalToValidate)) {
    logTerse('[!] Stale goal detected - skipping compliance (mostly placeholder fields)');
    return {
      decision: 'approve',
      reason:
        'Stale goal with placeholder fields - compliance skipped. Define a proper goal for validation.',
    };
  }

  // Validate the goal
  const result = validateGoalCompliance(goalToValidate);
  const output = formatComplianceResult(result);

  logTerse(output);

  if (!result.compliant) {
    return {
      decision: 'block',
      reason: output,
    };
  }

  return {
    decision: 'approve',
    reason: output,
  };
}

// Register the hook
registerHook('goal-compliance-gate', 'Stop', goalComplianceGateHook);

export { goalComplianceGateHook };
export default goalComplianceGateHook;
