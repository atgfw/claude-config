/**
 * ESLint rule: for-loop-variable-i
 *
 * Requires loop iteration variables in for, for-in, and for-of loops to be
 * named `i`. This standardizes loop variable naming across the codebase and
 * avoids verbose names like `index`, `item`, or `key`.
 *
 * @example
 * // Valid: Variable named i
 * for (let i = 0; i < 10; i++) {}
 * for (const i of items) {}
 * for (const i in obj) {}
 *
 * @example
 * // Invalid: Variable not named i
 * for (let index = 0; index < 10; index++) {}
 * for (const item of items) {}
 * for (const key in obj) {}
 *
 * @module spinal-quality/for-loop-variable-i
 */
import type { Rule } from 'eslint';
import type * as ESTree from 'estree';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Require loop variable name to be i in for/for-in/for-of loops.',
    },
    schema: [],
    messages: {
      mustBeI: 'Loop variable must be named "i".',
    },
  },
  create(context) {
    function checkVariableDeclaration(
      node: ESTree.Node,
      varDecl: ESTree.Node | null | undefined
    ): void {
      if (!varDecl || varDecl.type !== 'VariableDeclaration') {
        context.report({ node, messageId: 'mustBeI' });
        return;
      }

      const decl = varDecl as ESTree.VariableDeclaration;
      if (!decl.declarations || decl.declarations.length !== 1) {
        context.report({ node, messageId: 'mustBeI' });
        return;
      }

      const declaration = decl.declarations[0];
      if (!declaration) {
        context.report({ node, messageId: 'mustBeI' });
        return;
      }

      if (!declaration.id || declaration.id.type !== 'Identifier' || declaration.id.name !== 'i') {
        context.report({ node, messageId: 'mustBeI' });
      }
    }

    return {
      ForStatement(node: ESTree.ForStatement) {
        if (node.init == null) {
          return;
        }

        checkVariableDeclaration(node, node.init);
      },
      ForInStatement(node: ESTree.ForInStatement) {
        checkVariableDeclaration(node, node.left);
      },
      ForOfStatement(node: ESTree.ForOfStatement) {
        checkVariableDeclaration(node, node.left);
      },
    };
  },
};

export default rule;
