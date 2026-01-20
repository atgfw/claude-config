/**
 * ESLint rule: no-nested-function-declarations
 *
 * Disallows function declarations that are nested inside other functions.
 * Nested function declarations have confusing hoisting behavior and make
 * code harder to reason about. Use arrow functions or const-assigned
 * functions instead.
 *
 * @example
 * // Valid: Top-level function declarations
 * function foo() { return 1; }
 * export function bar() { return 2; }
 *
 * @example
 * // Valid: Arrow function inside function
 * function outer() {
 *   const inner = () => 1;
 *   return inner();
 * }
 *
 * @example
 * // Invalid: Nested function declaration
 * function outer() {
 *   function inner() { return 1; }  // Error: nested declaration
 *   return inner();
 * }
 *
 * @module spinal-quality/no-nested-function-declarations
 */
import type { Rule } from 'eslint';
declare const rule: Rule.RuleModule;
export default rule;
//# sourceMappingURL=no-nested-function-declarations.d.ts.map