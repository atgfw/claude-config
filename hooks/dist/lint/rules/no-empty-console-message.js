import { isConsoleMemberExpression } from '../utils.js';
const rule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow console.* with empty/blank string messages.',
        },
        schema: [],
        messages: {
            empty: 'Blank console output is prohibited.',
        },
    },
    create(context) {
        return {
            CallExpression(node) {
                if (!isConsoleMemberExpression(node.callee)) {
                    return;
                }
                const args = node.arguments ?? [];
                if (args.length === 0) {
                    context.report({ node, messageId: 'empty' });
                    return;
                }
                const a0 = args[0];
                if (!a0) {
                    return;
                }
                if (a0.type === 'Literal') {
                    const lit = a0;
                    if (typeof lit.value === 'string' && lit.value.trim().length === 0) {
                        context.report({ node: a0, messageId: 'empty' });
                        return;
                    }
                }
                if (a0.type === 'TemplateLiteral') {
                    const templateLit = a0;
                    if (templateLit.expressions.length === 0) {
                        const cooked = templateLit.quasis.map((q) => q.value?.cooked ?? '').join('');
                        if (typeof cooked === 'string' && cooked.trim().length === 0) {
                            context.report({ node: a0, messageId: 'empty' });
                        }
                    }
                }
            },
        };
    },
};
export default rule;
//# sourceMappingURL=no-empty-console-message.js.map