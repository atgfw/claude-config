/**
 * Login Detection Escalator Hook (PostToolUse)
 *
 * Monitors browser automation results for login page patterns.
 * When a login page is detected, escalates to the user with clear instructions.
 *
 * Escalation chain:
 * 1. Browser navigation/screenshot occurs
 * 2. This hook analyzes the output for login indicators
 * 3. If login detected -> Return context instructing agent to ask user to authenticate
 * 4. Agent receives context, prompts user for manual login
 */
import type { PostToolUseInput, PostToolUseOutput } from '../types.js';
/**
 * Login Detection Escalator Hook
 *
 * Analyzes browser automation output for login page indicators
 * and escalates to user when authentication is required.
 */
export declare function loginDetectionEscalatorHook(input: PostToolUseInput): Promise<PostToolUseOutput>;
export default loginDetectionEscalatorHook;
//# sourceMappingURL=login_detection_escalator.d.ts.map