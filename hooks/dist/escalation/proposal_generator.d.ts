/**
 * Proposal Generator
 *
 * Auto-generates OpenSpec proposals from escalation patterns.
 * Creates proposal.md, tasks.md, and spec.md files when
 * escalation thresholds are met.
 */
import type { EscalationEntry, EscalationRegistry } from '../types.js';
export interface GeneratedProposal {
    changeId: string;
    proposalPath: string;
    symptomHash: string;
    escalationIds: string[];
}
/**
 * Generate a URL-safe slug from a symptom
 */
export declare function generateSlug(symptom: string): string;
/**
 * Generate a unique change ID for the proposal
 */
export declare function generateChangeId(symptom: string): string;
/**
 * Generate proposal.md content from escalations
 */
export declare function generateProposalMd(escalations: EscalationEntry[]): string;
/**
 * Generate tasks.md content
 */
export declare function generateTasksMd(escalations: EscalationEntry[]): string;
/**
 * Generate spec.md content
 */
export declare function generateSpecMd(escalations: EscalationEntry[]): string;
/**
 * Get the OpenSpec changes directory
 */
export declare function getOpenSpecChangesDir(): string;
/**
 * Scaffold OpenSpec change directory structure
 */
export declare function scaffoldOpenSpecChange(changeId: string): string;
/**
 * Write proposal files to disk
 */
export declare function writeProposalFiles(changePath: string, escalations: EscalationEntry[]): void;
/**
 * Generate OpenSpec proposal from escalations with the given symptom hash
 */
export declare function generateProposal(symptomHash: string, registry?: EscalationRegistry): GeneratedProposal | null;
/**
 * Generate proposals for all patterns that need them
 */
export declare function generateAllPendingProposals(registry?: EscalationRegistry): GeneratedProposal[];
declare const _default: {
    generateSlug: typeof generateSlug;
    generateChangeId: typeof generateChangeId;
    generateProposalMd: typeof generateProposalMd;
    generateTasksMd: typeof generateTasksMd;
    generateSpecMd: typeof generateSpecMd;
    getOpenSpecChangesDir: typeof getOpenSpecChangesDir;
    scaffoldOpenSpecChange: typeof scaffoldOpenSpecChange;
    writeProposalFiles: typeof writeProposalFiles;
    generateProposal: typeof generateProposal;
    generateAllPendingProposals: typeof generateAllPendingProposals;
};
export default _default;
//# sourceMappingURL=proposal_generator.d.ts.map