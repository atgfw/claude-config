/**
 * ESLint rule: no-multiline-error-message
 *
 * Disallows newline characters inside Error constructor messages.
 * Multiline error messages make stack traces harder to parse and
 * can cause issues with logging systems that expect single-line entries.
 *
 * @example
 * // Valid: Single-line error message
 * throw new Error('Something went wrong');
 * throw new TypeError('Invalid argument type');
 *
 * @example
 * // Invalid: Error with embedded newline
 * throw new Error('Line 1\nLine 2');
 * throw new Error(`First line
 * Second line`);
 *
 * @module spinal-quality/no-multiline-error-message
 */
import type { Rule } from 'eslint';
declare const rule: Rule.RuleModule;
export default rule;
//# sourceMappingURL=no-multiline-error-message.d.ts.map