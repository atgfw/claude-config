/**
 * Escalate Utility
 *
 * Public API for child projects and hooks to record escalations.
 * Handles deduplication, cooldown, pattern detection, and proposal triggering.
 */
import * as path from 'node:path';
import { log } from '../utils.js';
import { loadRegistry, saveRegistry, generateSymptomHash, createEscalation, findBySymptomHash, findBySymptomHashAndProject, incrementOccurrence, addRelatedProject, updateStatus, checkPatternThreshold, isInCooldown, } from '../ledger/escalation_registry.js';
// ============================================================================
// Project Path Detection
// ============================================================================
/**
 * Auto-detect the current project path from cwd
 */
export function getProjectPath() {
    return process.cwd();
}
/**
 * Extract project name from path
 */
export function getProjectName(projectPath) {
    return path.basename(projectPath);
}
// ============================================================================
// Main Escalate Function
// ============================================================================
/**
 * Record an escalation from a child project or hook
 *
 * This is the main public API for the escalation system.
 * It handles:
 * - Symptom hash generation for deduplication
 * - Cooldown enforcement (prevents spam)
 * - Cross-project pattern detection
 * - Status transitions when thresholds are met
 *
 * @param params Escalation parameters
 * @returns Result containing the escalation entry and metadata
 */
export function escalate(params) {
    const projectPath = getProjectPath();
    const projectName = getProjectName(projectPath);
    return escalateWithProject(params, projectPath, projectName);
}
/**
 * Record an escalation with explicit project path
 * (Used for testing and when auto-detection isn't appropriate)
 */
export function escalateWithProject(params, projectPath, projectName) {
    const registry = loadRegistry();
    const symptomHash = generateSymptomHash(params.symptom);
    // Check for existing escalation with same symptom
    const existingEntries = findBySymptomHash(registry, symptomHash);
    const existingInProject = findBySymptomHashAndProject(registry, symptomHash, projectPath);
    let entry;
    let isNovel = true;
    let patternDetected = false;
    if (existingInProject) {
        // Same symptom from same project - check cooldown
        if (isInCooldown(registry, symptomHash, projectPath, params.severity)) {
            // In cooldown, deduplicate
            log(`[ESCALATION] Deduplicated (in cooldown): ${params.symptom.substring(0, 50)}...`);
            return {
                id: existingInProject.id,
                isNovel: false,
                novelCount: existingEntries.length,
                escalation: existingInProject,
                patternDetected: checkPatternThreshold(registry, symptomHash),
            };
        }
        // Cooldown expired or high severity - increment occurrence
        incrementOccurrence(registry, existingInProject.id);
        entry = existingInProject;
        isNovel = false;
        log(`[ESCALATION] Incremented occurrence (${entry.occurrenceCount}): ${params.symptom.substring(0, 50)}...`);
    }
    else if (existingEntries.length > 0) {
        // Same symptom from different project - cross-project pattern
        const primaryEntry = existingEntries[0];
        if (!primaryEntry)
            throw new Error('Unexpected: existingEntries not empty but first element undefined');
        addRelatedProject(registry, primaryEntry.id, projectPath);
        entry = primaryEntry;
        isNovel = false;
        log(`[ESCALATION] Cross-project pattern detected (${entry.crossProjectCount} projects): ${params.symptom.substring(0, 50)}...`);
    }
    else {
        // New escalation
        entry = createEscalation(registry, {
            symptom: params.symptom,
            context: params.context,
            proposedSolution: params.proposedSolution,
            category: params.category,
            severity: params.severity,
            projectPath,
            projectName,
            relatedHooks: params.relatedHooks,
        });
        log(`[ESCALATION] New escalation recorded: ${params.symptom.substring(0, 50)}...`);
    }
    // Check if pattern threshold is now met
    if (checkPatternThreshold(registry, symptomHash)) {
        patternDetected = true;
        if (entry.status === 'pending') {
            updateStatus(registry, entry.id, 'pattern-detected');
            log(`[ESCALATION] Pattern threshold met - status updated to pattern-detected`);
        }
    }
    // Save registry
    saveRegistry(registry);
    return {
        id: entry.id,
        isNovel,
        novelCount: findBySymptomHash(registry, symptomHash).length,
        escalation: entry,
        patternDetected,
    };
}
// ============================================================================
// Hook-Specific Escalate Function
// ============================================================================
/**
 * Record an escalation from a hook
 *
 * Automatically sets the hook name in relatedHooks and
 * uses 'tooling' category by default.
 *
 * @param hookName Name of the hook recording the escalation
 * @param params Escalation parameters (category defaults to 'tooling')
 * @returns Result containing the escalation entry and metadata
 */
export function escalateFromHook(hookName, params) {
    return escalate({
        ...params,
        category: params.category ?? 'tooling',
        relatedHooks: [hookName],
    });
}
// ============================================================================
// Convenience Functions
// ============================================================================
/**
 * Quick escalation for governance issues
 */
export function escalateGovernance(symptom, context, proposedSolution, severity = 'medium') {
    return escalate({
        symptom,
        context,
        proposedSolution,
        category: 'governance',
        severity,
    });
}
/**
 * Quick escalation for testing issues
 */
export function escalateTesting(symptom, context, proposedSolution, severity = 'medium') {
    return escalate({
        symptom,
        context,
        proposedSolution,
        category: 'testing',
        severity,
    });
}
/**
 * Quick escalation for tooling issues
 */
export function escalateTooling(symptom, context, proposedSolution, severity = 'medium') {
    return escalate({
        symptom,
        context,
        proposedSolution,
        category: 'tooling',
        severity,
    });
}
/**
 * Quick escalation for security issues (high severity default)
 */
export function escalateSecurity(symptom, context, proposedSolution, severity = 'high') {
    return escalate({
        symptom,
        context,
        proposedSolution,
        category: 'security',
        severity,
    });
}
/**
 * Meta-escalation for issues with the escalation system itself
 */
export function escalateMeta(symptom, context, proposedSolution, severity = 'medium') {
    return escalate({
        symptom,
        context,
        proposedSolution,
        category: 'meta',
        severity,
    });
}
// ============================================================================
// Exports
// ============================================================================
export default {
    getProjectPath,
    getProjectName,
    escalate,
    escalateWithProject,
    escalateFromHook,
    escalateGovernance,
    escalateTesting,
    escalateTooling,
    escalateSecurity,
    escalateMeta,
};
//# sourceMappingURL=escalate.js.map