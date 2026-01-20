/**
 * ESLint rule: require-regions
 *
 * Enforces the use of VSCode-style `// #region Name` and `// #endregion` blocks
 * for code organization. This improves readability by creating collapsible
 * sections in IDEs that support region folding.
 *
 * @example
 * // Valid: File with proper regions
 * // #region Imports
 * import foo from 'foo';
 * // #endregion
 *
 * // #region Helpers
 * function helper() {}
 * // #endregion
 *
 * @example
 * // Invalid: No regions at all
 * const x = 1;
 *
 * @example
 * // Invalid: Region without name
 * // #region
 * const x = 1;
 * // #endregion
 *
 * @example
 * // Invalid: Endregion with name
 * // #region Test
 * const x = 1;
 * // #endregion Test
 *
 * @module spinal-quality/require-regions
 */
import type { Rule } from 'eslint';
declare const rule: Rule.RuleModule;
export default rule;
//# sourceMappingURL=require-regions.d.ts.map