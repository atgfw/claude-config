/**
 * Code Node Linting Gate Hook
 *
 * ENFORCES JavaScript quality standards for n8n code nodes.
 * Part of the Spinal Cord - global governance for child projects.
 *
 * Rules (see hooks/docs/n8n-governance.md "Code Node Governance"):
 * - Code node JavaScript must pass standard linting rules
 * - Centralize logic in code nodes (warn on complex inline expressions)
 * - n8n-specific patterns are allowed (documented exceptions)
 * - Same quality standards as regular JavaScript files
 */

import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
import { log, logBlocked, logAllowed } from '../utils.js';
import { registerHook } from '../runner.js';

// ============================================================================
// Types
// ============================================================================

interface N8nNode {
  name: string;
  type: string;
  parameters?: {
    jsCode?: string;
    code?: string;
    [key: string]: unknown;
  };
}

interface N8nWorkflowPayload {
  name?: string;
  nodes?: N8nNode[];
}

interface LintingResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

interface LintError {
  line: number;
  column: number;
  message: string;
  rule: string;
  severity: 'error' | 'warning';
}

// ============================================================================
// n8n-Specific Allowed Patterns
// ============================================================================

/**
 * n8n globals that are allowed in code nodes
 * These would normally be flagged as undefined by linters
 * Exported for documentation and potential future use
 */
export const N8N_GLOBALS = new Set([
  '$input',
  '$json',
  '$items',
  '$item',
  '$node',
  '$workflow',
  '$execution',
  '$env',
  '$now',
  '$today',
  '$runIndex',
  '$itemIndex',
  '$parameter',
  '$position',
  '$jmespath',
  '$binary',
  'items',
  'getInputData',
  'helpers',
]);

/**
 * Patterns that are valid in n8n code nodes but might trigger linters
 * Exported for documentation and potential future use
 */
export const N8N_ALLOWED_PATTERNS = [
  /^\s*return\s+\$input\.all\(\)/, // return $input.all()
  /^\s*return\s+items/, // return items
  /\$\(['"].*['"]\)/, // $('node name')
  /\$json\./, // $json.field
  /\$items\./, // $items.field
  /\$input\./, // $input.all(), etc.
];

// ============================================================================
// Simplified Linting Rules
// ============================================================================

/**
 * Check for var keyword (should use const/let)
 */
function checkVarKeyword(code: string): LintError[] {
  const errors: LintError[] = [];
  const lines = code.split('\n');

  for (const [i, line] of lines.entries()) {
    // Match 'var' as a keyword (not in string or comment)
    if (/\bvar\s+\w+/.test(line) && !line.trim().startsWith('//')) {
      errors.push({
        line: i + 1,
        column: line.indexOf('var') + 1,
        message: 'Use const or let instead of var',
        rule: 'no-var',
        severity: 'error',
      });
    }
  }

  return errors;
}

/**
 * Check for console.log statements (should be removed in production)
 */
function checkConsoleStatements(code: string): LintError[] {
  const errors: LintError[] = [];
  const lines = code.split('\n');

  for (const [i, line] of lines.entries()) {
    if (/\bconsole\.(log|warn|error|info|debug)\b/.test(line) && !line.trim().startsWith('//')) {
      errors.push({
        line: i + 1,
        column: line.indexOf('console') + 1,
        message: 'Remove console statements in production code',
        rule: 'no-console',
        severity: 'warning',
      });
    }
  }

  return errors;
}

/**
 * Check for debugger statements
 */
function checkDebuggerStatements(code: string): LintError[] {
  const errors: LintError[] = [];
  const lines = code.split('\n');

  for (const [i, line] of lines.entries()) {
    if (/\bdebugger\b/.test(line) && !line.trim().startsWith('//')) {
      errors.push({
        line: i + 1,
        column: line.indexOf('debugger') + 1,
        message: 'Remove debugger statement',
        rule: 'no-debugger',
        severity: 'error',
      });
    }
  }

  return errors;
}

/**
 * Check for eval usage (security concern)
 */
function checkEvalUsage(code: string): LintError[] {
  const errors: LintError[] = [];
  const lines = code.split('\n');

  for (const [i, line] of lines.entries()) {
    if (/\beval\s*\(/.test(line) && !line.trim().startsWith('//')) {
      errors.push({
        line: i + 1,
        column: line.indexOf('eval') + 1,
        message: 'eval() is dangerous and should not be used',
        rule: 'no-eval',
        severity: 'error',
      });
    }
  }

  return errors;
}

/**
 * Check for empty catch blocks
 */
function checkEmptyCatch(code: string): LintError[] {
  const errors: LintError[] = [];
  // Simple pattern: catch followed by empty braces
  const emptyCatchPattern = /catch\s*\([^)]*\)\s*\{\s*\}/g;
  let match;

  while ((match = emptyCatchPattern.exec(code)) !== null) {
    const beforeMatch = code.substring(0, match.index);
    const lineNumber = (beforeMatch.match(/\n/g) || []).length + 1;

    errors.push({
      line: lineNumber,
      column: 1,
      message: "Empty catch block - handle the error or add a comment explaining why it's ignored",
      rule: 'no-empty-catch',
      severity: 'warning',
    });
  }

  return errors;
}

// Note: checkSemicolons was removed as it was unused
// n8n code works fine without semicolons

// ============================================================================
// Main Linting Function
// ============================================================================

/**
 * Lint JavaScript code from n8n code node
 */
export function lintCodeNodeContent(code: string): LintingResult {
  const result: LintingResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  if (!code || code.trim() === '') {
    return result; // Empty code is valid (might be a placeholder)
  }

  // Run all checks
  const allErrors: LintError[] = [
    ...checkVarKeyword(code),
    ...checkDebuggerStatements(code),
    ...checkEvalUsage(code),
    ...checkEmptyCatch(code),
    ...checkConsoleStatements(code),
  ];

  // Separate errors from warnings
  for (const error of allErrors) {
    const message = `Line ${error.line}: ${error.message} (${error.rule})`;
    if (error.severity === 'error') {
      result.errors.push(message);
      result.valid = false;
    } else {
      result.warnings.push(message);
    }
  }

  return result;
}

/**
 * Check for complex inline expressions in non-code nodes
 * Returns true if the expression is too complex and should be in a code node
 */
export function isComplexInlineExpression(expression: string): boolean {
  if (!expression || typeof expression !== 'string') {
    return false;
  }

  // Check if it's an n8n expression (starts with {{ or contains $)
  if (!expression.includes('{{') && !expression.includes('$')) {
    return false;
  }

  // Count operations to determine complexity
  let complexity = 0;

  // Method chains
  const methodCalls = (expression.match(/\.\w+\(/g) || []).length;
  complexity += methodCalls;

  // Array methods (filter, map, reduce, etc.)
  const arrayMethods = (expression.match(/\.(filter|map|reduce|find|some|every|forEach)\(/g) || [])
    .length;
  complexity += arrayMethods * 2; // Weight these more heavily

  // Ternary operators
  const ternaries = (expression.match(/\?[^:]+:/g) || []).length;
  complexity += ternaries;

  // Logical operators
  const logicals = (expression.match(/&&|\|\|/g) || []).length;
  complexity += logicals;

  // Arrow functions
  const arrows = (expression.match(/=>/g) || []).length;
  complexity += arrows * 2;

  return complexity > 2;
}

/**
 * Extract code from a code node
 */
export function extractCodeFromNode(node: N8nNode): string | null {
  if (node.type !== 'n8n-nodes-base.code') {
    return null;
  }

  // n8n code nodes store code in different parameter names
  return node.parameters?.jsCode ?? node.parameters?.code ?? null;
}

/**
 * Validate all code nodes in a workflow
 */
export function validateWorkflowCodeNodes(payload: N8nWorkflowPayload): LintingResult {
  const result: LintingResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  if (!payload.nodes || !Array.isArray(payload.nodes)) {
    return result;
  }

  for (const node of payload.nodes) {
    // Check code nodes
    if (node.type === 'n8n-nodes-base.code') {
      const code = extractCodeFromNode(node);
      if (code) {
        const lintResult = lintCodeNodeContent(code);

        if (!lintResult.valid) {
          result.valid = false;
        }

        result.errors.push(...lintResult.errors.map((e) => `Node "${node.name}": ${e}`));
        result.warnings.push(...lintResult.warnings.map((w) => `Node "${node.name}": ${w}`));
      }
    }

    // Check for complex inline expressions in other nodes
    if (node.parameters) {
      for (const [key, value] of Object.entries(node.parameters)) {
        if (typeof value === 'string' && isComplexInlineExpression(value)) {
          result.warnings.push(
            `Node "${node.name}": Complex expression in "${key}" - consider moving to code node for testability`
          );
        }
      }
    }
  }

  return result;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Main code node linting gate hook
 */
export async function codeNodeLintingGateHook(input: PreToolUseInput): Promise<PreToolUseOutput> {
  const toolName = input.tool_name ?? '';
  const toolInput = input.tool_input as Record<string, unknown>;

  log(`[LINT] Validating n8n code nodes: ${toolName}`);

  // Extract workflow payload
  const payload: N8nWorkflowPayload = {
    name: (toolInput['name'] as string) ?? '',
    nodes: (toolInput['nodes'] as N8nNode[]) ?? [],
  };

  // Validate code nodes
  const validation = validateWorkflowCodeNodes(payload);

  // Log results
  if (validation.errors.length > 0) {
    log('[LINT] Code quality errors:');
    validation.errors.forEach((e) => log(`  - ${e}`));
  }
  if (validation.warnings.length > 0) {
    log('[LINT] Code quality warnings:');
    validation.warnings.forEach((w) => log(`  - ${w}`));
  }

  // Block on errors
  if (!validation.valid) {
    const errorSummary = validation.errors.join('; ');

    logBlocked(
      `Code node linting failed: ${errorSummary}`,
      'Code Node Governance - see hooks/docs/n8n-governance.md'
    );

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `LINTING VIOLATION: ${errorSummary}`,
      },
    };
  }

  // Allow with warnings
  if (validation.warnings.length > 0) {
    const warningSummary = validation.warnings.join('; ');
    logAllowed(`Code linting passed with warnings: ${warningSummary}`);

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason: `LINTING WARNING: ${warningSummary}`,
      },
    };
  }

  // Clean pass
  logAllowed('Code node linting passed');

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: 'Code node quality validated',
    },
  };
}

// Register the hook
registerHook('code-node-linting-gate', 'PreToolUse', codeNodeLintingGateHook);

export default codeNodeLintingGateHook;
