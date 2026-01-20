/**
 * ESLint rule: no-multiline-error-message
 *
 * Disallows newline characters inside Error constructor messages.
 * Multiline error messages make stack traces harder to parse and
 * can cause issues with logging systems that expect single-line entries.
 *
 * @example
 * // Valid: Single-line error message
 * throw new Error('Something went wrong');
 * throw new TypeError('Invalid argument type');
 *
 * @example
 * // Invalid: Error with embedded newline
 * throw new Error('Line 1\nLine 2');
 * throw new Error(`First line
 * Second line`);
 *
 * @module spinal-quality/no-multiline-error-message
 */
import type { Rule } from 'eslint';
import type * as ESTree from 'estree';
import {
  ERROR_CTORS,
  getErrorCtorName,
  stringValueHasNewline,
  templateLiteralHasNewline,
} from '../utils.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow newline characters inside Error constructor messages.',
    },
    schema: [],
    messages: {
      multiline: 'Error messages must be single-line (no \\n or \\r).',
    },
  },
  create(context) {
    function checkCalleeAndArgs(
      callee: ESTree.Node | null | undefined,
      args: ESTree.Node[] | null | undefined
    ): void {
      const ctorName = getErrorCtorName(callee);
      if (!ctorName || !ERROR_CTORS.has(ctorName)) {
        return;
      }

      if (!args || args.length === 0) {
        return;
      }

      const a0 = args[0];
      if (!a0) {
        return;
      }

      if (a0.type === 'Literal') {
        const lit = a0 as ESTree.Literal;
        if (typeof lit.value === 'string' && stringValueHasNewline(lit.value)) {
          context.report({ node: a0, messageId: 'multiline' });
        }
      } else if (a0.type === 'TemplateLiteral' && templateLiteralHasNewline(a0)) {
        context.report({ node: a0, messageId: 'multiline' });
      }
    }

    return {
      NewExpression(node: ESTree.NewExpression) {
        checkCalleeAndArgs(node.callee, node.arguments);
      },
      CallExpression(node: ESTree.CallExpression) {
        checkCalleeAndArgs(node.callee, node.arguments);
      },
    };
  },
};

export default rule;
