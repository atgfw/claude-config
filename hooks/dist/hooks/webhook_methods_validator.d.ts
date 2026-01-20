/**
 * Webhook Methods Validator Hook
 * VALIDATES webhook httpMethod configuration exists
 * Enforces: "Webhook triggers must accept ALL expected HTTP methods"
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
/**
 * Webhook Methods Validator Hook Implementation
 *
 * Validates that webhook triggers have httpMethod configuration.
 * Prevents webhook triggers that may not accept expected HTTP methods.
 */
export declare function webhookMethodsValidatorHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default webhookMethodsValidatorHook;
//# sourceMappingURL=webhook_methods_validator.d.ts.map