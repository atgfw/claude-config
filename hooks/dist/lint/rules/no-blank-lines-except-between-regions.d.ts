/**
 * ESLint rule: no-blank-lines-except-between-regions
 *
 * Enforces that blank lines only appear between an `#endregion` comment and
 * the following `#region` comment. Blank lines inside regions are disallowed.
 * This creates consistent visual separation between code sections.
 *
 * @example
 * // Valid: Blank line between regions
 * // #region One
 * const x = 1;
 * // #endregion
 *
 * // #region Two
 * const y = 2;
 * // #endregion
 *
 * @example
 * // Invalid: Blank line inside region
 * // #region Test
 * const x = 1;
 *
 * const y = 2;  // Error: blank line inside region
 * // #endregion
 *
 * @module spinal-quality/no-blank-lines-except-between-regions
 */
import type { Rule } from 'eslint';
declare const rule: Rule.RuleModule;
export default rule;
//# sourceMappingURL=no-blank-lines-except-between-regions.d.ts.map