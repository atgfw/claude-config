/**
 * ESLint rule: ascii-only
 *
 * Disallows non-ASCII characters (code points > 127) anywhere in source files.
 * This prevents issues with curly quotes, invisible Unicode characters, emoji,
 * and other non-ASCII content that can cause subtle bugs or encoding issues.
 *
 * @example
 * // Valid: ASCII-only content
 * const message = "Hello World";
 * const price = 9.99;
 *
 * @example
 * // Invalid: Curly quotes (U+201C, U+201D)
 * const message = "Hello World";  // Error: non-ASCII
 *
 * @example
 * // Invalid: Emoji
 * const rocket = "go";  // Error: non-ASCII
 *
 * @module spinal-quality/ascii-only
 */
import type { Rule } from 'eslint';

const rule: Rule.RuleModule = {
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
