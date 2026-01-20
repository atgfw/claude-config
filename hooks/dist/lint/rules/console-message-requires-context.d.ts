/**
 * ESLint rule: console-message-requires-context
 *
 * Requires console.* calls to include runtime context via template interpolation
 * or multiple arguments. Bare string literals without context provide limited
 * debugging value.
 *
 * @example
 * // Valid: Template with interpolation
 * console.log(`Processing user: ${userId}`);
 *
 * @example
 * // Valid: Multiple arguments
 * console.log('User data:', userData);
 *
 * @example
 * // Valid: Object argument (has intrinsic context)
 * console.log(data);
 *
 * @example
 * // Invalid: Bare string literal
 * console.log('Starting process');
 *
 * @example
 * // Invalid: Template without expressions
 * console.log(`A static message`);
 *
 * @module spinal-quality/console-message-requires-context
 */
import type { Rule } from 'eslint';
declare const rule: Rule.RuleModule;
export default rule;
//# sourceMappingURL=console-message-requires-context.d.ts.map