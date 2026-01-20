/**
 * Prompt Escalation Detector Hook (UserPromptSubmit)
 *
 * Detects explicit escalation intent in user prompts.
 * Captures user-reported issues that should be escalated to the global registry.
 */
import type { UserPromptSubmitInput, UserPromptSubmitOutput } from '../types.js';
/**
 * Prompt Escalation Detector Hook
 *
 * Scans user prompts for escalation intent patterns.
 * When intent is detected, creates escalation entry.
 */
export declare function promptEscalationDetectorHook(input: UserPromptSubmitInput): Promise<UserPromptSubmitOutput>;
export default promptEscalationDetectorHook;
//# sourceMappingURL=prompt_escalation_detector.d.ts.map