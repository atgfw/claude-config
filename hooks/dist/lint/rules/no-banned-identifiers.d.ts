/**
 * ESLint rule: no-banned-identifiers
 *
 * Disallows generic variable names that convey no semantic meaning. These
 * banned identifiers include: result, id, pid, object, report, output, json,
 * response, name, value. Use more descriptive names instead.
 *
 * @example
 * // Valid: Descriptive names
 * const userData = fetchUser();
 * const userId = 123;
 * function processOrder(orderData) {}
 *
 * @example
 * // Invalid: Generic names
 * const result = fetchUser();
 * const id = 123;
 * function process(value) {}
 *
 * @example
 * // Invalid: Banned import alias
 * import { foo as result } from 'bar';
 *
 * @module spinal-quality/no-banned-identifiers
 */
import type { Rule } from 'eslint';
declare const rule: Rule.RuleModule;
export default rule;
//# sourceMappingURL=no-banned-identifiers.d.ts.map