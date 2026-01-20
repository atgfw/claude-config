/**
 * ESLint rule: catch-throw-only
 *
 * Enforces that catch blocks contain only a single throw statement that rethrows
 * the caught error. This prevents swallowing errors, logging without rethrowing,
 * or wrapping errors in ways that lose the original stack trace.
 *
 * @example
 * // Valid: Rethrow the caught error
 * try {
 *   riskyOperation();
 * } catch (error) {
 *   throw error;
 * }
 *
 * @example
 * // Invalid: Missing error parameter
 * try { foo(); } catch { throw new Error('x'); }
 *
 * @example
 * // Invalid: Additional logic before throw
 * try { foo(); } catch (err) {
 *   console.log(err);  // Error: must only throw
 *   throw err;
 * }
 *
 * @example
 * // Invalid: Throwing different error
 * try { foo(); } catch (err) {
 *   throw new Error('wrapped');  // Error: must rethrow same
 * }
 *
 * @module spinal-quality/catch-throw-only
 */
import type { Rule } from 'eslint';
import type * as ESTree from 'estree';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Catch blocks must contain exactly: throw <caughtError>;',
    },
    schema: [],
    messages: {
      mustHaveParam: 'Catch blocks must bind the caught error (e.g., catch (error)).',
      onlyThrow: 'Catch blocks must contain exactly one statement: throw <caughtError>;',
      mustRethrowSame:
        'Catch must rethrow the same caught error identifier to preserve the original error.',
    },
  },
  create(context) {
    return {
      CatchClause(node: ESTree.CatchClause) {
        const param = node.param;
        if (!param || param.type !== 'Identifier') {
          context.report({ node, messageId: 'mustHaveParam' });
          return;
        }

        const stmts = node.body?.body ?? [];
        const firstStmt = stmts[0];
        if (stmts.length !== 1 || !firstStmt || firstStmt.type !== 'ThrowStatement') {
          context.report({ node, messageId: 'onlyThrow' });
          return;
        }

        const thrown = (firstStmt as ESTree.ThrowStatement).argument;
        if (!thrown || thrown.type !== 'Identifier' || thrown.name !== param.name) {
          context.report({ node, messageId: 'mustRethrowSame' });
        }
      },
    };
  },
};

export default rule;
