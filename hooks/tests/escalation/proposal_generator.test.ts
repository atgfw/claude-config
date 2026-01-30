/**
 * Tests for Proposal Generator
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  generateSlug,
  generateChangeId,
  generateProposalMd,
  generateTasksMd,
  generateSpecMd,
  scaffoldOpenSpecChange,
  generateProposal,
  generateAllPendingProposals,
} from '../../src/escalation/proposal_generator.js';
import {
  createEmptyRegistry,
  createEscalation,
  incrementOccurrence,
  saveRegistry,
} from '../../src/ledger/escalation_registry.js';

// Setup temporary directory for tests
let temporaryDir: string;
let originalClaudeDir: string | undefined;

beforeEach(() => {
  temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'proposal-test-'));
  fs.mkdirSync(path.join(temporaryDir, 'ledger'), { recursive: true });
  fs.mkdirSync(path.join(temporaryDir, 'openspec', 'changes'), { recursive: true });
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

describe('Proposal Generator', () => {
  describe('generateSlug', () => {
    it('converts symptom to URL-safe slug', () => {
      expect(generateSlug('File was not saved correctly')).toBe('file-was-not-saved-correctly');
    });

    it('removes special characters', () => {
      expect(generateSlug('Error: file (test) failed!')).toBe('error-file-test-failed');
    });

    it('limits slug length', () => {
      const longSymptom = 'This is a very long symptom that should be truncated to fit the limit';
      const slug = generateSlug(longSymptom);
      expect(slug.length).toBeLessThanOrEqual(40);
    });

    it('removes leading/trailing hyphens', () => {
      expect(generateSlug('--test--')).toBe('test');
    });
  });

  describe('generateChangeId', () => {
    it('prefixes with auto-', () => {
      const changeId = generateChangeId('Test symptom');
      expect(changeId).toMatch(/^auto-/);
    });

    it('includes slug of symptom', () => {
      const changeId = generateChangeId('File not saved');
      expect(changeId).toBe('auto-file-not-saved');
    });
  });

  describe('generateProposalMd', () => {
    it('generates valid markdown', () => {
      const registry = createEmptyRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'medium',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      const md = generateProposalMd([entry]);

      expect(md).toContain('# Proposal:');
      expect(md).toContain('Test symptom');
      expect(md).toContain('Test context');
      expect(md).toContain('Test solution');
      expect(md).toContain('testing');
      expect(md).toContain('/projects/test');
    });

    it('includes evidence table', () => {
      const registry = createEmptyRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'high',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      const md = generateProposalMd([entry]);

      expect(md).toContain('| ID | Project | Severity | Occurrences |');
      expect(md).toContain('| high |');
    });
  });

  describe('generateTasksMd', () => {
    it('generates task list', () => {
      const registry = createEmptyRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'medium',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      const md = generateTasksMd([entry]);

      expect(md).toContain('# Tasks:');
      expect(md).toContain('Phase 1: Investigation');
      expect(md).toContain('Phase 2: Design');
      expect(md).toContain('Phase 3: Implementation');
      expect(md).toContain('- [ ]');
    });
  });

  describe('generateSpecMd', () => {
    it('generates spec with requirements', () => {
      const registry = createEmptyRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Test symptom',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'medium',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      const md = generateSpecMd([entry]);

      expect(md).toContain('## ADDED Requirements');
      expect(md).toContain('### Requirement:');
      expect(md).toContain('#### Scenario:');
      expect(md).toContain('- **WHEN**');
      expect(md).toContain('- **THEN**');
    });
  });

  describe('scaffoldOpenSpecChange', () => {
    it('creates directory structure', () => {
      const changeId = 'auto-test-change';
      const changePath = scaffoldOpenSpecChange(changeId);

      expect(fs.existsSync(changePath)).toBe(true);
      expect(fs.existsSync(path.join(changePath, 'specs', changeId))).toBe(true);
    });
  });

  describe('generateProposal', () => {
    it('generates proposal for escalation at threshold', () => {
      const registry = createEmptyRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Recurring issue',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'medium',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      // Increment to threshold
      incrementOccurrence(registry, entry.id);
      incrementOccurrence(registry, entry.id);
      saveRegistry(registry);

      const proposal = generateProposal(entry.symptomHash, registry);

      expect(proposal).not.toBeNull();
      expect(proposal?.changeId).toMatch(/^auto-/);
      expect(fs.existsSync(proposal!.proposalPath)).toBe(true);
      expect(fs.existsSync(path.join(proposal!.proposalPath, 'proposal.md'))).toBe(true);
      expect(fs.existsSync(path.join(proposal!.proposalPath, 'tasks.md'))).toBe(true);
    });

    it('skips meta-escalations', () => {
      const registry = createEmptyRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Meta issue',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'meta',
        severity: 'medium',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      incrementOccurrence(registry, entry.id);
      incrementOccurrence(registry, entry.id);
      saveRegistry(registry);

      const proposal = generateProposal(entry.symptomHash, registry);

      expect(proposal).toBeNull();
    });

    it('updates escalation status to proposal-generated', () => {
      const registry = createEmptyRegistry();
      const entry = createEscalation(registry, {
        symptom: 'Status update test',
        context: 'Test context',
        proposedSolution: 'Test solution',
        category: 'testing',
        severity: 'medium',
        projectPath: '/projects/test',
        projectName: 'test',
      });

      incrementOccurrence(registry, entry.id);
      incrementOccurrence(registry, entry.id);

      generateProposal(entry.symptomHash, registry);

      expect(entry.status).toBe('proposal-generated');
      expect(entry.generatedProposalPath).toBeDefined();
    });
  });

  describe('generateAllPendingProposals', () => {
    it('generates proposals for all patterns at threshold', () => {
      const registry = createEmptyRegistry();

      // First pattern
      const entry1 = createEscalation(registry, {
        symptom: 'Pattern one',
        context: 'Context',
        proposedSolution: 'Solution',
        category: 'testing',
        severity: 'medium',
        projectPath: '/projects/test1',
        projectName: 'test1',
      });
      incrementOccurrence(registry, entry1.id);
      incrementOccurrence(registry, entry1.id);

      // Second pattern
      const entry2 = createEscalation(registry, {
        symptom: 'Pattern two',
        context: 'Context',
        proposedSolution: 'Solution',
        category: 'governance',
        severity: 'high',
        projectPath: '/projects/test2',
        projectName: 'test2',
      });
      incrementOccurrence(registry, entry2.id);
      incrementOccurrence(registry, entry2.id);

      // Below threshold
      createEscalation(registry, {
        symptom: 'Below threshold',
        context: 'Context',
        proposedSolution: 'Solution',
        category: 'testing',
        severity: 'low',
        projectPath: '/projects/test3',
        projectName: 'test3',
      });

      saveRegistry(registry);

      const proposals = generateAllPendingProposals(registry);

      expect(proposals).toHaveLength(2);
    });
  });
});
