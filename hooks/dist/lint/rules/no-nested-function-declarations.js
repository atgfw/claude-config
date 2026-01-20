const rule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow function declarations that are not top-level (no nested named functions).',
        },
        schema: [],
        messages: {
            nested: 'Nested function declarations are prohibited. Declare functions at the top level.',
        },
    },
    create(context) {
        function isTopLevelFunctionDeclaration(node) {
            const p = node.parent;
            return Boolean(p &&
                (p.type === 'Program' ||
                    p.type === 'ExportNamedDeclaration' ||
                    p.type === 'ExportDefaultDeclaration'));
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
//# sourceMappingURL=no-nested-function-declarations.js.map