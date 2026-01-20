/**
 * Shared utilities for eslint-plugin-spinal-quality rules.
 *
 * This module provides common helper functions, constants, and type guards
 * used across multiple ESLint rules in the spinal-quality plugin.
 *
 * @module spinal-quality/utils
 */
import type { Rule } from 'eslint';
import type * as ESTree from 'estree';

/** Regex to match `// #region Name` with a required name */
export const REGION_START_RE = /^\s*\/\/\s*#region\s+(\S(?:.*\S)?)\s*$/;
// Matches #region with or without name (for detecting nameless regions)
export const REGION_START_BARE_RE = /^\s*\/\/\s*#region\s*$/;
export const REGION_END_RE = /^\s*\/\/\s*#endregion\s*$/;
export const REGION_END_WITH_NAME_RE = /^\s*\/\/\s*#endregion\s+\S+/;

export const ERROR_CTORS = new Set([
  'Error',
  'TypeError',
  'RangeError',
  'ReferenceError',
  'SyntaxError',
  'URIError',
  'AggregateError',
  'EvalError',
]);

export const BANNED_IDENTIFIERS = new Set([
  'result',
  'id',
  'pid',
  'object',
  'report',
  'output',
  'json',
  'response',
  'name',
  'value',
]);

export const GENERIC_MESSAGE_PREFIXES = [
  'preparing',
  'starting',
  'successfully',
  'completed',
  'finished',
];

export function reportAtLine(
  context: Rule.RuleContext,
  lineNumber1Based: number,
  messageId: string,
  data?: Record<string, string>
): void {
  context.report({
    loc: {
      start: { line: lineNumber1Based, column: 0 },
      end: { line: lineNumber1Based, column: 0 },
    },
    messageId,
    data,
  });
}

export function isConsoleMemberExpression(
  callee: ESTree.Node | null | undefined
): callee is ESTree.MemberExpression {
  if (!callee || callee.type !== 'MemberExpression') {
    return false;
  }

  const memberExpr = callee;
  if (memberExpr.object?.type !== 'Identifier' || memberExpr.object.name !== 'console') {
    return false;
  }

  if (memberExpr.property?.type !== 'Identifier') {
    return false;
  }

  return true;
}

export function getConsoleMethodName(callee: ESTree.MemberExpression): string {
  const property = callee.property as ESTree.Identifier;
  return property.name;
}

export function getErrorCtorName(callee: ESTree.Node | null | undefined): string | null {
  if (!callee) {
    return null;
  }

  if (callee.type === 'Identifier') {
    return callee.name;
  }

  return null;
}

export function stringValueHasNewline(value: unknown): boolean {
  return typeof value === 'string' && (value.includes('\n') || value.includes('\r'));
}

export function templateLiteralHasNewline(node: ESTree.Node | null): boolean {
  if (!node || node.type !== 'TemplateLiteral') {
    return false;
  }

  const templateLit = node as ESTree.TemplateLiteral;
  for (const q of templateLit.quasis) {
    if (stringValueHasNewline(q.value?.raw) || stringValueHasNewline(q.value?.cooked)) {
      return true;
    }
  }

  return false;
}

export function consoleArgsContainContext(args: ESTree.Node[] | null | undefined): boolean {
  if (!args || args.length === 0) {
    return false;
  }

  if (args.length >= 2) {
    return true;
  }

  const a0 = args[0];
  if (!a0) {
    return false;
  }

  // Template literal with expressions contains context
  if (a0.type === 'TemplateLiteral') {
    const templateLit = a0 as ESTree.TemplateLiteral;
    // Only has context if there are expressions (interpolations)
    return templateLit.expressions.length > 0;
  }

  // Literal string has no context
  if (a0.type === 'Literal') {
    return false;
  }

  // Other types (objects, variables, etc.) have context
  return true;
}

export function isGenericConsoleMessage(text: unknown): boolean {
  if (typeof text !== 'string') {
    return false;
  }

  const t = text.trim().toLowerCase();
  return (
    GENERIC_MESSAGE_PREFIXES.some((prefix) => t.startsWith(prefix)) ||
    t === 'done' ||
    t.includes('executed successfully')
  );
}
