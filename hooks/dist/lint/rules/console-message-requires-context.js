import { isConsoleMemberExpression, getConsoleMethodName, consoleArgsContainContext, } from '../utils.js';
const rule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow console.* with a single bare string (requires template interpolation or a second arg/object).',
        },
        schema: [],
        messages: {
            needsContext: 'Console messages must include context: use a template literal with interpolation or pass a second argument.',
        },
    },
    create(context) {
        return {
            CallExpression(node) {
                if (!isConsoleMemberExpression(node.callee)) {
                    return;
                }
                const args = node.arguments ?? [];
                if (!consoleArgsContainContext(args)) {
                    const method = getConsoleMethodName(node.callee);
                    if (method === 'log' || method === 'info' || method === 'warn' || method === 'error') {
                        context.report({ node, messageId: 'needsContext' });
                    }
                }
            },
        };
    },
};
export default rule;
//# sourceMappingURL=console-message-requires-context.js.map