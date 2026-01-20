/**
 * Escalation Registry
 *
 * Central registry for child project escalations.
 * Enables bidirectional communication: Child -> Global (via escalation)
 *
 * Features:
 * - Symptom hash deduplication
 * - Cross-project pattern detection
 * - Cooldown enforcement
 * - Auto-proposal triggering
 */
import type { EscalationEntry, EscalationRegistry, EscalationConfig, EscalationCategory, EscalationSeverity, EscalationStatus } from '../types.js';
/**
 * Get the registry file path
 */
export declare function getRegistryPath(): string;
/**
 * Load the escalation registry
 */
export declare function loadRegistry(): EscalationRegistry;
/**
 * Save the escalation registry
 */
export declare function saveRegistry(registry: EscalationRegistry): void;
/**
 * Create an empty registry with default config
 */
export declare function createEmptyRegistry(): EscalationRegistry;
/**
 * Generate a unique ID for an escalation entry
 */
export declare function generateId(): string;
/**
 * Generate a symptom hash for deduplication
 * Normalizes text: lowercase, remove punctuation, sort words, hash
 */
export declare function generateSymptomHash(symptom: string): string;
/**
 * Create a new escalation entry
 */
export declare function createEscalation(registry: EscalationRegistry, params: {
    symptom: string;
    context: string;
    proposedSolution: string;
    category: EscalationCategory;
    severity: EscalationSeverity;
    projectPath: string;
    projectName: string;
    relatedHooks?: string[];
}): EscalationEntry;
/**
 * Find escalations by symptom hash
 */
export declare function findBySymptomHash(registry: EscalationRegistry, symptomHash: string): EscalationEntry[];
/**
 * Find escalations by symptom hash and project path
 */
export declare function findBySymptomHashAndProject(registry: EscalationRegistry, symptomHash: string, projectPath: string): EscalationEntry | undefined;
/**
 * Get escalation by ID
 */
export declare function getById(registry: EscalationRegistry, id: string): EscalationEntry | undefined;
/**
 * Get escalations by project path
 */
export declare function getByProject(registry: EscalationRegistry, projectPath: string): EscalationEntry[];
/**
 * Increment occurrence count for an existing escalation
 */
export declare function incrementOccurrence(registry: EscalationRegistry, id: string): EscalationEntry | undefined;
/**
 * Add a related project to an escalation
 */
export declare function addRelatedProject(registry: EscalationRegistry, id: string, projectPath: string): EscalationEntry | undefined;
/**
 * Update escalation status
 */
export declare function updateStatus(registry: EscalationRegistry, id: string, status: EscalationStatus, metadata?: {
    resolutionNote?: string;
    rejectionReason?: string;
    generatedProposalPath?: string;
    implementedHookName?: string;
}): EscalationEntry | undefined;
/**
 * Link a correction ID to an escalation
 */
export declare function linkToCorrection(registry: EscalationRegistry, escalationId: string, correctionId: string): void;
/**
 * Link a hook name to an escalation
 */
export declare function linkToHook(registry: EscalationRegistry, escalationId: string, hookName: string): void;
/**
 * Get all pending escalations
 */
export declare function getPendingEscalations(registry: EscalationRegistry): EscalationEntry[];
/**
 * Get escalations with pattern detected status
 */
export declare function getPatternDetectedEscalations(registry: EscalationRegistry): EscalationEntry[];
/**
 * Get high priority escalations (high or critical severity)
 */
export declare function getHighPriorityEscalations(registry: EscalationRegistry): EscalationEntry[];
/**
 * Get actionable escalations (pending or pattern-detected)
 */
export declare function getActionableEscalations(registry: EscalationRegistry): EscalationEntry[];
/**
 * Get unresolved escalations
 */
export declare function getUnresolvedEscalations(registry: EscalationRegistry): EscalationEntry[];
/**
 * Check if pattern threshold is met for a symptom hash
 */
export declare function checkPatternThreshold(registry: EscalationRegistry, symptomHash: string): boolean;
/**
 * Check if escalation is in cooldown
 */
export declare function isInCooldown(registry: EscalationRegistry, symptomHash: string, projectPath: string, severity: EscalationSeverity): boolean;
/**
 * Calculate priority score for an escalation
 */
export declare function calculatePriority(entry: EscalationEntry, config: EscalationConfig): number;
/**
 * Get escalations sorted by priority (highest first)
 */
export declare function getByPriority(registry: EscalationRegistry): EscalationEntry[];
/**
 * Get escalation statistics
 */
export declare function getStats(registry: EscalationRegistry): {
    total: number;
    pending: number;
    patternDetected: number;
    proposalGenerated: number;
    hookImplemented: number;
    resolved: number;
    rejected: number;
    highPriority: number;
    byCategory: Record<EscalationCategory, number>;
    bySeverity: Record<EscalationSeverity, number>;
};
declare const _default: {
    getRegistryPath: typeof getRegistryPath;
    loadRegistry: typeof loadRegistry;
    saveRegistry: typeof saveRegistry;
    createEmptyRegistry: typeof createEmptyRegistry;
    generateId: typeof generateId;
    generateSymptomHash: typeof generateSymptomHash;
    createEscalation: typeof createEscalation;
    findBySymptomHash: typeof findBySymptomHash;
    findBySymptomHashAndProject: typeof findBySymptomHashAndProject;
    getById: typeof getById;
    getByProject: typeof getByProject;
    incrementOccurrence: typeof incrementOccurrence;
    addRelatedProject: typeof addRelatedProject;
    updateStatus: typeof updateStatus;
    linkToCorrection: typeof linkToCorrection;
    linkToHook: typeof linkToHook;
    getPendingEscalations: typeof getPendingEscalations;
    getPatternDetectedEscalations: typeof getPatternDetectedEscalations;
    getHighPriorityEscalations: typeof getHighPriorityEscalations;
    getActionableEscalations: typeof getActionableEscalations;
    getUnresolvedEscalations: typeof getUnresolvedEscalations;
    checkPatternThreshold: typeof checkPatternThreshold;
    isInCooldown: typeof isInCooldown;
    calculatePriority: typeof calculatePriority;
    getByPriority: typeof getByPriority;
    getStats: typeof getStats;
};
export default _default;
//# sourceMappingURL=escalation_registry.d.ts.map