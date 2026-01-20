/**
 * ESLint rule: catch-throw-only
 *
 * Enforces that catch blocks contain only a single throw statement that rethrows
 * the caught error. This prevents swallowing errors, logging without rethrowing,
 * or wrapping errors in ways that lose the original stack trace.
 *
 * @example
 * // Valid: Rethrow the caught error
 * try {
 *   riskyOperation();
 * } catch (error) {
 *   throw error;
 * }
 *
 * @example
 * // Invalid: Missing error parameter
 * try { foo(); } catch { throw new Error('x'); }
 *
 * @example
 * // Invalid: Additional logic before throw
 * try { foo(); } catch (err) {
 *   console.log(err);  // Error: must only throw
 *   throw err;
 * }
 *
 * @example
 * // Invalid: Throwing different error
 * try { foo(); } catch (err) {
 *   throw new Error('wrapped');  // Error: must rethrow same
 * }
 *
 * @module spinal-quality/catch-throw-only
 */
import type { Rule } from 'eslint';
declare const rule: Rule.RuleModule;
export default rule;
//# sourceMappingURL=catch-throw-only.d.ts.map