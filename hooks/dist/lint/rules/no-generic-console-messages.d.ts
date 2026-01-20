/**
 * ESLint rule: no-generic-console-messages
 *
 * Disallows generic boilerplate console messages that provide no specific
 * information. Messages starting with words like "Preparing", "Starting",
 * "Successfully", "Completed", or "Finished" are flagged.
 *
 * @example
 * // Valid: Specific contextual message
 * console.log(`Processing order ${orderId}`);
 * console.log('User authentication failed for:', email);
 *
 * @example
 * // Invalid: Generic "starting" message
 * console.log('Starting the process');
 *
 * @example
 * // Invalid: Generic "successfully" message
 * console.log('Successfully completed');
 *
 * @example
 * // Invalid: Generic "done" message
 * console.log('Finished processing');
 *
 * @module spinal-quality/no-generic-console-messages
 */
import type { Rule } from 'eslint';
declare const rule: Rule.RuleModule;
export default rule;
//# sourceMappingURL=no-generic-console-messages.d.ts.map