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
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { getClaudeDir, log } from '../utils.js';
const REGISTRY_FILE = 'escalation-registry.json';
// ============================================================================
// Default Configuration
// ============================================================================
const DEFAULT_CONFIG = {
    patternThreshold: 3,
    crossProjectThreshold: 2,
    cooldownMinutes: 30,
    autoProposalEnabled: true,
    severityWeights: {
        critical: 10,
        high: 5,
        medium: 2,
        low: 1,
    },
};
// ============================================================================
// Path Utilities
// ============================================================================
/**
 * Get the registry file path
 */
export function getRegistryPath() {
    return path.join(getClaudeDir(), 'ledger', REGISTRY_FILE);
}
// ============================================================================
// Registry I/O
// ============================================================================
/**
 * Load the escalation registry
 */
export function loadRegistry() {
    const registryPath = getRegistryPath();
    if (fs.existsSync(registryPath)) {
        try {
            const content = fs.readFileSync(registryPath, 'utf-8');
            const parsed = JSON.parse(content);
            // Ensure config has all fields (merge with defaults)
            parsed.config = { ...DEFAULT_CONFIG, ...parsed.config };
            return parsed;
        }
        catch {
            log('[WARN] Could not parse escalation registry, creating fresh');
        }
    }
    return createEmptyRegistry();
}
/**
 * Save the escalation registry
 */
export function saveRegistry(registry) {
    const registryPath = getRegistryPath();
    const registryDir = path.dirname(registryPath);
    fs.mkdirSync(registryDir, { recursive: true });
    registry.lastUpdated = new Date().toISOString();
    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
}
/**
 * Create an empty registry with default config
 */
export function createEmptyRegistry() {
    return {
        escalations: {},
        symptomIndex: {},
        projectIndex: {},
        config: { ...DEFAULT_CONFIG },
        lastUpdated: new Date().toISOString(),
    };
}
// ============================================================================
// ID and Hash Generation
// ============================================================================
/**
 * Generate a unique ID for an escalation entry
 */
export function generateId() {
    return crypto.randomBytes(8).toString('hex');
}
/**
 * Generate a symptom hash for deduplication
 * Normalizes text: lowercase, remove punctuation, sort words, hash
 */
export function generateSymptomHash(symptom) {
    const normalized = symptom
        .toLowerCase()
        .replace(/[^\w\s]/g, '')
        .split(/\s+/)
        .filter((w) => w.length > 2)
        .sort()
        .join(' ');
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16);
}
// ============================================================================
// CRUD Operations
// ============================================================================
/**
 * Create a new escalation entry
 */
export function createEscalation(registry, params) {
    const id = generateId();
    const symptomHash = generateSymptomHash(params.symptom);
    const now = new Date().toISOString();
    const cooldownUntil = new Date(Date.now() + registry.config.cooldownMinutes * 60 * 1000).toISOString();
    const entry = {
        id,
        symptomHash,
        timestamp: now,
        projectPath: params.projectPath,
        projectName: params.projectName,
        symptom: params.symptom,
        context: params.context,
        proposedSolution: params.proposedSolution,
        category: params.category,
        severity: params.severity,
        status: 'pending',
        occurrenceCount: 1,
        crossProjectCount: 1,
        relatedProjects: [params.projectPath],
        relatedCorrectionIds: [],
        relatedHookNames: params.relatedHooks ?? [],
        lastEscalatedAt: now,
        cooldownUntil,
    };
    // Add to escalations
    registry.escalations[id] = entry;
    // Update symptom index
    const symptomIds = registry.symptomIndex[symptomHash] ?? [];
    symptomIds.push(id);
    registry.symptomIndex[symptomHash] = symptomIds;
    // Update project index
    const projectIds = registry.projectIndex[params.projectPath] ?? [];
    projectIds.push(id);
    registry.projectIndex[params.projectPath] = projectIds;
    return entry;
}
/**
 * Find escalations by symptom hash
 */
export function findBySymptomHash(registry, symptomHash) {
    const ids = registry.symptomIndex[symptomHash] ?? [];
    return ids
        .map((id) => registry.escalations[id])
        .filter((e) => e !== undefined);
}
/**
 * Find escalations by symptom hash and project path
 */
export function findBySymptomHashAndProject(registry, symptomHash, projectPath) {
    const entries = findBySymptomHash(registry, symptomHash);
    return entries.find((e) => e.projectPath === projectPath);
}
/**
 * Get escalation by ID
 */
export function getById(registry, id) {
    return registry.escalations[id];
}
/**
 * Get escalations by project path
 */
export function getByProject(registry, projectPath) {
    const ids = registry.projectIndex[projectPath] ?? [];
    return ids
        .map((id) => registry.escalations[id])
        .filter((e) => e !== undefined);
}
/**
 * Increment occurrence count for an existing escalation
 */
export function incrementOccurrence(registry, id) {
    const entry = registry.escalations[id];
    if (!entry)
        return undefined;
    entry.occurrenceCount += 1;
    entry.lastEscalatedAt = new Date().toISOString();
    entry.cooldownUntil = new Date(Date.now() + registry.config.cooldownMinutes * 60 * 1000).toISOString();
    return entry;
}
/**
 * Add a related project to an escalation
 */
export function addRelatedProject(registry, id, projectPath) {
    const entry = registry.escalations[id];
    if (!entry)
        return undefined;
    if (!entry.relatedProjects.includes(projectPath)) {
        entry.relatedProjects.push(projectPath);
        entry.crossProjectCount = entry.relatedProjects.length;
    }
    entry.lastEscalatedAt = new Date().toISOString();
    return entry;
}
/**
 * Update escalation status
 */
export function updateStatus(registry, id, status, metadata) {
    const entry = registry.escalations[id];
    if (!entry)
        return undefined;
    entry.status = status;
    if (status === 'resolved' || status === 'hook-implemented') {
        entry.resolvedAt = new Date().toISOString();
    }
    if (metadata) {
        if (metadata.resolutionNote)
            entry.resolutionNote = metadata.resolutionNote;
        if (metadata.rejectionReason)
            entry.rejectionReason = metadata.rejectionReason;
        if (metadata.generatedProposalPath)
            entry.generatedProposalPath = metadata.generatedProposalPath;
        if (metadata.implementedHookName)
            entry.implementedHookName = metadata.implementedHookName;
    }
    return entry;
}
/**
 * Link a correction ID to an escalation
 */
export function linkToCorrection(registry, escalationId, correctionId) {
    const entry = registry.escalations[escalationId];
    if (entry && !entry.relatedCorrectionIds.includes(correctionId)) {
        entry.relatedCorrectionIds.push(correctionId);
    }
}
/**
 * Link a hook name to an escalation
 */
export function linkToHook(registry, escalationId, hookName) {
    const entry = registry.escalations[escalationId];
    if (entry && !entry.relatedHookNames.includes(hookName)) {
        entry.relatedHookNames.push(hookName);
    }
}
// ============================================================================
// Query Operations
// ============================================================================
/**
 * Get all pending escalations
 */
export function getPendingEscalations(registry) {
    return Object.values(registry.escalations).filter((e) => e.status === 'pending');
}
/**
 * Get escalations with pattern detected status
 */
export function getPatternDetectedEscalations(registry) {
    return Object.values(registry.escalations).filter((e) => e.status === 'pattern-detected');
}
/**
 * Get high priority escalations (high or critical severity)
 */
export function getHighPriorityEscalations(registry) {
    return Object.values(registry.escalations).filter((e) => (e.severity === 'high' || e.severity === 'critical') &&
        e.status !== 'resolved' &&
        e.status !== 'rejected');
}
/**
 * Get actionable escalations (pending or pattern-detected)
 */
export function getActionableEscalations(registry) {
    return Object.values(registry.escalations).filter((e) => e.status === 'pending' || e.status === 'pattern-detected');
}
/**
 * Get unresolved escalations
 */
export function getUnresolvedEscalations(registry) {
    return Object.values(registry.escalations).filter((e) => e.status !== 'resolved' && e.status !== 'rejected' && e.status !== 'hook-implemented');
}
// ============================================================================
// Threshold Checking
// ============================================================================
/**
 * Check if pattern threshold is met for a symptom hash
 */
export function checkPatternThreshold(registry, symptomHash) {
    const entries = findBySymptomHash(registry, symptomHash);
    if (entries.length === 0)
        return false;
    // Get the primary entry (first one)
    const primary = entries[0];
    if (!primary)
        return false;
    // Check occurrence threshold
    if (primary.occurrenceCount >= registry.config.patternThreshold) {
        return true;
    }
    // Check cross-project threshold
    if (primary.crossProjectCount >= registry.config.crossProjectThreshold) {
        return true;
    }
    return false;
}
/**
 * Check if escalation is in cooldown
 */
export function isInCooldown(registry, symptomHash, projectPath, severity) {
    // High/critical severity bypasses cooldown
    if (severity === 'high' || severity === 'critical') {
        return false;
    }
    const entry = findBySymptomHashAndProject(registry, symptomHash, projectPath);
    if (!entry || !entry.cooldownUntil) {
        return false;
    }
    const now = new Date();
    const cooldownEnd = new Date(entry.cooldownUntil);
    return now < cooldownEnd;
}
// ============================================================================
// Priority Calculation
// ============================================================================
/**
 * Calculate priority score for an escalation
 */
export function calculatePriority(entry, config) {
    const severityWeight = config.severityWeights[entry.severity] || 1;
    const occurrenceBonus = Math.min(entry.occurrenceCount, 10);
    const projectBonus = entry.crossProjectCount * 3;
    // Age bonus: older than 7 days gets +2
    const ageMs = Date.now() - new Date(entry.timestamp).getTime();
    const ageDays = ageMs / (1000 * 60 * 60 * 24);
    const ageBonus = ageDays > 7 ? 2 : 0;
    return severityWeight * 10 + occurrenceBonus + projectBonus + ageBonus;
}
/**
 * Get escalations sorted by priority (highest first)
 */
export function getByPriority(registry) {
    const entries = getActionableEscalations(registry);
    return entries.sort((a, b) => calculatePriority(b, registry.config) - calculatePriority(a, registry.config));
}
// ============================================================================
// Statistics
// ============================================================================
/**
 * Get escalation statistics
 */
export function getStats(registry) {
    const entries = Object.values(registry.escalations);
    const byCategory = {
        governance: 0,
        testing: 0,
        tooling: 0,
        pattern: 0,
        performance: 0,
        security: 0,
        documentation: 0,
        meta: 0,
    };
    const bySeverity = {
        low: 0,
        medium: 0,
        high: 0,
        critical: 0,
    };
    for (const entry of entries) {
        byCategory[entry.category]++;
        bySeverity[entry.severity]++;
    }
    return {
        total: entries.length,
        pending: entries.filter((e) => e.status === 'pending').length,
        patternDetected: entries.filter((e) => e.status === 'pattern-detected').length,
        proposalGenerated: entries.filter((e) => e.status === 'proposal-generated').length,
        hookImplemented: entries.filter((e) => e.status === 'hook-implemented').length,
        resolved: entries.filter((e) => e.status === 'resolved').length,
        rejected: entries.filter((e) => e.status === 'rejected').length,
        highPriority: entries.filter((e) => (e.severity === 'high' || e.severity === 'critical') && e.status === 'pending').length,
        byCategory,
        bySeverity,
    };
}
// ============================================================================
// Exports
// ============================================================================
export default {
    getRegistryPath,
    loadRegistry,
    saveRegistry,
    createEmptyRegistry,
    generateId,
    generateSymptomHash,
    createEscalation,
    findBySymptomHash,
    findBySymptomHashAndProject,
    getById,
    getByProject,
    incrementOccurrence,
    addRelatedProject,
    updateStatus,
    linkToCorrection,
    linkToHook,
    getPendingEscalations,
    getPatternDetectedEscalations,
    getHighPriorityEscalations,
    getActionableEscalations,
    getUnresolvedEscalations,
    checkPatternThreshold,
    isInCooldown,
    calculatePriority,
    getByPriority,
    getStats,
};
//# sourceMappingURL=escalation_registry.js.map