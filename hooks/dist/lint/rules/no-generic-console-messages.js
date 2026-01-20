import { isConsoleMemberExpression, isGenericConsoleMessage } from '../utils.js';
const rule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow generic/boilerplate console messages (e.g., "Successfully ...", "Preparing ...").',
        },
        schema: [],
        messages: {
            generic: 'Generic console messages are prohibited. Output must be bespoke and include specific object/value context.',
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
                    return;
                }
                const a0 = args[0];
                if (!a0) {
                    return;
                }
                if (a0.type === 'Literal') {
                    const lit = a0;
                    if (typeof lit.value === 'string' && isGenericConsoleMessage(lit.value)) {
                        context.report({ node: a0, messageId: 'generic' });
                    }
                    return;
                }
                if (a0.type === 'TemplateLiteral') {
                    const templateLit = a0;
                    if (templateLit.expressions.length === 0) {
                        const cooked = templateLit.quasis.map((q) => q.value?.cooked ?? '').join('');
                        if (isGenericConsoleMessage(cooked)) {
                            context.report({ node: a0, messageId: 'generic' });
                        }
                    }
                }
            },
        };
    },
};
export default rule;
//# sourceMappingURL=no-generic-console-messages.js.map