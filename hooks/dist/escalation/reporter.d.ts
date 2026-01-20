/**
 * Escalation Reporter
 *
 * Generates reports for session-start and other contexts.
 * Formats escalation data for LLM visibility.
 */
import type { EscalationRegistry, EscalationEntry } from '../types.js';
export interface EscalationReport {
    totalEscalations: number;
    pendingCount: number;
    patternsDetectedCount: number;
    highPriorityCount: number;
    actionNeeded: boolean;
    issues: string[];
    successes: string[];
    topItems: EscalationEntry[];
}
/**
 * Generate a full escalation report for session-start
 */
export declare function generateEscalationReport(registry?: EscalationRegistry): EscalationReport;
/**
 * Format escalation report for session-start output
 */
export declare function formatForSessionStart(registry?: EscalationRegistry): {
    issues: string[];
    successes: string[];
};
/**
 * Get actionable escalations for display
 */
export declare function getActionableForDisplay(limit?: number, registry?: EscalationRegistry): EscalationEntry[];
declare const _default: {
    generateEscalationReport: typeof generateEscalationReport;
    formatForSessionStart: typeof formatForSessionStart;
    getActionableForDisplay: typeof getActionableForDisplay;
};
export default _default;
//# sourceMappingURL=reporter.d.ts.map