/**
 * Proposal Generator
 *
 * Auto-generates OpenSpec proposals from escalation patterns.
 * Creates proposal.md, tasks.md, and spec.md files when
 * escalation thresholds are met.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getClaudeDir, log } from '../utils.js';
import { loadRegistry, saveRegistry, updateStatus, findBySymptomHash, } from '../ledger/escalation_registry.js';
import { getPatternsNeedingProposals } from './pattern_detector.js';
// ============================================================================
// Slug Generation
// ============================================================================
/**
 * Generate a URL-safe slug from a symptom
 */
export function generateSlug(symptom) {
    return symptom
        .toLowerCase()
        .replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .substring(0, 40)
        .replace(/^-|-$/g, '');
}
/**
 * Generate a unique change ID for the proposal
 */
export function generateChangeId(symptom) {
    const slug = generateSlug(symptom);
    return `auto-${slug}`;
}
// ============================================================================
// Template Generation
// ============================================================================
/**
 * Generate proposal.md content from escalations
 */
export function generateProposalMd(escalations) {
    const primary = escalations[0];
    if (!primary)
        return '';
    const now = new Date().toISOString().split('T')[0];
    const changeId = generateChangeId(primary.symptom);
    // Deduplicate symptoms
    const symptoms = [...new Set(escalations.map((e) => e.symptom))];
    // Deduplicate solutions
    const solutions = [...new Set(escalations.map((e) => e.proposedSolution))];
    // Collect all projects
    const allProjects = new Set();
    for (const e of escalations) {
        for (const p of e.relatedProjects) {
            allProjects.add(p);
        }
    }
    // Build evidence table
    const evidenceRows = escalations
        .map((e) => `| ${e.id.substring(0, 8)} | ${e.projectName} | ${e.severity} | ${e.occurrenceCount} | ${e.timestamp.split('T')[0]} |`)
        .join('\n');
    return `# Proposal: ${primary.symptom.substring(0, 60)}

**Change ID:** \`${changeId}\`
**Status:** Auto-Generated from Escalations
**Created:** ${now}
**Source Escalations:** ${escalations.length}

## Summary

This proposal was automatically generated when escalation pattern threshold was met.

${symptoms.length > 1 ? `Multiple related symptoms detected:\n${symptoms.map((s) => `- ${s}`).join('\n')}` : `Symptom: ${primary.symptom}`}

## Problem Statement

${primary.symptom}

**Context:** ${primary.context}

## Affected Projects

${[...allProjects].map((p) => `- \`${p}\``).join('\n')}

## Proposed Solutions

${solutions.map((s) => `- ${s}`).join('\n')}

## Escalation Evidence

| ID | Project | Severity | Occurrences | First Reported |
|----|---------|----------|-------------|----------------|
${evidenceRows}

## Category

- **Category:** ${primary.category}
- **Max Severity:** ${escalations.reduce((max, e) => {
        const order = ['critical', 'high', 'medium', 'low'];
        return order.indexOf(e.severity) < order.indexOf(max) ? e.severity : max;
    }, 'low')}
- **Total Occurrences:** ${escalations.reduce((sum, e) => sum + e.occurrenceCount, 0)}
- **Cross-Project Count:** ${allProjects.size}

## Next Steps

1. Review aggregated escalation data above
2. Design hook to prevent recurrence
3. Implement with TDD
4. Mark source escalations as resolved

## Related

- Source escalation IDs: ${escalations.map((e) => e.id.substring(0, 8)).join(', ')}
${primary.relatedCorrectionIds.length > 0 ? `- Related corrections: ${primary.relatedCorrectionIds.join(', ')}` : ''}
${primary.relatedHookNames.length > 0 ? `- Related hooks: ${primary.relatedHookNames.join(', ')}` : ''}
`;
}
/**
 * Generate tasks.md content
 */
export function generateTasksMd(escalations) {
    const primary = escalations[0];
    if (!primary)
        return '';
    return `# Tasks: Auto-Generated from Escalations

## Phase 1: Investigation

- [ ] Review all source escalations
- [ ] Identify root cause
- [ ] Determine if hook is appropriate solution
- [ ] Identify existing related hooks

## Phase 2: Design

- [ ] Design hook logic
- [ ] Determine hook event type (PreToolUse, PostToolUse, etc.)
- [ ] Define hook output format
- [ ] Document expected behavior

## Phase 3: Implementation

- [ ] Create TypeScript hook file
- [ ] Write Vitest tests (TDD)
- [ ] Implement hook logic
- [ ] Run tests to verify

## Phase 4: Integration

- [ ] Register hook in settings.json
- [ ] Update hooks/src/index.ts exports
- [ ] Test in development environment
- [ ] Verify across affected projects

## Phase 5: Resolution

- [ ] Mark source escalations as hook-implemented
- [ ] Update correction ledger if applicable
- [ ] Archive this proposal

## Source Escalations

${escalations.map((e) => `- [ ] [${e.id.substring(0, 8)}] ${e.symptom.substring(0, 50)}...`).join('\n')}
`;
}
/**
 * Generate spec.md content
 */
export function generateSpecMd(escalations) {
    const primary = escalations[0];
    if (!primary)
        return '';
    const slug = generateSlug(primary.symptom);
    return `# Auto-Generated Specification: ${slug}

## ADDED Requirements

### Requirement: Prevention Hook for ${primary.symptom.substring(0, 40)}

The system SHALL implement a hook that prevents the following issue from recurring:

**Problem:** ${primary.symptom}

**Context:** ${primary.context}

#### Scenario: Prevent recurrence
- **WHEN** the condition that triggers this issue is detected
- **THEN** the hook SHALL block or warn appropriately
- **AND** log a message explaining why

#### Scenario: Allow valid operations
- **WHEN** the operation does not match the problematic pattern
- **THEN** the hook SHALL allow the operation to proceed

### Requirement: Logging and Visibility

The hook SHALL log its decisions for LLM visibility.

#### Scenario: Log blocked action
- **WHEN** the hook blocks an action
- **THEN** output to stderr explaining the block reason

#### Scenario: Log allowed action
- **WHEN** the hook allows an action (optionally)
- **THEN** no output or brief confirmation

## Implementation Notes

- Category: ${primary.category}
- Suggested hook event: ${suggestHookEvent(primary.category)}
- Related hooks: ${primary.relatedHookNames.join(', ') || 'None'}
`;
}
/**
 * Suggest hook event type based on category
 */
function suggestHookEvent(category) {
    switch (category) {
        case 'governance':
        case 'tooling':
            return 'PreToolUse';
        case 'security':
            return 'PreToolUse or PostToolUse';
        case 'testing':
            return 'PreToolUse';
        case 'pattern':
            return 'PostToolUse';
        case 'performance':
            return 'PostToolUse';
        case 'documentation':
            return 'PostToolUse';
        default:
            return 'PreToolUse';
    }
}
// ============================================================================
// File System Operations
// ============================================================================
/**
 * Get the OpenSpec changes directory
 */
export function getOpenSpecChangesDir() {
    return path.join(getClaudeDir(), 'openspec', 'changes');
}
/**
 * Scaffold OpenSpec change directory structure
 */
export function scaffoldOpenSpecChange(changeId) {
    const changesDir = getOpenSpecChangesDir();
    const changePath = path.join(changesDir, changeId);
    const specsPath = path.join(changePath, 'specs', changeId);
    fs.mkdirSync(specsPath, { recursive: true });
    return changePath;
}
/**
 * Write proposal files to disk
 */
export function writeProposalFiles(changePath, escalations) {
    const proposalMd = generateProposalMd(escalations);
    const tasksMd = generateTasksMd(escalations);
    const specMd = generateSpecMd(escalations);
    const changeId = path.basename(changePath);
    fs.writeFileSync(path.join(changePath, 'proposal.md'), proposalMd);
    fs.writeFileSync(path.join(changePath, 'tasks.md'), tasksMd);
    fs.writeFileSync(path.join(changePath, 'specs', changeId, 'spec.md'), specMd);
}
// ============================================================================
// Main Generation Function
// ============================================================================
/**
 * Generate OpenSpec proposal from escalations with the given symptom hash
 */
export function generateProposal(symptomHash, registry) {
    const reg = registry ?? loadRegistry();
    const escalations = findBySymptomHash(reg, symptomHash);
    if (escalations.length === 0) {
        log(`[PROPOSAL] No escalations found for symptom hash: ${symptomHash}`);
        return null;
    }
    const primary = escalations[0];
    if (!primary)
        return null;
    // Skip meta-escalations
    if (primary.category === 'meta') {
        log(`[PROPOSAL] Skipping meta-escalation: ${primary.symptom.substring(0, 50)}...`);
        return null;
    }
    // Skip if already has proposal
    if (primary.generatedProposalPath) {
        log(`[PROPOSAL] Proposal already exists: ${primary.generatedProposalPath}`);
        return null;
    }
    const changeId = generateChangeId(primary.symptom);
    const changePath = scaffoldOpenSpecChange(changeId);
    try {
        writeProposalFiles(changePath, escalations);
        // Update all escalations with proposal path
        for (const e of escalations) {
            updateStatus(reg, e.id, 'proposal-generated', {
                generatedProposalPath: changePath,
            });
        }
        if (!registry) {
            saveRegistry(reg);
        }
        log(`[PROPOSAL] Generated proposal: ${changePath}`);
        return {
            changeId,
            proposalPath: changePath,
            symptomHash,
            escalationIds: escalations.map((e) => e.id),
        };
    }
    catch (error) {
        log(`[PROPOSAL] Error generating proposal: ${error.message}`);
        return null;
    }
}
/**
 * Generate proposals for all patterns that need them
 */
export function generateAllPendingProposals(registry) {
    const reg = registry ?? loadRegistry();
    const patterns = getPatternsNeedingProposals(reg);
    const proposals = [];
    for (const pattern of patterns) {
        const proposal = generateProposal(pattern.symptomHash, reg);
        if (proposal) {
            proposals.push(proposal);
        }
    }
    if (!registry && proposals.length > 0) {
        saveRegistry(reg);
    }
    return proposals;
}
// ============================================================================
// Exports
// ============================================================================
export default {
    generateSlug,
    generateChangeId,
    generateProposalMd,
    generateTasksMd,
    generateSpecMd,
    getOpenSpecChangesDir,
    scaffoldOpenSpecChange,
    writeProposalFiles,
    generateProposal,
    generateAllPendingProposals,
};
//# sourceMappingURL=proposal_generator.js.map