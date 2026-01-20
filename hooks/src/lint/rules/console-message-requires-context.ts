/**
 * ESLint rule: console-message-requires-context
 *
 * Requires console.* calls to include runtime context via template interpolation
 * or multiple arguments. Bare string literals without context provide limited
 * debugging value.
 *
 * @example
 * // Valid: Template with interpolation
 * console.log(`Processing user: ${userId}`);
 *
 * @example
 * // Valid: Multiple arguments
 * console.log('User data:', userData);
 *
 * @example
 * // Valid: Object argument (has intrinsic context)
 * console.log(data);
 *
 * @example
 * // Invalid: Bare string literal
 * console.log('Starting process');
 *
 * @example
 * // Invalid: Template without expressions
 * console.log(`A static message`);
 *
 * @module spinal-quality/console-message-requires-context
 */
import type { Rule } from 'eslint';
import type * as ESTree from 'estree';
import {
  isConsoleMemberExpression,
  getConsoleMethodName,
  consoleArgsContainContext,
} from '../utils.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow console.* with a single bare string (requires template interpolation or a second arg/object).',
    },
    schema: [],
    messages: {
      needsContext:
        'Console messages must include context: use a template literal with interpolation or pass a second argument.',
    },
  },
  create(context) {
    return {
      CallExpression(node: ESTree.CallExpression) {
        if (!isConsoleMemberExpression(node.callee)) {
          return;
        }

        const args = node.arguments ?? [];
        if (!consoleArgsContainContext(args)) {
          const method = getConsoleMethodName(node.callee as ESTree.MemberExpression);
          if (method === 'log' || method === 'info' || method === 'warn' || method === 'error') {
            context.report({ node, messageId: 'needsContext' });
          }
        }
      },
    };
  },
};

export default rule;
