const rule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Catch blocks must contain exactly: throw <caughtError>;',
        },
        schema: [],
        messages: {
            mustHaveParam: 'Catch blocks must bind the caught error (e.g., catch (error)).',
            onlyThrow: 'Catch blocks must contain exactly one statement: throw <caughtError>;',
            mustRethrowSame: 'Catch must rethrow the same caught error identifier to preserve the original error.',
        },
    },
    create(context) {
        return {
            CatchClause(node) {
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
                const thrown = firstStmt.argument;
                if (!thrown || thrown.type !== 'Identifier' || thrown.name !== param.name) {
                    context.report({ node, messageId: 'mustRethrowSame' });
                }
            },
        };
    },
};
export default rule;
//# sourceMappingURL=catch-throw-only.js.map