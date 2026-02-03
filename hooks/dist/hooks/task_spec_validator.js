/**
 * Task Specification Validator Hook
 *
 * Enforces the Task Specification & Linting Framework v1.0.
 * Validates structural completeness, naming conventions, semantic consistency,
 * and detects anti-patterns in goal/task definitions.
 */
import { registerHook } from '../runner.js';
import { logTerse, logWarn } from '../utils.js';
// ============================================================================
// Anti-Pattern Definitions
// ============================================================================
const VAGUE_VERBS = ['handle', 'deal with', 'address', 'look at', 'work on', 'do', 'fix'];
const VAGUE_NOUNS_PATTERN = /\bthe (api|file|user|system|data|service|thing|stuff)\b/gi;
const PLACEHOLDER_PATTERNS = [
    /\bunknown\b/i,
    /\btbd\b/i,
    /\btodo\b/i,
    /\bfixme\b/i,
    /\bxxx\b/i,
    /\{[^}]*\}/g, // Template placeholders like {something}
];
const VERSION_UNSPECIFIED_TOOLS = ['python', 'node', 'npm', 'bun', 'java', 'go', 'rust'];
// ============================================================================
// Structural Completeness Validation
// ============================================================================
export function validateStructuralCompleteness(spec) {
    const issues = [];
    // Required sections
    const requiredSections = [
        { key: 'focus', name: 'Focus Declaration' },
        { key: 'who', name: 'Stakeholder Matrix' },
        { key: 'what', name: 'Outcome Specification' },
        { key: 'when', name: 'Temporal Constraints' },
        { key: 'where', name: 'Artifact Locations' },
        { key: 'why', name: 'Purpose & Value' },
        { key: 'how', name: 'Implementation Reference' },
        { key: 'which', name: 'Target Object' },
        { key: 'lest', name: 'Failure Modes' },
        { key: 'with', name: 'Resources & Dependencies' },
        { key: 'measured_by', name: 'Success Metrics' },
    ];
    for (const section of requiredSections) {
        if (!spec[section.key]) {
            issues.push({
                section: section.name,
                severity: 'error',
                message: `Missing required section: ${section.name}`,
                suggestion: `Add §${requiredSections.indexOf(section) + 1} ${section.name} to specification`,
            });
        }
    }
    return issues;
}
// ============================================================================
// Focus Declaration Validation
// ============================================================================
export function validateFocus(focus) {
    const issues = [];
    if (!focus)
        return issues;
    // Title validation
    if (!focus.title) {
        issues.push({
            section: 'Focus',
            field: 'title',
            severity: 'error',
            message: 'Missing task title',
        });
    }
    else {
        // Check length
        if (focus.title.length > 200) {
            issues.push({
                section: 'Focus',
                field: 'title',
                severity: 'warning',
                message: `Title exceeds 200 characters (${focus.title.length})`,
                suggestion: 'Condense to essential action, target, and purpose',
            });
        }
        if (focus.title.length < 50) {
            issues.push({
                section: 'Focus',
                field: 'title',
                severity: 'warning',
                message: 'Title may lack specificity (<50 chars)',
                suggestion: 'Pattern: {ACTION_VERB} {TARGET} {CONTEXT} {PURPOSE}',
            });
        }
        // Check for imperative verb
        const firstWord = focus.title.split(/\s+/)[0]?.toLowerCase() ?? '';
        if (VAGUE_VERBS.includes(firstWord)) {
            issues.push({
                section: 'Focus',
                field: 'title',
                severity: 'warning',
                message: `Title starts with vague verb: "${firstWord}"`,
                suggestion: 'Use specific verbs: implement, configure, validate, deploy, refactor',
            });
        }
        // Check for generic nouns
        const vagueMatches = focus.title.match(VAGUE_NOUNS_PATTERN);
        if (vagueMatches) {
            issues.push({
                section: 'Focus',
                field: 'title',
                severity: 'warning',
                message: `Title contains vague reference: "${vagueMatches[0]}"`,
                suggestion: 'Use verbatim names: "the OnCall Connect SMS API" not "the API"',
            });
        }
    }
    // Classification validation
    if (!focus.classification) {
        issues.push({
            section: 'Focus',
            field: 'classification',
            severity: 'warning',
            message: 'Missing task classification',
        });
    }
    return issues;
}
// ============================================================================
// What Section Validation
// ============================================================================
export function validateWhat(what) {
    const issues = [];
    if (!what)
        return issues;
    // Desired state
    if (!what.desired_state) {
        issues.push({
            section: 'What',
            field: 'desired_state',
            severity: 'error',
            message: 'Missing desired end state description',
        });
    }
    else {
        // Check for present tense (basic heuristic)
        if (what.desired_state.includes('will ') || what.desired_state.includes('should ')) {
            issues.push({
                section: 'What',
                field: 'desired_state',
                severity: 'info',
                message: 'Desired state should use present tense',
                suggestion: 'Describe as if observing completed state: "The system handles..." not "will handle"',
            });
        }
    }
    // Acceptance criteria
    if (!what.acceptance_criteria || what.acceptance_criteria.length === 0) {
        issues.push({
            section: 'What',
            field: 'acceptance_criteria',
            severity: 'error',
            message: 'At least 1 acceptance criterion required',
        });
    }
    // Out of scope
    if (!what.out_of_scope || what.out_of_scope.length < 2) {
        issues.push({
            section: 'What',
            field: 'out_of_scope',
            severity: 'warning',
            message: 'At least 2 explicit out-of-scope items required',
            suggestion: 'Define boundaries to prevent scope creep',
        });
    }
    return issues;
}
// ============================================================================
// Which Section Validation
// ============================================================================
export function validateWhich(which) {
    const issues = [];
    if (!which)
        return issues;
    if (!which.primary_target) {
        issues.push({
            section: 'Which',
            field: 'primary_target',
            severity: 'error',
            message: 'Missing primary target object specification',
        });
    }
    else {
        const target = which.primary_target;
        if (!target.object_title) {
            issues.push({
                section: 'Which',
                field: 'primary_target.object_title',
                severity: 'error',
                message: 'Target object must have verbatim exact name',
            });
        }
        if (!target.full_path) {
            issues.push({
                section: 'Which',
                field: 'primary_target.full_path',
                severity: 'error',
                message: 'Target object must have complete unambiguous path',
            });
        }
    }
    return issues;
}
// ============================================================================
// Lest Section Validation
// ============================================================================
export function validateLest(lest) {
    const issues = [];
    if (!lest)
        return issues;
    // Critical failures
    if (!lest.critical_failures || lest.critical_failures.length === 0) {
        issues.push({
            section: 'Lest',
            field: 'critical_failures',
            severity: 'error',
            message: 'At least 1 critical failure mode must be identified',
        });
    }
    else {
        for (const failure of lest.critical_failures) {
            if (!failure.prevention) {
                issues.push({
                    section: 'Lest',
                    field: 'critical_failures.prevention',
                    severity: 'warning',
                    message: `Failure "${failure.failure.substring(0, 50)}..." lacks prevention strategy`,
                });
            }
            if (!failure.detection) {
                issues.push({
                    section: 'Lest',
                    field: 'critical_failures.detection',
                    severity: 'warning',
                    message: `Failure "${failure.failure.substring(0, 50)}..." lacks detection mechanism`,
                });
            }
        }
    }
    // Negative criteria
    if (!lest.negative_criteria || lest.negative_criteria.length === 0) {
        issues.push({
            section: 'Lest',
            field: 'negative_criteria',
            severity: 'warning',
            message: 'No negative acceptance criteria (MUST NOT) defined',
            suggestion: 'Add explicit forbidden outcomes with consequences',
        });
    }
    return issues;
}
// ============================================================================
// With Section Validation
// ============================================================================
export function validateWith(withSection) {
    const issues = [];
    if (!withSection)
        return issues;
    // Tools
    if (!withSection.tools || withSection.tools.length === 0) {
        issues.push({
            section: 'With',
            field: 'tools',
            severity: 'warning',
            message: 'No required tools listed',
        });
    }
    else {
        for (const tool of withSection.tools) {
            // Check for version
            const toolLower = tool.tool_name.toLowerCase();
            if (VERSION_UNSPECIFIED_TOOLS.some((t) => toolLower.includes(t)) && !tool.version) {
                issues.push({
                    section: 'With',
                    field: 'tools.version',
                    severity: 'warning',
                    message: `Tool "${tool.tool_name}" should specify version constraint`,
                    suggestion: 'Specify version: "Python 3.11+" not "Python"',
                });
            }
        }
    }
    // External dependencies need fallbacks
    if (withSection.external_dependencies) {
        for (const dep of withSection.external_dependencies) {
            if (!dep.fallback) {
                issues.push({
                    section: 'With',
                    field: 'external_dependencies.fallback',
                    severity: 'warning',
                    message: `External dependency "${dep.service}" lacks fallback behavior`,
                    suggestion: 'Define behavior when unavailable: fail-closed, degrade, retry',
                });
            }
        }
    }
    return issues;
}
// ============================================================================
// Measured By Section Validation
// ============================================================================
export function validateMeasuredBy(measuredBy) {
    const issues = [];
    if (!measuredBy)
        return issues;
    // Success metrics
    if (!measuredBy.success_metrics || measuredBy.success_metrics.length === 0) {
        issues.push({
            section: 'Measured By',
            field: 'success_metrics',
            severity: 'error',
            message: 'At least 1 success metric required',
        });
    }
    else {
        for (const metric of measuredBy.success_metrics) {
            if (!metric.measurement_location) {
                issues.push({
                    section: 'Measured By',
                    field: 'success_metrics.measurement_location',
                    severity: 'warning',
                    message: `Metric "${metric.metric}" lacks measurement location`,
                    suggestion: 'Specify where/how to measure: "Datadog dashboard X, query Y"',
                });
            }
            if (!metric.target_value) {
                issues.push({
                    section: 'Measured By',
                    field: 'success_metrics.target_value',
                    severity: 'warning',
                    message: `Metric "${metric.metric}" lacks target value`,
                });
            }
        }
    }
    return issues;
}
// ============================================================================
// Anti-Pattern Detection
// ============================================================================
export function detectAntiPatterns(spec) {
    const issues = [];
    // Check all text fields for placeholders
    const allText = JSON.stringify(spec);
    for (const pattern of PLACEHOLDER_PATTERNS) {
        const matches = allText.match(pattern);
        if (matches && matches.length > 0) {
            issues.push({
                section: 'General',
                severity: 'warning',
                message: `Placeholder detected: "${matches[0]}"`,
                suggestion: 'Replace placeholders with actual values',
            });
            break; // Only report first placeholder
        }
    }
    // Orphan task check
    if (spec.focus && !spec.why?.epic_reference && !spec.where?.parent_issue) {
        issues.push({
            section: 'Traceability',
            severity: 'info',
            message: 'Task has no parent context (epic or parent issue)',
            suggestion: 'Link to parent context for traceability',
        });
    }
    return issues;
}
// ============================================================================
// Complete Validation
// ============================================================================
export function validateTaskSpec(spec) {
    const issues = [
        ...validateStructuralCompleteness(spec),
        ...validateFocus(spec.focus),
        ...validateWhat(spec.what),
        ...validateWhich(spec.which),
        ...validateLest(spec.lest),
        ...validateWith(spec.with),
        ...validateMeasuredBy(spec.measured_by),
        ...detectAntiPatterns(spec),
    ];
    // Calculate completeness score
    const requiredSections = 11;
    const presentSections = [
        spec.focus,
        spec.who,
        spec.what,
        spec.when,
        spec.where,
        spec.why,
        spec.how,
        spec.which,
        spec.lest,
        spec.with,
        spec.measured_by,
    ].filter(Boolean).length;
    const sectionScore = (presentSections / requiredSections) * 50;
    // Quality score based on issues
    const errorCount = issues.filter((i) => i.severity === 'error').length;
    const warningCount = issues.filter((i) => i.severity === 'warning').length;
    const qualityScore = Math.max(0, 50 - errorCount * 10 - warningCount * 2);
    const completeness_score = Math.round(sectionScore + qualityScore);
    return {
        valid: errorCount === 0,
        issues,
        completeness_score,
    };
}
// ============================================================================
// Minimal Spec Validation (for quick injection)
// ============================================================================
export function validateMinimalSpec(spec) {
    const issues = [];
    if (!spec.focus?.title) {
        issues.push({
            section: 'Focus',
            severity: 'error',
            message: 'Missing task title',
        });
    }
    if (!spec.target?.path) {
        issues.push({
            section: 'Target',
            severity: 'error',
            message: 'Missing target path',
        });
    }
    if (!spec.desired_state) {
        issues.push({
            section: 'Desired State',
            severity: 'error',
            message: 'Missing desired state',
        });
    }
    if (!spec.acceptance || spec.acceptance.length === 0) {
        issues.push({
            section: 'Acceptance',
            severity: 'error',
            message: 'At least 1 acceptance criterion required',
        });
    }
    if (!spec.lest || spec.lest.length === 0) {
        issues.push({
            section: 'Lest',
            severity: 'warning',
            message: 'No failure modes (MUST NOT) defined',
        });
    }
    if (!spec.measured_by?.primary_metric) {
        issues.push({
            section: 'Measured By',
            severity: 'warning',
            message: 'No success metric defined',
        });
    }
    const errorCount = issues.filter((i) => i.severity === 'error').length;
    return {
        valid: errorCount === 0,
        issues,
        completeness_score: errorCount === 0 ? 100 : Math.max(0, 100 - errorCount * 20),
    };
}
// ============================================================================
// Format Validation Issues for Output
// ============================================================================
export function formatValidationIssues(result) {
    if (result.valid && result.issues.length === 0) {
        return `[+] Task spec valid (completeness: ${result.completeness_score}%)`;
    }
    const errors = result.issues.filter((i) => i.severity === 'error');
    const warnings = result.issues.filter((i) => i.severity === 'warning');
    const lines = [];
    if (!result.valid) {
        lines.push(`[X] Task spec invalid (completeness: ${result.completeness_score}%)`);
    }
    else {
        lines.push(`[!] Task spec has warnings (completeness: ${result.completeness_score}%)`);
    }
    if (errors.length > 0) {
        lines.push(`Errors (${errors.length}):`);
        for (const err of errors.slice(0, 3)) {
            lines.push(`  - ${err.section}: ${err.message}`);
        }
    }
    if (warnings.length > 0) {
        lines.push(`Warnings (${warnings.length}):`);
        for (const warn of warnings.slice(0, 3)) {
            lines.push(`  - ${warn.section}: ${warn.message}`);
        }
    }
    return lines.join('\n');
}
// ============================================================================
// Hook Implementation
// ============================================================================
/**
 * PreToolUse hook that validates task specifications before goal-related operations.
 */
async function taskSpecValidatorHook(input) {
    // Only validate for TaskCreate operations that include spec data
    if (input.tool_name !== 'TaskCreate') {
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
            },
        };
    }
    const toolInput = input.tool_input;
    // Check if there's metadata with a spec
    const metadata = toolInput.metadata;
    const spec = metadata?.task_spec;
    if (!spec) {
        // No spec provided - allow but warn
        logWarn('TaskCreate without task_spec metadata - consider adding full specification');
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'allow',
                permissionDecisionReason: 'No task spec provided - validation skipped',
            },
        };
    }
    // Validate the spec
    const result = validateTaskSpec(spec);
    const output = formatValidationIssues(result);
    if (!result.valid) {
        logTerse(output);
        return {
            hookSpecificOutput: {
                hookEventName: 'PreToolUse',
                permissionDecision: 'deny',
                permissionDecisionReason: `Task specification invalid:\n${output}`,
            },
        };
    }
    logTerse(output);
    return {
        hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'allow',
            permissionDecisionReason: output,
        },
    };
}
// Register the hook
registerHook('task-spec-validator', 'PreToolUse', taskSpecValidatorHook);
export { taskSpecValidatorHook };
export default taskSpecValidatorHook;
//# sourceMappingURL=task_spec_validator.js.map