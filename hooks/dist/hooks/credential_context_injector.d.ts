/**
 * Credential Context Injector Hook
 * Detects when credentials/API keys are discussed and injects context about where they're stored
 * Prevents Claude from: (1) claiming keys don't exist when they do (2) putting keys in wrong places
 */
import type { UserPromptSubmitInput, UserPromptSubmitOutput } from '../types.js';
/**
 * Patterns that indicate credential-related discussion
 */
declare const CREDENTIAL_PATTERNS: RegExp[];
/**
 * Parse .env file to extract configured service names (not values)
 */
declare function getConfiguredServices(envPath: string): string[];
/**
 * Check if prompt discusses credentials
 */
declare function detectsCredentialDiscussion(prompt: string): boolean;
/**
 * Build context injection message
 */
declare function buildContextMessage(services: string[]): string;
/**
 * Credential Context Injector Hook Implementation
 */
declare function credentialContextInjector(input: UserPromptSubmitInput): Promise<UserPromptSubmitOutput>;
export default credentialContextInjector;
export { detectsCredentialDiscussion, getConfiguredServices, buildContextMessage, CREDENTIAL_PATTERNS, };
//# sourceMappingURL=credential_context_injector.d.ts.map