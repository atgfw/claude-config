const rule = {
    meta: {
        type: 'problem',
        docs: {
            description: 'Disallow non-ASCII characters anywhere in the source file.',
        },
        schema: [],
        messages: {
            nonAscii: 'Non-ASCII character "{{char}}" (U+{{code}}) is not allowed. Use ASCII only.',
        },
    },
    create(context) {
        const sourceCode = context.sourceCode ?? context.getSourceCode();
        const text = sourceCode.getText();
        return {
            Program(node) {
                for (let i = 0; i < text.length; i += 1) {
                    const code = text.charCodeAt(i);
                    if (code > 127) {
                        const ch = text[i] ?? '';
                        context.report({
                            node,
                            loc: sourceCode.getLocFromIndex(i),
                            messageId: 'nonAscii',
                            data: {
                                char: ch,
                                code: code.toString(16).toUpperCase().padStart(4, '0'),
                            },
                        });
                        break;
                    }
                }
            },
        };
    },
};
export default rule;
//# sourceMappingURL=ascii-only.js.map