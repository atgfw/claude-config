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
declare const rule: Rule.RuleModule;
export default rule;
//# sourceMappingURL=ascii-only.d.ts.map