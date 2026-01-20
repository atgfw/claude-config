/**
 * ESLint rule: no-empty-console-message
 *
 * Disallows console.* calls with empty or whitespace-only string arguments.
 * Empty console output provides no value and clutters log output.
 *
 * @example
 * // Valid: Console with meaningful content
 * console.log('Processing complete');
 * console.log(data);
 *
 * @example
 * // Invalid: Empty string
 * console.log('');
 *
 * @example
 * // Invalid: Whitespace-only string
 * console.log('   ');
 *
 * @example
 * // Invalid: No arguments
 * console.log();
 *
 * @example
 * // Invalid: Empty template literal
 * console.warn(``);
 *
 * @module spinal-quality/no-empty-console-message
 */
import type { Rule } from 'eslint';
declare const rule: Rule.RuleModule;
export default rule;
//# sourceMappingURL=no-empty-console-message.d.ts.map