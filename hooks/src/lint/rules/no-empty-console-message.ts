/**
 * ESLint rule: no-empty-console-message
 *
 * Disallows console.* calls with empty or whitespace-only string arguments.
 * Empty console output provides no value and clutters log output.
 *
 * @example
 * // Valid: Console with meaningful content
 * console.log('Processing complete');
 * console.log(data);
 *
 * @example
 * // Invalid: Empty string
 * console.log('');
 *
 * @example
 * // Invalid: Whitespace-only string
 * console.log('   ');
 *
 * @example
 * // Invalid: No arguments
 * console.log();
 *
 * @example
 * // Invalid: Empty template literal
 * console.warn(``);
 *
 * @module spinal-quality/no-empty-console-message
 */
import type { Rule } from 'eslint';
import type * as ESTree from 'estree';
import { isConsoleMemberExpression } from '../utils.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Disallow console.* with empty/blank string messages.',
    },
    schema: [],
    messages: {
      empty: 'Blank console output is prohibited.',
    },
  },
  create(context) {
    return {
      CallExpression(node: ESTree.CallExpression) {
        if (!isConsoleMemberExpression(node.callee)) {
          return;
        }

        const args = node.arguments ?? [];
        if (args.length === 0) {
          context.report({ node, messageId: 'empty' });
          return;
        }

        const a0 = args[0];
        if (!a0) {
          return;
        }

        if (a0.type === 'Literal') {
          const lit = a0 as ESTree.Literal;
          if (typeof lit.value === 'string' && lit.value.trim().length === 0) {
            context.report({ node: a0, messageId: 'empty' });
            return;
          }
        }

        if (a0.type === 'TemplateLiteral') {
          const templateLit = a0 as ESTree.TemplateLiteral;
          if (templateLit.expressions.length === 0) {
            const cooked = templateLit.quasis.map((q) => q.value?.cooked ?? '').join('');
            if (typeof cooked === 'string' && cooked.trim().length === 0) {
              context.report({ node: a0, messageId: 'empty' });
            }
          }
        }
      },
    };
  },
};

export default rule;
