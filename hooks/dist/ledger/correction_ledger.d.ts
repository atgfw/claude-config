/**
 * Correction Debt Ledger
 *
 * Tracks every human corrective action as technical debt.
 * The goal is zero corrections - every manual intervention should
 * result in a hook that prevents recurrence.
 *
 * "Every human corrective action represents a failure: a missing hook,
 * an incomplete rule, or a flawed enforcement mechanism."
 */
import type { CorrectionEntry, CorrectionLedger } from '../types.js';
/**
 * Get the ledger file path
 */
export declare function getLedgerPath(): string;
/**
 * Load the correction ledger
 */
export declare function loadLedger(): CorrectionLedger;
/**
 * Save the correction ledger
 */
export declare function saveLedger(ledger: CorrectionLedger): void;
/**
 * Record a new correction (human intervention)
 */
export declare function recordCorrection(symptom: string, rootCause: string, hookToPrevent: string): CorrectionEntry;
/**
 * Mark a correction as having its hook implemented
 */
export declare function markHookImplemented(correctionId: string, hookName?: string): void;
/**
 * Record a recurrence of a previous correction
 */
export declare function recordRecurrence(correctionId: string): void;
/**
 * Find similar corrections (potential recurrences)
 */
export declare function findSimilarCorrections(symptom: string): CorrectionEntry[];
/**
 * Get unresolved corrections (no hook implemented)
 */
export declare function getUnresolvedCorrections(): CorrectionEntry[];
/**
 * Get corrections with recurrences
 */
export declare function getRecurringCorrections(): CorrectionEntry[];
/**
 * Get correction statistics
 */
export declare function getStats(): {
    total: number;
    resolved: number;
    unresolved: number;
    recurring: number;
    totalRecurrences: number;
};
/**
 * Generate a report of the correction ledger
 */
export declare function generateReport(): string;
/**
 * CLI command to interact with the ledger
 */
export declare function ledgerCommand(args: string[]): Promise<void>;
declare const _default: {
    loadLedger: typeof loadLedger;
    saveLedger: typeof saveLedger;
    recordCorrection: typeof recordCorrection;
    markHookImplemented: typeof markHookImplemented;
    recordRecurrence: typeof recordRecurrence;
    findSimilarCorrections: typeof findSimilarCorrections;
    getUnresolvedCorrections: typeof getUnresolvedCorrections;
    getRecurringCorrections: typeof getRecurringCorrections;
    getStats: typeof getStats;
    generateReport: typeof generateReport;
    ledgerCommand: typeof ledgerCommand;
};
export default _default;
//# sourceMappingURL=correction_ledger.d.ts.map