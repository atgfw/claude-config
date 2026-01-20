const rule = {
    meta: {
        type: 'layout',
        docs: {
            description: 'If a call/new expression has > 3 args, require: "(" on its own line, one arg per line, ")" on its own line.',
        },
        schema: [],
        messages: {
            multiline: 'Calls with more than 3 arguments must be multiline: one argument per line, and ")" on its own line.',
        },
    },
    create(context) {
        const sourceCode = context.sourceCode ?? context.getSourceCode();
        function check(node, args, callee) {
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
            CallExpression(node) {
                check(node, node.arguments, node.callee);
            },
            NewExpression(node) {
                check(node, node.arguments, node.callee);
            },
        };
    },
};
export default rule;
//# sourceMappingURL=multiline-call-args-over-3.js.map