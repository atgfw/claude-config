/**
 * Tests for Escalation Registry
 */

import { describe, it, expect } from 'vitest';
import {
  generateSymptomHash,
  generateId,
  createEmptyRegistry,
  createEscalation,
  findBySymptomHash,
  findBySymptomHashAndProject,
  incrementOccurrence,
  addRelatedProject,
  updateStatus,
  linkToCorrection,
  getPendingEscalations,
  getHighPriorityEscalations,
  checkPatternThreshold,
  isInCooldown,
  calculatePriority,
  getByPriority,
  getStats,
} from '../../src/ledger/escalation_registry.js';
import type { EscalationRegistry } from '../../src/types.js';

// Test with in-memory registry to avoid file system side effects
function createTestRegistry(): EscalationRegistry {
  return createEmptyRegistry();
}

describe('Escalation Registry', () => {
  describe('generateSymptomHash', () => {
    it('generates consistent hash for same symptom', () => {
      const symptom = 'The file was not saved correctly';
      const hash1 = generateSymptomHash(symptom);
      const hash2 = generateSymptomHash(symptom);
      expect(hash1).toBe(hash2);
    });

    it('generates same hash regardless of word order', () => {
      const hash1 = generateSymptomHash('file was not saved correctly');
      const hash2 = generateSymptomHash('saved file not correctly was');
      expect(hash1).toBe(hash2);
    });

    it('generates same hash regardless of case', () => {
      const hash1 = generateSymptomHash('File Not Saved');
      const hash2 = generateSymptomHash('file not saved');
      expect(hash1).toBe(hash2);
    });

    it('generates same hash regardless of punctuation', () => {
      const hash1 = generateSymptomHash('File was not saved correctly!');
      const hash2 = generateSymptomHash('File was not saved correctly');
      expect(hash1).toBe(hash2);
    });

    it('generates 16 character hash', () => {
      const hash = generateSymptomHash('Test symptom');
      expect(hash).toHaveLength(16);
    });

    it('filters out short words', () => {
      // Words <= 2 chars should be filtered (> 2 kept)
      // 'is' (2 chars) filtered, 'the' (3 chars) kept
      const hash1 = generateSymptomHash('a an is file saved');
      const hash2 = generateSymptomHash('file saved');
      // 'a', 'an', 'is' all <= 2 chars, filtered
      // Only 'file' and 'saved' remain in both
      expect(hash1).toBe(hash2);
    });

    it('generates different hash for different symptoms', () => {
      const hash1 = generateSymptomHash('file was not saved correctly');
      const hash2 = generateSymptomHash('hook failed to execute properly');
      expect(hash1).not.toBe(hash2);
    });
  });

  describe('generateId', () => {
    it('generates 16 character hex ID', () => {
      const id = generateId();
      expect(id).toHaveLength(16);
      expect(/^[a-f\d]+$/.test(id)).toBe(true);
    });

    it('generates unique IDs', () => {
      const ids = new Set<string>();
      for (let index = 0; index < 100; index++) {
        ids.add(generateId());
      }

      expect(ids.size).toBe(100);
    });
  });

  describe('createEscalation', () => {
    it('creates escalation with correct fields', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'File was not saved',
        context: 'When saving via Edit tool',
        proposedSolution: 'Add retry logic',
        category: 'tooling',
        severity: 'medium',
        projectPath: '/projects/test-project',
        projectName: 'test-project',
      });

      expect(entry.symptom).toBe('File was not saved');
      expect(entry.context).toBe('When saving via Edit tool');
      expect(entry.proposedSolution).toBe('Add retry logic');
      expect(entry.category).toBe('tooling');
      expect(entry.severity).toBe('medium');
      expect(entry.status).toBe('pending');
      expect(entry.occurrenceCount).toBe(1);
      expect(entry.crossProjectCount).toBe(1);
      expect(entry.relatedProjects).toContain('/projects/test-project');
    });

    it('adds escalation to registry', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      expect(registry.escalations[entry.id]).toBe(entry);
    });

    it('updates symptom index', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      expect(registry.symptomIndex[entry.symptomHash]).toContain(entry.id);
    });

    it('updates project index', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      expect(registry.projectIndex['/projects/test']).toContain(entry.id);
    });

    it('sets cooldown timestamp', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      expect(entry.cooldownUntil).toBeDefined();
      const cooldownTime = new Date(entry.cooldownUntil!).getTime();
      const now = Date.now();
      // Should be ~30 minutes in the future (default cooldown)
      expect(cooldownTime).toBeGreaterThan(now);
      expect(cooldownTime).toBeLessThanOrEqual(now + 31 * 60 * 1000);
    });
  });

  describe('findBySymptomHash', () => {
    it('returns empty array for non-existent hash', () => {
      const registry = createTestRegistry();
      const results = findBySymptomHash(registry, 'nonexistent');
      expect(results).toEqual([]);
    });

    it('finds escalations by symptom hash', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      const results = findBySymptomHash(registry, entry.symptomHash);
      expect(results).toHaveLength(1);
      expect(results[0]).toBe(entry);
    });
  });

  describe('findBySymptomHashAndProject', () => {
    it('returns undefined for non-existent combination', () => {
      const registry = createTestRegistry();
      const result = findBySymptomHashAndProject(registry, 'hash', '/path');
      expect(result).toBeUndefined();
    });

    it('finds escalation by symptom hash and project', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      const result = findBySymptomHashAndProject(registry, entry.symptomHash, '/projects/test');
      expect(result).toBe(entry);
    });
  });

  describe('incrementOccurrence', () => {
    it('increments occurrence count', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      expect(entry.occurrenceCount).toBe(1);
      incrementOccurrence(registry, entry.id);
      expect(entry.occurrenceCount).toBe(2);
      incrementOccurrence(registry, entry.id);
      expect(entry.occurrenceCount).toBe(3);
    });

    it('updates lastEscalatedAt', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      const originalTime = entry.lastEscalatedAt;
      // Small delay to ensure time difference
      incrementOccurrence(registry, entry.id);
      expect(new Date(entry.lastEscalatedAt).getTime()).toBeGreaterThanOrEqual(
        new Date(originalTime).getTime()
      );
    });
  });

  describe('addRelatedProject', () => {
    it('adds project to relatedProjects', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test1',
        projectName: 'test1',
      });

      expect(entry.relatedProjects).toHaveLength(1);
      addRelatedProject(registry, entry.id, '/projects/test2');
      expect(entry.relatedProjects).toHaveLength(2);
      expect(entry.relatedProjects).toContain('/projects/test2');
    });

    it('updates crossProjectCount', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test1',
        projectName: 'test1',
      });

      expect(entry.crossProjectCount).toBe(1);
      addRelatedProject(registry, entry.id, '/projects/test2');
      expect(entry.crossProjectCount).toBe(2);
    });

    it('does not add duplicate projects', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test1',
        projectName: 'test1',
      });

      addRelatedProject(registry, entry.id, '/projects/test1');
      expect(entry.relatedProjects).toHaveLength(1);
      expect(entry.crossProjectCount).toBe(1);
    });
  });

  describe('updateStatus', () => {
    it('updates status', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      expect(entry.status).toBe('pending');
      updateStatus(registry, entry.id, 'pattern-detected');
      expect(entry.status).toBe('pattern-detected');
    });

    it('sets resolvedAt for resolved status', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      expect(entry.resolvedAt).toBeUndefined();
      updateStatus(registry, entry.id, 'resolved');
      expect(entry.resolvedAt).toBeDefined();
    });

    it('sets metadata fields', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      updateStatus(registry, entry.id, 'proposal-generated', {
        generatedProposalPath: '/openspec/changes/auto-test',
      });
      expect(entry.generatedProposalPath).toBe('/openspec/changes/auto-test');
    });
  });

  describe('linkToCorrection', () => {
    it('adds correction ID to relatedCorrectionIds', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      expect(entry.relatedCorrectionIds).toHaveLength(0);
      linkToCorrection(registry, entry.id, 'correction-123');
      expect(entry.relatedCorrectionIds).toContain('correction-123');
    });

    it('does not add duplicate correction IDs', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      linkToCorrection(registry, entry.id, 'correction-123');
      linkToCorrection(registry, entry.id, 'correction-123');
      expect(entry.relatedCorrectionIds).toHaveLength(1);
    });
  });

  describe('getPendingEscalations', () => {
    it('returns only pending escalations', () => {
      const registry = createTestRegistry();

      createEscalation(registry, {
        symptom: 'Pending symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      const entry2 = createEscalation(registry, {
        symptom: 'Resolved symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test2',
        projectName: 'test2',
      });
      updateStatus(registry, entry2.id, 'resolved');

      const pending = getPendingEscalations(registry);
      expect(pending).toHaveLength(1);
      expect(pending[0].symptom).toBe('Pending symptom');
    });
  });

  describe('getHighPriorityEscalations', () => {
    it('returns only high and critical severity escalations', () => {
      const registry = createTestRegistry();

      createEscalation(registry, {
        symptom: 'Low priority',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test1',
        projectName: 'test1',
      });

      createEscalation(registry, {
        symptom: 'High priority',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'high',
        projectPath: '/projects/test2',
        projectName: 'test2',
      });

      createEscalation(registry, {
        symptom: 'Critical priority',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'critical',
        projectPath: '/projects/test3',
        projectName: 'test3',
      });

      const highPriority = getHighPriorityEscalations(registry);
      expect(highPriority).toHaveLength(2);
    });
  });

  describe('checkPatternThreshold', () => {
    it('returns false when below occurrence threshold', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      // Default threshold is 3 occurrences
      expect(checkPatternThreshold(registry, entry.symptomHash)).toBe(false);
    });

    it('returns true when at occurrence threshold', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      incrementOccurrence(registry, entry.id);
      incrementOccurrence(registry, entry.id);
      // Now at 3 occurrences (1 initial + 2 increments)
      expect(checkPatternThreshold(registry, entry.symptomHash)).toBe(true);
    });

    it('returns true when at cross-project threshold', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test1',
        projectName: 'test1',
      });

      // Default threshold is 2 projects
      addRelatedProject(registry, entry.id, '/projects/test2');
      expect(checkPatternThreshold(registry, entry.symptomHash)).toBe(true);
    });
  });

  describe('isInCooldown', () => {
    it('returns false for non-existent escalation', () => {
      const registry = createTestRegistry();
      expect(isInCooldown(registry, 'nonexistent', '/path', 'low')).toBe(false);
    });

    it('returns true during cooldown period', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      // Just created, should be in cooldown
      expect(isInCooldown(registry, entry.symptomHash, '/projects/test', 'low')).toBe(true);
    });

    it('returns false for high severity during cooldown', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      // High severity bypasses cooldown
      expect(isInCooldown(registry, entry.symptomHash, '/projects/test', 'high')).toBe(false);
    });

    it('returns false for critical severity during cooldown', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      // Critical severity bypasses cooldown
      expect(isInCooldown(registry, entry.symptomHash, '/projects/test', 'critical')).toBe(false);
    });
  });

  describe('calculatePriority', () => {
    it('calculates higher priority for higher severity', () => {
      const registry = createTestRegistry();

      const lowEntry = createEscalation(registry, {
        symptom: 'Low symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test1',
        projectName: 'test1',
      });

      const highEntry = createEscalation(registry, {
        symptom: 'High symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'high',
        projectPath: '/projects/test2',
        projectName: 'test2',
      });

      const lowPriority = calculatePriority(lowEntry, registry.config);
      const highPriority = calculatePriority(highEntry, registry.config);

      expect(highPriority).toBeGreaterThan(lowPriority);
    });

    it('adds bonus for more occurrences', () => {
      const registry = createTestRegistry();

      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'medium',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      const priorityBefore = calculatePriority(entry, registry.config);
      incrementOccurrence(registry, entry.id);
      incrementOccurrence(registry, entry.id);
      const priorityAfter = calculatePriority(entry, registry.config);

      expect(priorityAfter).toBeGreaterThan(priorityBefore);
    });

    it('adds bonus for more projects', () => {
      const registry = createTestRegistry();

      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'medium',
        projectPath: '/projects/test1',
        projectName: 'test1',
      });

      const priorityBefore = calculatePriority(entry, registry.config);
      addRelatedProject(registry, entry.id, '/projects/test2');
      const priorityAfter = calculatePriority(entry, registry.config);

      expect(priorityAfter).toBeGreaterThan(priorityBefore);
    });
  });

  describe('getStats', () => {
    it('returns correct statistics', () => {
      const registry = createTestRegistry();

      createEscalation(registry, {
        symptom: 'Pending low',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test1',
        projectName: 'test1',
      });

      createEscalation(registry, {
        symptom: 'Pending high',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'governance',
        severity: 'high',
        projectPath: '/projects/test2',
        projectName: 'test2',
      });

      const entry3 = createEscalation(registry, {
        symptom: 'Resolved',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'security',
        severity: 'critical',
        projectPath: '/projects/test3',
        projectName: 'test3',
      });
      updateStatus(registry, entry3.id, 'resolved');

      const stats = getStats(registry);

      expect(stats.total).toBe(3);
      expect(stats.pending).toBe(2);
      expect(stats.resolved).toBe(1);
      expect(stats.highPriority).toBe(1); // Only pending high severity
      expect(stats.byCategory.testing).toBe(1);
      expect(stats.byCategory.governance).toBe(1);
      expect(stats.byCategory.security).toBe(1);
      expect(stats.bySeverity.low).toBe(1);
      expect(stats.bySeverity.high).toBe(1);
      expect(stats.bySeverity.critical).toBe(1);
    });
  });

  describe('getByPriority', () => {
    it('returns escalations sorted by priority (highest first)', () => {
      const registry = createTestRegistry();

      createEscalation(registry, {
        symptom: 'Low priority',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test1',
        projectName: 'test1',
      });

      createEscalation(registry, {
        symptom: 'Critical priority',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'critical',
        projectPath: '/projects/test2',
        projectName: 'test2',
      });

      createEscalation(registry, {
        symptom: 'Medium priority',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'medium',
        projectPath: '/projects/test3',
        projectName: 'test3',
      });

      const sorted = getByPriority(registry);

      expect(sorted[0].severity).toBe('critical');
      expect(sorted[1].severity).toBe('medium');
      expect(sorted[2].severity).toBe('low');
    });
  });
});
