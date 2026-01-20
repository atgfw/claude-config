/**
 * ESLint rule: no-banned-identifiers
 *
 * Disallows generic variable names that convey no semantic meaning. These
 * banned identifiers include: result, id, pid, object, report, output, json,
 * response, name, value. Use more descriptive names instead.
 *
 * @example
 * // Valid: Descriptive names
 * const userData = fetchUser();
 * const userId = 123;
 * function processOrder(orderData) {}
 *
 * @example
 * // Invalid: Generic names
 * const result = fetchUser();
 * const id = 123;
 * function process(value) {}
 *
 * @example
 * // Invalid: Banned import alias
 * import { foo as result } from 'bar';
 *
 * @module spinal-quality/no-banned-identifiers
 */
import type { Rule } from 'eslint';
import type * as ESTree from 'estree';
import { BANNED_IDENTIFIERS } from '../utils.js';

const rule: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Disallow generic/banned identifier names for custom definitions (variables, params, function names, imports, catch param).',
    },
    schema: [],
    messages: {
      banned: 'Identifier "{{name}}" is prohibited. Use a specific, descriptive name.',
    },
  },
  create(context) {
    function checkIdentifier(idNode: ESTree.Node | null | undefined): void {
      if (!idNode || idNode.type !== 'Identifier') {
        return;
      }

      const identifier = idNode as ESTree.Identifier;
      const name = identifier.name;
      if (BANNED_IDENTIFIERS.has(name)) {
        context.report({ node: idNode, messageId: 'banned', data: { name } });
      }
    }

    function checkParam(param: ESTree.Node | null | undefined): void {
      if (!param) {
        return;
      }

      if (param.type === 'Identifier') {
        checkIdentifier(param);
      }
    }

    return {
      VariableDeclarator(node: ESTree.VariableDeclarator) {
        if (node.id?.type === 'Identifier') {
          checkIdentifier(node.id);
        }
      },
      FunctionDeclaration(node: ESTree.FunctionDeclaration) {
        if (node.id?.type === 'Identifier') {
          checkIdentifier(node.id);
        }

        for (const p of node.params ?? []) {
          checkParam(p);
        }
      },
      ArrowFunctionExpression(node: ESTree.ArrowFunctionExpression) {
        for (const p of node.params ?? []) {
          checkParam(p);
        }
      },
      FunctionExpression(node: ESTree.FunctionExpression) {
        for (const p of node.params ?? []) {
          checkParam(p);
        }
      },
      CatchClause(node: ESTree.CatchClause) {
        if (node.param?.type === 'Identifier') {
          checkIdentifier(node.param);
        }
      },
      ImportSpecifier(node: ESTree.ImportSpecifier) {
        checkIdentifier(node.local);
      },
      ImportDefaultSpecifier(node: ESTree.ImportDefaultSpecifier) {
        checkIdentifier(node.local);
      },
      ImportNamespaceSpecifier(node: ESTree.ImportNamespaceSpecifier) {
        checkIdentifier(node.local);
      },
    };
  },
};

export default rule;
