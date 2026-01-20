const rule = {
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
        function checkVariableDeclaration(node, varDecl) {
            if (!varDecl || varDecl.type !== 'VariableDeclaration') {
                context.report({ node, messageId: 'mustBeI' });
                return;
            }
            const decl = varDecl;
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
            ForStatement(node) {
                if (node.init == null) {
                    return;
                }
                checkVariableDeclaration(node, node.init);
            },
            ForInStatement(node) {
                checkVariableDeclaration(node, node.left);
            },
            ForOfStatement(node) {
                checkVariableDeclaration(node, node.left);
            },
        };
    },
};
export default rule;
//# sourceMappingURL=for-loop-variable-i.js.map