/**
 * ESLint rule: for-loop-variable-i
 *
 * Requires loop iteration variables in for, for-in, and for-of loops to be
 * named `i`. This standardizes loop variable naming across the codebase and
 * avoids verbose names like `index`, `item`, or `key`.
 *
 * @example
 * // Valid: Variable named i
 * for (let i = 0; i < 10; i++) {}
 * for (const i of items) {}
 * for (const i in obj) {}
 *
 * @example
 * // Invalid: Variable not named i
 * for (let index = 0; index < 10; index++) {}
 * for (const item of items) {}
 * for (const key in obj) {}
 *
 * @module spinal-quality/for-loop-variable-i
 */
import type { Rule } from 'eslint';
declare const rule: Rule.RuleModule;
export default rule;
//# sourceMappingURL=for-loop-variable-i.d.ts.map