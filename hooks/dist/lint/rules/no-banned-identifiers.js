import { BANNED_IDENTIFIERS } from '../utils.js';
const rule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow generic/banned identifier names for custom definitions (variables, params, function names, imports, catch param).',
        },
        schema: [],
        messages: {
            banned: 'Identifier "{{name}}" is prohibited. Use a specific, descriptive name.',
        },
    },
    create(context) {
        function checkIdentifier(idNode) {
            if (!idNode || idNode.type !== 'Identifier') {
                return;
            }
            const identifier = idNode;
            const name = identifier.name;
            if (BANNED_IDENTIFIERS.has(name)) {
                context.report({ node: idNode, messageId: 'banned', data: { name } });
            }
        }
        function checkParam(param) {
            if (!param) {
                return;
            }
            if (param.type === 'Identifier') {
                checkIdentifier(param);
            }
        }
        return {
            VariableDeclarator(node) {
                if (node.id?.type === 'Identifier') {
                    checkIdentifier(node.id);
                }
            },
            FunctionDeclaration(node) {
                if (node.id?.type === 'Identifier') {
                    checkIdentifier(node.id);
                }
                for (const p of node.params ?? []) {
                    checkParam(p);
                }
            },
            ArrowFunctionExpression(node) {
                for (const p of node.params ?? []) {
                    checkParam(p);
                }
            },
            FunctionExpression(node) {
                for (const p of node.params ?? []) {
                    checkParam(p);
                }
            },
            CatchClause(node) {
                if (node.param?.type === 'Identifier') {
                    checkIdentifier(node.param);
                }
            },
            ImportSpecifier(node) {
                checkIdentifier(node.local);
            },
            ImportDefaultSpecifier(node) {
                checkIdentifier(node.local);
            },
            ImportNamespaceSpecifier(node) {
                checkIdentifier(node.local);
            },
        };
    },
};
export default rule;
//# sourceMappingURL=no-banned-identifiers.js.map