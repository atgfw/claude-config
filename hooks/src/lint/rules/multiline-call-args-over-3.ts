/**
 * ESLint rule: multiline-call-args-over-3
 *
 * Enforces multiline formatting for function calls and new expressions with
 * more than 3 arguments. Each argument must be on its own line, and the
 * closing parenthesis must be on its own line.
 *
 * @example
 * // Valid: 3 arguments on one line
 * foo(a, b, c);
 *
 * @example
 * // Valid: 4+ arguments on separate lines
 * foo(
 *   a,
 *   b,
 *   c,
 *   d
 * );
 *
 * @example
 * // Invalid: 4 arguments on one line
 * foo(a, b, c, d);
 *
 * @example
 * // Invalid: Arguments on same lines
 * foo(
 *   a, b,
 *   c, d
 * );
 *
 * @module spinal-quality/multiline-call-args-over-3
 */
import type { Rule } from 'eslint';
import type * as ESTree from 'estree';

const rule: Rule.RuleModule = {
  meta: {
    type: 'layout',
    docs: {
      description:
        'If a call/new expression has > 3 args, require: "(" on its own line, one arg per line, ")" on its own line.',
    },
    schema: [],
    messages: {
      multiline:
        'Calls with more than 3 arguments must be multiline: one argument per line, and ")" on its own line.',
    },
  },
  create(context) {
    const sourceCode = context.sourceCode ?? context.getSourceCode();
    function check(
      node: ESTree.CallExpression | ESTree.NewExpression,
      args: ESTree.Node[],
      callee: ESTree.Node
    ): void {
      if (!args || args.length <= 3) {
        return;
      }

      const openParen = sourceCode.getTokenAfter(callee, (t) => t.value === '(');
      const closeParen = sourceCode.getLastToken(node, (t) => t.value === ')');
      if (!openParen || !closeParen) {
        return;
      }

      const firstArg = args[0];
      const lastArg = args[args.length - 1];
      if (!firstArg || !lastArg) {
        return;
      }

      if (firstArg.loc?.start.line === openParen.loc?.start.line) {
        context.report({ node: firstArg, messageId: 'multiline' });
        return;
      }

      for (let i = 1; i < args.length; i += 1) {
        const curr = args[i];
        const prev = args[i - 1];
        if (curr && prev && curr.loc?.start.line === prev.loc?.start.line) {
          context.report({ node: curr, messageId: 'multiline' });
          return;
        }
      }

      if (closeParen.loc?.start.line === lastArg.loc?.end.line) {
        context.report({ node, messageId: 'multiline' });
      }
    }

    return {
      CallExpression(node: ESTree.CallExpression) {
        check(node, node.arguments, node.callee);
      },
      NewExpression(node: ESTree.NewExpression) {
        check(node, node.arguments, node.callee);
      },
    };
  },
};

export default rule;
