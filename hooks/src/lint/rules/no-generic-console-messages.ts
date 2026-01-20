/**
 * ESLint rule: no-generic-console-messages
 *
 * Disallows generic boilerplate console messages that provide no specific
 * information. Messages starting with words like "Preparing", "Starting",
 * "Successfully", "Completed", or "Finished" are flagged.
 *
 * @example
 * // Valid: Specific contextual message
 * console.log(`Processing order ${orderId}`);
 * console.log('User authentication failed for:', email);
 *
 * @example
 * // Invalid: Generic "starting" message
 * console.log('Starting the process');
 *
 * @example
 * // Invalid: Generic "successfully" message
 * console.log('Successfully completed');
 *
 * @example
 * // Invalid: Generic "done" message
 * console.log('Finished processing');
 *
 * @module spinal-quality/no-generic-console-messages
 */
import type { Rule } from 'eslint';
import type * as ESTree from 'estree';
import { isConsoleMemberExpression, isGenericConsoleMessage } from '../utils.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow generic/boilerplate console messages (e.g., "Successfully ...", "Preparing ...").',
    },
    schema: [],
    messages: {
      generic:
        'Generic console messages are prohibited. Output must be bespoke and include specific object/value context.',
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
          return;
        }

        const a0 = args[0];
        if (!a0) {
          return;
        }

        if (a0.type === 'Literal') {
          const lit = a0 as ESTree.Literal;
          if (typeof lit.value === 'string' && isGenericConsoleMessage(lit.value)) {
            context.report({ node: a0, messageId: 'generic' });
          }

          return;
        }

        if (a0.type === 'TemplateLiteral') {
          const templateLit = a0 as ESTree.TemplateLiteral;
          if (templateLit.expressions.length === 0) {
            const cooked = templateLit.quasis.map((q) => q.value?.cooked ?? '').join('');
            if (isGenericConsoleMessage(cooked)) {
              context.report({ node: a0, messageId: 'generic' });
            }
          }
        }
      },
    };
  },
};

export default rule;
