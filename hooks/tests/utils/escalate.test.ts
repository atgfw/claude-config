/**
 * Tests for Escalate Utility
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getProjectPath, getProjectName, escalateWithProject } from '../../src/utils/escalate.js';
import {
  loadRegistry,
  saveRegistry,
  createEmptyRegistry,
} from '../../src/ledger/escalation_registry.js';

// Setup temporary registry for tests
let temporaryDir: string;
let originalClaudeDir: string | undefined;

beforeEach(() => {
  // Create temp directory for test registry
  temporaryDir = fs.mkdtempSync(path.join(os.tmpdir(), 'escalate-test-'));
  fs.mkdirSync(path.join(temporaryDir, 'ledger'), { recursive: true });

  // Save original and set test CLAUDE_DIR
  originalClaudeDir = process.env.CLAUDE_DIR;
  process.env.CLAUDE_DIR = temporaryDir;

  // Create empty registry
  const registry = createEmptyRegistry();
  saveRegistry(registry);
});

afterEach(() => {
  // Restore original CLAUDE_DIR
  if (originalClaudeDir) {
    process.env.CLAUDE_DIR = originalClaudeDir;
  } else {
    delete process.env.CLAUDE_DIR;
  }

  // Clean up temp directory
  try {
    fs.rmSync(temporaryDir, { recursive: true, force: true });
  } catch {
    // Ignore cleanup errors
  }
});

describe('Escalate Utility', () => {
  describe('getProjectPath', () => {
    it('returns current working directory', () => {
      const projectPath = getProjectPath();
      expect(projectPath).toBe(process.cwd());
    });
  });

  describe('getProjectName', () => {
    it('extracts basename from path', () => {
      expect(getProjectName('/home/user/projects/my-app')).toBe('my-app');
      expect(getProjectName('C:\\Users\\user\\projects\\my-app')).toBe('my-app');
    });
  });

  describe('escalateWithProject', () => {
    it('creates new escalation', () => {
      const result = escalateWithProject(
        {
          symptom: 'Test symptom',
          context: 'Test context',
          proposedSolution: 'Test solution',
          category: 'testing',
          severity: 'low',
        },
        '/projects/test',
        'test'
      );

      expect(result.isNovel).toBe(true);
      expect(result.escalation.symptom).toBe('Test symptom');
      expect(result.escalation.category).toBe('testing');
      expect(result.escalation.severity).toBe('low');
      expect(result.escalation.status).toBe('pending');
    });

    it('deduplicates same symptom in cooldown', () => {
      // First escalation
      const result1 = escalateWithProject(
        {
          symptom: 'Duplicate symptom',
          context: 'Test context',
          proposedSolution: 'Test solution',
          category: 'testing',
          severity: 'low',
        },
        '/projects/test',
        'test'
      );

      // Second escalation (same symptom, same project, in cooldown)
      const result2 = escalateWithProject(
        {
          symptom: 'Duplicate symptom',
          context: 'Different context',
          proposedSolution: 'Different solution',
          category: 'testing',
          severity: 'low',
        },
        '/projects/test',
        'test'
      );

      expect(result2.isNovel).toBe(false);
      expect(result2.id).toBe(result1.id);
      // Occurrence should NOT be incremented (in cooldown)
      expect(result2.escalation.occurrenceCount).toBe(1);
    });

    it('allows high severity to bypass cooldown', () => {
      // First escalation
      const result1 = escalateWithProject(
        {
          symptom: 'Urgent symptom',
          context: 'Test context',
          proposedSolution: 'Test solution',
          category: 'testing',
          severity: 'low',
        },
        '/projects/test',
        'test'
      );

      // Second escalation (same symptom, high severity bypasses cooldown)
      const result2 = escalateWithProject(
        {
          symptom: 'Urgent symptom',
          context: 'Different context',
          proposedSolution: 'Different solution',
          category: 'testing',
          severity: 'high',
        },
        '/projects/test',
        'test'
      );

      expect(result2.isNovel).toBe(false);
      expect(result2.id).toBe(result1.id);
      // Occurrence SHOULD be incremented (high severity bypasses cooldown)
      expect(result2.escalation.occurrenceCount).toBe(2);
    });

    it('detects cross-project pattern', () => {
      // First escalation from project A
      const result1 = escalateWithProject(
        {
          symptom: 'Cross project symptom',
          context: 'Test context',
          proposedSolution: 'Test solution',
          category: 'testing',
          severity: 'low',
        },
        '/projects/project-a',
        'project-a'
      );

      // Second escalation from project B (same symptom)
      const result2 = escalateWithProject(
        {
          symptom: 'Cross project symptom',
          context: 'Different context',
          proposedSolution: 'Different solution',
          category: 'testing',
          severity: 'low',
        },
        '/projects/project-b',
        'project-b'
      );

      expect(result2.isNovel).toBe(false);
      expect(result2.id).toBe(result1.id);
      expect(result2.escalation.crossProjectCount).toBe(2);
      expect(result2.escalation.relatedProjects).toContain('/projects/project-a');
      expect(result2.escalation.relatedProjects).toContain('/projects/project-b');
      // Pattern should be detected (2 projects = threshold)
      expect(result2.patternDetected).toBe(true);
    });

    it('triggers pattern detection at threshold', () => {
      // Create escalation and increment to threshold
      escalateWithProject(
        {
          symptom: 'Pattern symptom',
          context: 'Test context',
          proposedSolution: 'Test solution',
          category: 'testing',
          severity: 'high', // High to bypass cooldown
        },
        '/projects/test',
        'test'
      );

      // Second occurrence
      escalateWithProject(
        {
          symptom: 'Pattern symptom',
          context: 'Test context',
          proposedSolution: 'Test solution',
          category: 'testing',
          severity: 'high',
        },
        '/projects/test',
        'test'
      );

      // Third occurrence (hits threshold)
      const result3 = escalateWithProject(
        {
          symptom: 'Pattern symptom',
          context: 'Test context',
          proposedSolution: 'Test solution',
          category: 'testing',
          severity: 'high',
        },
        '/projects/test',
        'test'
      );

      expect(result3.patternDetected).toBe(true);
      expect(result3.escalation.status).toBe('pattern-detected');
    });

    it('persists escalation to registry', () => {
      escalateWithProject(
        {
          symptom: 'Persistent symptom',
          context: 'Test context',
          proposedSolution: 'Test solution',
          category: 'testing',
          severity: 'low',
        },
        '/projects/test',
        'test'
      );

      // Reload registry from disk
      const registry = loadRegistry();
      const entries = Object.values(registry.escalations);

      expect(entries).toHaveLength(1);
      expect(entries[0].symptom).toBe('Persistent symptom');
    });
  });

  describe('escalateFromHook', () => {
    it('adds hook name to relatedHooks', () => {
      const result = escalateWithProject(
        {
          symptom: 'Hook symptom',
          context: 'Test context',
          proposedSolution: 'Test solution',
          category: 'tooling',
          severity: 'medium',
          relatedHooks: ['pre-bash'],
        },
        '/projects/test',
        'test'
      );

      expect(result.escalation.relatedHookNames).toContain('pre-bash');
    });

    it('defaults to tooling category', () => {
      // Using escalateWithProject with relatedHooks to simulate escalateFromHook
      const result = escalateWithProject(
        {
          symptom: 'Hook symptom',
          context: 'Test context',
          proposedSolution: 'Test solution',
          category: 'tooling',
          severity: 'medium',
          relatedHooks: ['test-hook'],
        },
        '/projects/test',
        'test'
      );

      expect(result.escalation.category).toBe('tooling');
    });
  });

  describe('convenience functions', () => {
    it('escalateGovernance sets governance category', () => {
      const result = escalateWithProject(
        {
          symptom: 'Governance issue',
          context: 'Test context',
          proposedSolution: 'Test solution',
          category: 'governance',
          severity: 'medium',
        },
        '/projects/test',
        'test'
      );

      expect(result.escalation.category).toBe('governance');
    });

    it('escalateTesting sets testing category', () => {
      const result = escalateWithProject(
        {
          symptom: 'Testing issue',
          context: 'Test context',
          proposedSolution: 'Test solution',
          category: 'testing',
          severity: 'medium',
        },
        '/projects/test',
        'test'
      );

      expect(result.escalation.category).toBe('testing');
    });

    it('escalateSecurity defaults to high severity', () => {
      const result = escalateWithProject(
        {
          symptom: 'Security issue',
          context: 'Test context',
          proposedSolution: 'Test solution',
          category: 'security',
          severity: 'high',
        },
        '/projects/test',
        'test'
      );

      expect(result.escalation.category).toBe('security');
      expect(result.escalation.severity).toBe('high');
    });

    it('escalateMeta sets meta category', () => {
      const result = escalateWithProject(
        {
          symptom: 'Meta issue',
          context: 'Test context',
          proposedSolution: 'Test solution',
          category: 'meta',
          severity: 'medium',
        },
        '/projects/test',
        'test'
      );

      expect(result.escalation.category).toBe('meta');
    });
  });
});
