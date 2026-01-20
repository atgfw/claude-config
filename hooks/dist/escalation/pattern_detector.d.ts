/**
 * Pattern Detector
 *
 * Advanced pattern detection for escalations.
 * Identifies recurring issues, groups similar escalations,
 * and determines when auto-proposals should be triggered.
 */
import type { EscalationEntry, EscalationRegistry, EscalationConfig } from '../types.js';
export interface DetectedPattern {
    symptomHash: string;
    primarySymptom: string;
    occurrenceCount: number;
    crossProjectCount: number;
    projects: string[];
    entries: EscalationEntry[];
    priority: number;
    shouldTriggerProposal: boolean;
}
export interface EscalationGroup {
    groupId: string;
    category: string;
    entries: EscalationEntry[];
    totalOccurrences: number;
    totalProjects: number;
}
export interface PatternSummary {
    totalPatterns: number;
    patternsNeedingProposals: number;
    topPatterns: DetectedPattern[];
    byCategory: Record<string, number>;
}
/**
 * Detect all patterns in the registry
 * Groups escalations by symptom hash and identifies patterns
 */
export declare function detectPatterns(registry?: EscalationRegistry): DetectedPattern[];
/**
 * Check if a symptom hash should trigger auto-proposal
 */
export declare function shouldTriggerProposal(symptomHash: string, registry?: EscalationRegistry): boolean;
/**
 * Get patterns that need proposals
 */
export declare function getPatternsNeedingProposals(registry?: EscalationRegistry): DetectedPattern[];
/**
 * Calculate priority for an escalation
 * Higher score = higher priority
 */
export declare function calculatePatternPriority(entry: EscalationEntry, config: EscalationConfig): number;
/**
 * Group escalations by category
 */
export declare function groupByCategory(registry?: EscalationRegistry): EscalationGroup[];
/**
 * Group escalations by severity
 */
export declare function groupBySeverity(registry?: EscalationRegistry): EscalationGroup[];
/**
 * Group similar escalations by symptom similarity
 * Uses word overlap for fuzzy matching
 */
export declare function groupBySimilarity(threshold?: number, registry?: EscalationRegistry): EscalationGroup[];
/**
 * Calculate similarity between two symptoms using word overlap
 * Returns value between 0 and 1
 */
export declare function calculateSymptomSimilarity(symptom1: string, symptom2: string): number;
/**
 * Generate a pattern summary
 */
export declare function getPatternSummary(registry?: EscalationRegistry): PatternSummary;
declare const _default: {
    detectPatterns: typeof detectPatterns;
    shouldTriggerProposal: typeof shouldTriggerProposal;
    getPatternsNeedingProposals: typeof getPatternsNeedingProposals;
    calculatePatternPriority: typeof calculatePatternPriority;
    groupByCategory: typeof groupByCategory;
    groupBySeverity: typeof groupBySeverity;
    groupBySimilarity: typeof groupBySimilarity;
    calculateSymptomSimilarity: typeof calculateSymptomSimilarity;
    getPatternSummary: typeof getPatternSummary;
};
export default _default;
//# sourceMappingURL=pattern_detector.d.ts.map