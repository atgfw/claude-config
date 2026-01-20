import { ERROR_CTORS, getErrorCtorName, stringValueHasNewline, templateLiteralHasNewline, } from '../utils.js';
const rule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow newline characters inside Error constructor messages.',
        },
        schema: [],
        messages: {
            multiline: 'Error messages must be single-line (no \\n or \\r).',
        },
    },
    create(context) {
        function checkCalleeAndArgs(callee, args) {
            const ctorName = getErrorCtorName(callee);
            if (!ctorName || !ERROR_CTORS.has(ctorName)) {
                return;
            }
            if (!args || args.length === 0) {
                return;
            }
            const a0 = args[0];
            if (!a0) {
                return;
            }
            if (a0.type === 'Literal') {
                const lit = a0;
                if (typeof lit.value === 'string' && stringValueHasNewline(lit.value)) {
                    context.report({ node: a0, messageId: 'multiline' });
                }
            }
            else if (a0.type === 'TemplateLiteral' && templateLiteralHasNewline(a0)) {
                context.report({ node: a0, messageId: 'multiline' });
            }
        }
        return {
            NewExpression(node) {
                checkCalleeAndArgs(node.callee, node.arguments);
            },
            CallExpression(node) {
                checkCalleeAndArgs(node.callee, node.arguments);
            },
        };
    },
};
export default rule;
//# sourceMappingURL=no-multiline-error-message.js.map