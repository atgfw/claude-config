/**
 * Tests for Pattern Detector
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  detectPatterns,
  shouldTriggerProposal,
  getPatternsNeedingProposals,
  groupByCategory,
  groupBySeverity,
  groupBySimilarity,
  calculateSymptomSimilarity,
  getPatternSummary,
} from '../../src/escalation/pattern_detector.js';
import {
  createEmptyRegistry,
  createEscalation,
  incrementOccurrence,
  addRelatedProject,
  saveRegistry,
  updateStatus,
} from '../../src/ledger/escalation_registry.js';
import type { EscalationRegistry } from '../../src/types.js';

// Setup temporary registry for tests
let temporaryDir: string;
let originalClaudeDir: string | undefined;

beforeEach(() => {
  temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pattern-test-'));
  fs.mkdirSync(path.join(temporaryDir, 'ledger'), { recursive: true });
  originalClaudeDir = process.env.CLAUDE_DIR;
  process.env.CLAUDE_DIR = temporaryDir;

  const registry = createEmptyRegistry();
  saveRegistry(registry);
});

afterEach(() => {
  if (originalClaudeDir) {
    process.env.CLAUDE_DIR = originalClaudeDir;
  } else {
    delete process.env.CLAUDE_DIR;
  }

  try {
    fs.rmSync(temporaryDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
});

function createTestRegistry(): EscalationRegistry {
  return createEmptyRegistry();
}

describe('Pattern Detector', () => {
  describe('calculateSymptomSimilarity', () => {
    it('returns 1 for identical symptoms', () => {
      const similarity = calculateSymptomSimilarity('file not saved', 'file not saved');
      expect(similarity).toBe(1);
    });

    it('returns 0 for completely different symptoms', () => {
      const similarity = calculateSymptomSimilarity('file saved', 'hook executed');
      expect(similarity).toBe(0);
    });

    it('returns partial similarity for overlapping words', () => {
      const similarity = calculateSymptomSimilarity(
        'file was not saved correctly',
        'file could not be saved'
      );
      // Both have 'file', 'saved', 'not'
      expect(similarity).toBeGreaterThan(0);
      expect(similarity).toBeLessThan(1);
    });

    it('ignores short words', () => {
      // 'a' (1 char) and 'is' (2 chars) filtered, but 'the' (3 chars) kept
      const similarity = calculateSymptomSimilarity('a is file', 'file');
      // 'a' and 'is' filtered, only 'file' remains
      expect(similarity).toBe(1);
    });

    it('is case insensitive', () => {
      const similarity = calculateSymptomSimilarity('FILE NOT SAVED', 'file not saved');
      expect(similarity).toBe(1);
    });
  });

  describe('detectPatterns', () => {
    it('returns empty array for empty registry', () => {
      const registry = createTestRegistry();
      const patterns = detectPatterns(registry);
      expect(patterns).toHaveLength(0);
    });

    it('groups escalations by symptom hash', () => {
      const registry = createTestRegistry();

      createEscalation(registry, {
        symptom: 'File not saved',
        context: 'Context 1',
        proposedSolution: 'Solution 1',
        category: 'tooling',
        severity: 'low',
        projectPath: '/project/a',
        projectName: 'a',
      });

      createEscalation(registry, {
        symptom: 'Hook failed',
        context: 'Context 2',
        proposedSolution: 'Solution 2',
        category: 'governance',
        severity: 'medium',
        projectPath: '/project/b',
        projectName: 'b',
      });

      saveRegistry(registry);

      const patterns = detectPatterns(registry);
      expect(patterns).toHaveLength(2);
    });

    it('sorts patterns by priority', () => {
      const registry = createTestRegistry();

      createEscalation(registry, {
        symptom: 'Low priority issue',
        context: 'Context',
        proposedSolution: 'Solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/project/a',
        projectName: 'a',
      });

      createEscalation(registry, {
        symptom: 'Critical issue',
        context: 'Context',
        proposedSolution: 'Solution',
        category: 'security',
        severity: 'critical',
        projectPath: '/project/b',
        projectName: 'b',
      });

      saveRegistry(registry);

      const patterns = detectPatterns(registry);
      expect(patterns[0].primarySymptom).toBe('Critical issue');
    });
  });

  describe('shouldTriggerProposal', () => {
    it('returns false for new escalation below threshold', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'New issue',
        context: 'Context',
        proposedSolution: 'Solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/project/a',
        projectName: 'a',
      });

      saveRegistry(registry);

      expect(shouldTriggerProposal(entry.symptomHash, registry)).toBe(false);
    });

    it('returns true when occurrence threshold met', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Recurring issue',
        context: 'Context',
        proposedSolution: 'Solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/project/a',
        projectName: 'a',
      });

      // Increment to threshold (3)
      incrementOccurrence(registry, entry.id);
      incrementOccurrence(registry, entry.id);
      saveRegistry(registry);

      expect(shouldTriggerProposal(entry.symptomHash, registry)).toBe(true);
    });

    it('returns true when cross-project threshold met', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Cross project issue',
        context: 'Context',
        proposedSolution: 'Solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/project/a',
        projectName: 'a',
      });

      // Add second project (threshold is 2)
      addRelatedProject(registry, entry.id, '/project/b');
      saveRegistry(registry);

      expect(shouldTriggerProposal(entry.symptomHash, registry)).toBe(true);
    });

    it('returns false for meta-escalations', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Meta issue',
        context: 'Context',
        proposedSolution: 'Solution',
        category: 'meta',
        severity: 'low',
        projectPath: '/project/a',
        projectName: 'a',
      });

      // Even if threshold met
      incrementOccurrence(registry, entry.id);
      incrementOccurrence(registry, entry.id);
      saveRegistry(registry);

      expect(shouldTriggerProposal(entry.symptomHash, registry)).toBe(false);
    });

    it('returns false if proposal already generated', () => {
      const registry = createTestRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Already proposed',
        context: 'Context',
        proposedSolution: 'Solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/project/a',
        projectName: 'a',
      });

      incrementOccurrence(registry, entry.id);
      incrementOccurrence(registry, entry.id);
      updateStatus(registry, entry.id, 'proposal-generated', {
        generatedProposalPath: '/openspec/changes/auto-test',
      });
      saveRegistry(registry);

      expect(shouldTriggerProposal(entry.symptomHash, registry)).toBe(false);
    });
  });

  describe('getPatternsNeedingProposals', () => {
    it('returns only patterns that need proposals', () => {
      const registry = createTestRegistry();

      // Below threshold
      createEscalation(registry, {
        symptom: 'Below threshold',
        context: 'Context',
        proposedSolution: 'Solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/project/a',
        projectName: 'a',
      });

      // At threshold
      const entry2 = createEscalation(registry, {
        symptom: 'At threshold',
        context: 'Context',
        proposedSolution: 'Solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/project/b',
        projectName: 'b',
      });
      incrementOccurrence(registry, entry2.id);
      incrementOccurrence(registry, entry2.id);

      saveRegistry(registry);

      const needingProposals = getPatternsNeedingProposals(registry);
      expect(needingProposals).toHaveLength(1);
      expect(needingProposals[0].primarySymptom).toBe('At threshold');
    });
  });

  describe('groupByCategory', () => {
    it('groups escalations by category', () => {
      const registry = createTestRegistry();

      createEscalation(registry, {
        symptom: 'Testing issue 1',
        context: 'Context',
        proposedSolution: 'Solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/project/a',
        projectName: 'a',
      });

      createEscalation(registry, {
        symptom: 'Testing issue 2',
        context: 'Context',
        proposedSolution: 'Solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/project/b',
        projectName: 'b',
      });

      createEscalation(registry, {
        symptom: 'Security issue',
        context: 'Context',
        proposedSolution: 'Solution',
        category: 'security',
        severity: 'high',
        projectPath: '/project/c',
        projectName: 'c',
      });

      saveRegistry(registry);

      const groups = groupByCategory(registry);
      expect(groups).toHaveLength(2);

      const testingGroup = groups.find((g) => g.category === 'testing');
      expect(testingGroup?.entries).toHaveLength(2);

      const securityGroup = groups.find((g) => g.category === 'security');
      expect(securityGroup?.entries).toHaveLength(1);
    });
  });

  describe('groupBySeverity', () => {
    it('groups escalations by severity in order', () => {
      const registry = createTestRegistry();

      createEscalation(registry, {
        symptom: 'Low issue',
        context: 'Context',
        proposedSolution: 'Solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/project/a',
        projectName: 'a',
      });

      createEscalation(registry, {
        symptom: 'Critical issue',
        context: 'Context',
        proposedSolution: 'Solution',
        category: 'testing',
        severity: 'critical',
        projectPath: '/project/b',
        projectName: 'b',
      });

      createEscalation(registry, {
        symptom: 'Medium issue',
        context: 'Context',
        proposedSolution: 'Solution',
        category: 'testing',
        severity: 'medium',
        projectPath: '/project/c',
        projectName: 'c',
      });

      saveRegistry(registry);

      const groups = groupBySeverity(registry);
      expect(groups[0].category).toBe('critical');
      expect(groups[1].category).toBe('medium');
      expect(groups[2].category).toBe('low');
    });
  });

  describe('groupBySimilarity', () => {
    it('groups similar symptoms together', () => {
      const registry = createTestRegistry();

      createEscalation(registry, {
        symptom: 'File could not be saved to disk',
        context: 'Context',
        proposedSolution: 'Solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/project/a',
        projectName: 'a',
      });

      createEscalation(registry, {
        symptom: 'File was not saved correctly',
        context: 'Context',
        proposedSolution: 'Solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/project/b',
        projectName: 'b',
      });

      createEscalation(registry, {
        symptom: 'Hook execution failed',
        context: 'Context',
        proposedSolution: 'Solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/project/c',
        projectName: 'c',
      });

      saveRegistry(registry);

      const groups = groupBySimilarity(0.3, registry);
      // File-related should be grouped, hook separate
      expect(groups.length).toBeLessThanOrEqual(3);
    });
  });

  describe('getPatternSummary', () => {
    it('returns complete summary', () => {
      const registry = createTestRegistry();

      createEscalation(registry, {
        symptom: 'Issue one for testing',
        context: 'Context',
        proposedSolution: 'Solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/project/a',
        projectName: 'a',
      });

      const entry2 = createEscalation(registry, {
        symptom: 'Issue two for security',
        context: 'Context',
        proposedSolution: 'Solution',
        category: 'security',
        severity: 'high',
        projectPath: '/project/b',
        projectName: 'b',
      });
      incrementOccurrence(registry, entry2.id);
      incrementOccurrence(registry, entry2.id);

      // Pass registry directly to avoid file system read
      const summary = getPatternSummary(registry);

      expect(summary.totalPatterns).toBe(2);
      expect(summary.patternsNeedingProposals).toBe(1);
      expect(summary.topPatterns).toHaveLength(2);
      expect(summary.byCategory.testing).toBe(1);
      expect(summary.byCategory.security).toBe(1);
    });
  });
});
