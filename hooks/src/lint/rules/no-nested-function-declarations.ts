/**
 * ESLint rule: no-nested-function-declarations
 *
 * Disallows function declarations that are nested inside other functions.
 * Nested function declarations have confusing hoisting behavior and make
 * code harder to reason about. Use arrow functions or const-assigned
 * functions instead.
 *
 * @example
 * // Valid: Top-level function declarations
 * function foo() { return 1; }
 * export function bar() { return 2; }
 *
 * @example
 * // Valid: Arrow function inside function
 * function outer() {
 *   const inner = () => 1;
 *   return inner();
 * }
 *
 * @example
 * // Invalid: Nested function declaration
 * function outer() {
 *   function inner() { return 1; }  // Error: nested declaration
 *   return inner();
 * }
 *
 * @module spinal-quality/no-nested-function-declarations
 */
import type { Rule } from 'eslint';
import type * as ESTree from 'estree';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow function declarations that are not top-level (no nested named functions).',
    },
    schema: [],
    messages: {
      nested: 'Nested function declarations are prohibited. Declare functions at the top level.',
    },
  },
  create(context) {
    function isTopLevelFunctionDeclaration(node: ESTree.Node): boolean {
      const p = (node as unknown as { parent?: ESTree.Node }).parent;
      return Boolean(
        p &&
        (p.type === 'Program' ||
          p.type === 'ExportNamedDeclaration' ||
          p.type === 'ExportDefaultDeclaration')
      );
    }

    return {
      FunctionDeclaration(node) {
        if (!isTopLevelFunctionDeclaration(node)) {
          context.report({ node, messageId: 'nested' });
        }
      },
    };
  },
};

export default rule;
