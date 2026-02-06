/**
 * Work Request Issue Bridge
 *
 * UserPromptSubmit hook that intelligently detects substantive work requests
 * and auto-creates GitHub issues. Filters out conversational prompts, questions,
 * meta-commands, and short messages to avoid garbage issue creation.
 *
 * Registered BEFORE goal-auto-derivation so the new issue exists when derivation runs.
 */
import type { UserPromptSubmitInput, UserPromptSubmitOutput } from '../types.js';
/**
 * Detect if a prompt is a substantive work request.
 * Returns the detected verb and cleaned title, or null if not a work request.
 */
declare function detectWorkRequest(prompt: string): {
    verb: string;
    title: string;
    type: string;
} | null;
/**
 * Derive system prefix from working directory.
 */
declare function deriveSystemPrefix(workingDir: string): string;
/**
 * Check for duplicate against open issues in the sync registry.
 */
declare function isDuplicateOfOpenIssue(title: string): boolean;
declare function workRequestIssueBridge(input: UserPromptSubmitInput): Promise<UserPromptSubmitOutput>;
export { detectWorkRequest, deriveSystemPrefix, isDuplicateOfOpenIssue };
export default workRequestIssueBridge;
//# sourceMappingURL=work_request_issue_bridge.d.ts.map