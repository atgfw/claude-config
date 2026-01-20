/**
 * ESLint rule: multiline-call-args-over-3
 *
 * Enforces multiline formatting for function calls and new expressions with
 * more than 3 arguments. Each argument must be on its own line, and the
 * closing parenthesis must be on its own line.
 *
 * @example
 * // Valid: 3 arguments on one line
 * foo(a, b, c);
 *
 * @example
 * // Valid: 4+ arguments on separate lines
 * foo(
 *   a,
 *   b,
 *   c,
 *   d
 * );
 *
 * @example
 * // Invalid: 4 arguments on one line
 * foo(a, b, c, d);
 *
 * @example
 * // Invalid: Arguments on same lines
 * foo(
 *   a, b,
 *   c, d
 * );
 *
 * @module spinal-quality/multiline-call-args-over-3
 */
import type { Rule } from 'eslint';
declare const rule: Rule.RuleModule;
export default rule;
//# sourceMappingURL=multiline-call-args-over-3.d.ts.map