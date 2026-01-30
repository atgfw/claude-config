/**
 * Pattern Detector
 *
 * Advanced pattern detection for escalations.
 * Identifies recurring issues, groups similar escalations,
 * and determines when auto-proposals should be triggered.
 */

import {
  loadRegistry,
  findBySymptomHash,
  calculatePriority,
} from '../ledger/escalation_registry.js';
import type { EscalationEntry, EscalationRegistry, EscalationConfig } from '../types.js';

// ============================================================================
// Pattern Detection Types
// ============================================================================

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

// ============================================================================
// Pattern Detection Functions
// ============================================================================

/**
 * Detect all patterns in the registry
 * Groups escalations by symptom hash and identifies patterns
 */
export function detectPatterns(registry?: EscalationRegistry): DetectedPattern[] {
  const reg = registry ?? loadRegistry();
  const patterns: Map<string, DetectedPattern> = new Map();

  // Group entries by symptom hash
  for (const entry of Object.values(reg.escalations)) {
    if (!patterns.has(entry.symptomHash)) {
      patterns.set(entry.symptomHash, {
        symptomHash: entry.symptomHash,
        primarySymptom: entry.symptom,
        occurrenceCount: entry.occurrenceCount,
        crossProjectCount: entry.crossProjectCount,
        projects: [...entry.relatedProjects],
        entries: [entry],
        priority: calculatePriority(entry, reg.config),
        shouldTriggerProposal: shouldTriggerProposal(entry.symptomHash, reg),
      });
    } else {
      const pattern = patterns.get(entry.symptomHash);
      if (!pattern) continue;
      pattern.entries.push(entry);
      // Update with latest counts
      if (entry.occurrenceCount > pattern.occurrenceCount) {
        pattern.occurrenceCount = entry.occurrenceCount;
      }
      if (entry.crossProjectCount > pattern.crossProjectCount) {
        pattern.crossProjectCount = entry.crossProjectCount;
        pattern.projects = [...entry.relatedProjects];
      }
      // Recalculate priority with best entry
      const maxPriority = Math.max(...pattern.entries.map((e) => calculatePriority(e, reg.config)));
      pattern.priority = maxPriority;
    }
  }

  return Array.from(patterns.values()).sort((a, b) => b.priority - a.priority);
}

/**
 * Check if a symptom hash should trigger auto-proposal
 */
export function shouldTriggerProposal(symptomHash: string, registry?: EscalationRegistry): boolean {
  const reg = registry ?? loadRegistry();
  const entries = findBySymptomHash(reg, symptomHash);

  if (entries.length === 0) return false;

  const primary = entries[0];
  if (!primary) return false;

  // Skip if already has proposal generated
  if (primary.status === 'proposal-generated' || primary.generatedProposalPath) {
    return false;
  }

  // Skip if already resolved/implemented
  if (primary.status === 'resolved' || primary.status === 'hook-implemented') {
    return false;
  }

  // Skip meta-escalations (they need human review)
  if (primary.category === 'meta') {
    return false;
  }

  // Check occurrence threshold
  if (primary.occurrenceCount >= reg.config.patternThreshold) {
    return true;
  }

  // Check cross-project threshold
  if (primary.crossProjectCount >= reg.config.crossProjectThreshold) {
    return true;
  }

  return false;
}

/**
 * Get patterns that need proposals
 */
export function getPatternsNeedingProposals(registry?: EscalationRegistry): DetectedPattern[] {
  const patterns = detectPatterns(registry);
  return patterns.filter((p) => p.shouldTriggerProposal);
}

/**
 * Calculate priority for an escalation
 * Higher score = higher priority
 */
export function calculatePatternPriority(entry: EscalationEntry, config: EscalationConfig): number {
  return calculatePriority(entry, config);
}

// ============================================================================
// Grouping Functions
// ============================================================================

/**
 * Group escalations by category
 */
export function groupByCategory(registry?: EscalationRegistry): EscalationGroup[] {
  const reg = registry ?? loadRegistry();
  const groups: Map<string, EscalationGroup> = new Map();

  for (const entry of Object.values(reg.escalations)) {
    if (!groups.has(entry.category)) {
      groups.set(entry.category, {
        groupId: `category-${entry.category}`,
        category: entry.category,
        entries: [],
        totalOccurrences: 0,
        totalProjects: 0,
      });
    }

    const group = groups.get(entry.category);
    if (!group) continue;
    group.entries.push(entry);
    group.totalOccurrences += entry.occurrenceCount;

    // Count unique projects
    const projects = new Set<string>();
    for (const e of group.entries) {
      for (const p of e.relatedProjects) {
        projects.add(p);
      }
    }
    group.totalProjects = projects.size;
  }

  return Array.from(groups.values()).sort((a, b) => b.totalOccurrences - a.totalOccurrences);
}

/**
 * Group escalations by severity
 */
export function groupBySeverity(registry?: EscalationRegistry): EscalationGroup[] {
  const reg = registry ?? loadRegistry();
  const groups: Map<string, EscalationGroup> = new Map();

  for (const entry of Object.values(reg.escalations)) {
    if (!groups.has(entry.severity)) {
      groups.set(entry.severity, {
        groupId: `severity-${entry.severity}`,
        category: entry.severity,
        entries: [],
        totalOccurrences: 0,
        totalProjects: 0,
      });
    }

    const group = groups.get(entry.severity);
    if (!group) continue;
    group.entries.push(entry);
    group.totalOccurrences += entry.occurrenceCount;

    // Count unique projects
    const projects = new Set<string>();
    for (const e of group.entries) {
      for (const p of e.relatedProjects) {
        projects.add(p);
      }
    }
    group.totalProjects = projects.size;
  }

  // Sort by severity order: critical, high, medium, low
  const severityOrder = ['critical', 'high', 'medium', 'low'];
  return Array.from(groups.values()).sort(
    (a, b) => severityOrder.indexOf(a.category) - severityOrder.indexOf(b.category)
  );
}

/**
 * Group similar escalations by symptom similarity
 * Uses word overlap for fuzzy matching
 */
export function groupBySimilarity(
  threshold: number = 0.5,
  registry?: EscalationRegistry
): EscalationGroup[] {
  const reg = registry ?? loadRegistry();
  const entries = Object.values(reg.escalations);
  const groups: EscalationGroup[] = [];
  const assigned = new Set<string>();

  for (const entry of entries) {
    if (assigned.has(entry.id)) continue;

    const group: EscalationGroup = {
      groupId: `similar-${entry.id}`,
      category: entry.category,
      entries: [entry],
      totalOccurrences: entry.occurrenceCount,
      totalProjects: entry.relatedProjects.length,
    };
    assigned.add(entry.id);

    // Find similar entries
    for (const other of entries) {
      if (assigned.has(other.id)) continue;

      const similarity = calculateSymptomSimilarity(entry.symptom, other.symptom);
      if (similarity >= threshold) {
        group.entries.push(other);
        group.totalOccurrences += other.occurrenceCount;
        assigned.add(other.id);
      }
    }

    // Update total projects
    const projects = new Set<string>();
    for (const e of group.entries) {
      for (const p of e.relatedProjects) {
        projects.add(p);
      }
    }
    group.totalProjects = projects.size;

    groups.push(group);
  }

  return groups.sort((a, b) => b.entries.length - a.entries.length);
}

/**
 * Calculate similarity between two symptoms using word overlap
 * Returns value between 0 and 1
 */
export function calculateSymptomSimilarity(symptom1: string, symptom2: string): number {
  const words1 = new Set(
    symptom1
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
  const words2 = new Set(
    symptom2
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = new Set([...words1].filter((w) => words2.has(w)));
  const union = new Set([...words1, ...words2]);

  return intersection.size / union.size;
}

// ============================================================================
// Summary Functions
// ============================================================================

/**
 * Generate a pattern summary
 */
export function getPatternSummary(registry?: EscalationRegistry): PatternSummary {
  const patterns = detectPatterns(registry);
  const patternsNeedingProposals = patterns.filter((p) => p.shouldTriggerProposal);

  const byCategory: Record<string, number> = {};
  for (const pattern of patterns) {
    for (const entry of pattern.entries) {
      byCategory[entry.category] = (byCategory[entry.category] || 0) + 1;
    }
  }

  return {
    totalPatterns: patterns.length,
    patternsNeedingProposals: patternsNeedingProposals.length,
    topPatterns: patterns.slice(0, 5),
    byCategory,
  };
}

// ============================================================================
// Exports
// ============================================================================

export default {
  detectPatterns,
  shouldTriggerProposal,
  getPatternsNeedingProposals,
  calculatePatternPriority,
  groupByCategory,
  groupBySeverity,
  groupBySimilarity,
  calculateSymptomSimilarity,
  getPatternSummary,
};
