/**
 * GitHub Issue CRUD Utilities
 * Handles automatic issue creation/closing via gh CLI.
 * This is a utility module -- hooks call these functions.
 */
export interface CreateIssueOpts {
    title: string;
    body: string;
    labels?: string[];
    source?: 'correction-ledger' | 'escalation' | 'openspec' | 'manual';
}
export interface CorrectionEntry {
    description: string;
    system?: string;
    id?: string;
}
export interface EscalationEntry {
    description: string;
    category?: string;
    severity: string;
    id?: string;
}
/**
 * Compute keyword overlap between two strings.
 * Returns intersection.size / union.size (Jaccard similarity).
 */
export declare function computeKeywordOverlap(a: string, b: string): number;
/**
 * Create a GitHub issue with duplicate detection.
 * Returns the created issue number, or null if duplicate/failure.
 */
export declare function createIssue(opts: CreateIssueOpts): number | null;
/**
 * Close a GitHub issue by number.
 * Returns true on success.
 */
export declare function closeIssue(issueNumber: number, _reason?: string): boolean;
/**
 * Create an issue from a correction ledger entry.
 */
export declare function createFromCorrection(entry: CorrectionEntry): number | null;
/**
 * Create an issue from an escalation entry.
 * Only creates for high or critical severity.
 */
export declare function createFromEscalation(entry: EscalationEntry): number | null;
/**
 * Create an issue from an OpenSpec change proposal.
 */
export declare function createFromOpenSpec(changeId: string, summary?: string): number | null;
//# sourceMappingURL=issue_crud.d.ts.map