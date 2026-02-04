/**
 * Evidence Requirement Gate Hook
 *
 * Enforces that task completions and issue closures include verbatim evidence
 * from the codebase proving the work was done.
 *
 * GitHub Issue: #30
 * Trigger: PreToolUse on TaskUpdate (status=completed), Bash (gh issue close)
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
declare const EVIDENCE_PATTERNS: {
    fileRef: RegExp;
    verbatim: RegExp;
    verification: RegExp;
};
/**
 * Check if text contains evidence of completion.
 */
declare function hasEvidence(text: string): {
    valid: boolean;
    missing: string[];
};
/**
 * Check if a TaskUpdate is marking a task as completed.
 */
declare function isCompletionUpdate(toolInput: Record<string, unknown>): boolean;
/**
 * Check if a Bash command is closing a GitHub issue.
 */
declare function isIssueCloseCommand(command: string): boolean;
/**
 * PreToolUse hook - validate evidence for completions.
 */
declare function evidenceRequirementGate(input: PreToolUseInput): Promise<PreToolUseOutput>;
export { evidenceRequirementGate, hasEvidence, isCompletionUpdate, isIssueCloseCommand, EVIDENCE_PATTERNS, };
export default evidenceRequirementGate;
//# sourceMappingURL=evidence_requirement_gate.d.ts.map