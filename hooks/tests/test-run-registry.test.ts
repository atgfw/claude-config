/**
 * Tests for Test Run Registry (Primordial Pipeline)
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';

import {
  generateInputHash,
  generateEntityId,
  getOrCreateEntity,
  recordTestRun,
  checkEntityHealth,
  buildHierarchy,
  registerChild,
  markEntityStale,
  getTestingSummary,
  formatEntityProgress,
  type TestRunRegistry,
  type EntityType,
} from '../src/ledger/test_run_registry.js';

// Test with in-memory registry to avoid file system side effects
function createTestRegistry(): TestRunRegistry {
  return {
    entities: {},
    hierarchies: {},
    config: {
      requiredNovelRuns: 3,
      inputHashAlgorithm: 'sha256-prefix-16',
    },
    lastUpdated: new Date().toISOString(),
  };
}

describe('Test Run Registry', () => {
  describe('generateInputHash', () => {
    it('generates consistent hash for same input', () => {
      const input = { name: 'John', age: 30 };
      const hash1 = generateInputHash(input);
      const hash2 = generateInputHash(input);
      expect(hash1).toBe(hash2);
    });

    it('generates different hash for different input', () => {
      const hash1 = generateInputHash({ name: 'John', age: 30 });
      const hash2 = generateInputHash({ name: 'Jane', age: 25 });
      expect(hash1).not.toBe(hash2);
    });

    it('generates 16 character hash', () => {
      const hash = generateInputHash({ test: 'data' });
      expect(hash).toHaveLength(16);
    });

    it('handles nested objects', () => {
      const input = { user: { name: 'John', address: { city: 'NYC' } } };
      const hash = generateInputHash(input);
      expect(hash).toHaveLength(16);
    });

    it('produces same hash regardless of key order', () => {
      const hash1 = generateInputHash({ a: 1, b: 2 });
      const hash2 = generateInputHash({ b: 2, a: 1 });
      expect(hash1).toBe(hash2);
    });
  });

  describe('generateEntityId', () => {
    it('generates consistent ID for same type and path', () => {
      const id1 = generateEntityId('code-node', '/path/to/file.ts');
      const id2 = generateEntityId('code-node', '/path/to/file.ts');
      expect(id1).toBe(id2);
    });

    it('generates different ID for different path', () => {
      const id1 = generateEntityId('code-node', '/path/to/file1.ts');
      const id2 = generateEntityId('code-node', '/path/to/file2.ts');
      expect(id1).not.toBe(id2);
    });

    it('generates different ID for different type', () => {
      const id1 = generateEntityId('code-node', '/path/to/file.ts');
      const id2 = generateEntityId('node', '/path/to/file.ts');
      expect(id1).not.toBe(id2);
    });
  });

  describe('getOrCreateEntity', () => {
    it('creates new entity if not exists', () => {
      const registry = createTestRegistry();
      const entity = getOrCreateEntity(
        registry,
        'code-node',
        '/path/to/validate.ts',
        'validateSchema'
      );

      expect(entity.entityType).toBe('code-node');
      expect(entity.entityPath).toBe('/path/to/validate.ts');
      expect(entity.entityName).toBe('validateSchema');
      expect(entity.status).toBe('untested');
      expect(entity.testRuns).toEqual([]);
      expect(entity.novelInputHashes).toEqual([]);
    });

    it('returns existing entity if exists', () => {
      const registry = createTestRegistry();
      const entity1 = getOrCreateEntity(
        registry,
        'code-node',
        '/path/to/validate.ts',
        'validateSchema'
      );
      entity1.status = 'testing';

      const entity2 = getOrCreateEntity(
        registry,
        'code-node',
        '/path/to/validate.ts',
        'validateSchema'
      );
      expect(entity2.status).toBe('testing');
      expect(entity1).toBe(entity2);
    });

    it('adds entity to parent children list', () => {
      const registry = createTestRegistry();
      const parent = getOrCreateEntity(registry, 'subworkflow', '/path/to/workflow', 'MyWorkflow');
      const child = getOrCreateEntity(
        registry,
        'code-node',
        '/path/to/node.ts',
        'MyNode',
        parent.entityId
      );

      expect(parent.children).toContain(child.entityId);
      expect(child.parentEntityId).toBe(parent.entityId);
    });
  });

  describe('recordTestRun', () => {
    it('records test run and updates status', () => {
      const registry = createTestRegistry();
      const result = recordTestRun(registry, {
        entityType: 'code-node',
        entityPath: '/path/to/validate.ts',
        entityName: 'validateSchema',
        input: { name: 'John' },
        inputDescription: 'Valid input',
        passed: true,
      });

      expect(result.isNovel).toBe(true);
      expect(result.novelCount).toBe(1);
      expect(result.entity.testRuns).toHaveLength(1);
      expect(result.entity.status).toBe('testing');
    });

    it('detects duplicate input hash', () => {
      const registry = createTestRegistry();
      const input = { name: 'John' };

      const result1 = recordTestRun(registry, {
        entityType: 'code-node',
        entityPath: '/path/to/validate.ts',
        entityName: 'validateSchema',
        input,
        inputDescription: 'First run',
        passed: true,
      });

      const result2 = recordTestRun(registry, {
        entityType: 'code-node',
        entityPath: '/path/to/validate.ts',
        entityName: 'validateSchema',
        input, // Same input
        inputDescription: 'Second run',
        passed: true,
      });

      expect(result1.isNovel).toBe(true);
      expect(result2.isNovel).toBe(false);
      expect(result2.novelCount).toBe(1); // Still 1, not 2
    });

    it('marks entity healthy after 3 novel runs', () => {
      const registry = createTestRegistry();

      recordTestRun(registry, {
        entityType: 'code-node',
        entityPath: '/path/to/validate.ts',
        entityName: 'validateSchema',
        input: { name: 'John' },
        inputDescription: 'Run 1',
        passed: true,
      });

      recordTestRun(registry, {
        entityType: 'code-node',
        entityPath: '/path/to/validate.ts',
        entityName: 'validateSchema',
        input: { name: 'Jane' },
        inputDescription: 'Run 2',
        passed: true,
      });

      const result3 = recordTestRun(registry, {
        entityType: 'code-node',
        entityPath: '/path/to/validate.ts',
        entityName: 'validateSchema',
        input: { name: 'Bob' },
        inputDescription: 'Run 3',
        passed: true,
      });

      expect(result3.novelCount).toBe(3);
      expect(result3.entity.status).toBe('healthy');
      expect(result3.entity.healthyAt).toBeDefined();
    });

    it('marks entity failing if test fails', () => {
      const registry = createTestRegistry();

      recordTestRun(registry, {
        entityType: 'code-node',
        entityPath: '/path/to/validate.ts',
        entityName: 'validateSchema',
        input: { name: 'John' },
        inputDescription: 'Run 1',
        passed: true,
      });

      const result = recordTestRun(registry, {
        entityType: 'code-node',
        entityPath: '/path/to/validate.ts',
        entityName: 'validateSchema',
        input: { name: 'Invalid' },
        inputDescription: 'Run 2',
        passed: false,
        error: 'Validation failed',
      });

      expect(result.entity.status).toBe('failing');
    });
  });

  describe('checkEntityHealth', () => {
    it('returns not healthy for untested entity', () => {
      const registry = createTestRegistry();
      getOrCreateEntity(registry, 'code-node', '/path/to/validate.ts', 'validateSchema');

      const entity = Object.values(registry.entities)[0];
      const result = checkEntityHealth(registry, entity.entityId);

      expect(result.isHealthy).toBe(false);
      expect(result.status).toBe('untested');
      expect(result.novelRunCount).toBe(0);
      expect(result.missingRuns).toBe(3);
    });

    it('returns not healthy for partially tested entity', () => {
      const registry = createTestRegistry();

      recordTestRun(registry, {
        entityType: 'code-node',
        entityPath: '/path/to/validate.ts',
        entityName: 'validateSchema',
        input: { name: 'John' },
        inputDescription: 'Run 1',
        passed: true,
      });

      recordTestRun(registry, {
        entityType: 'code-node',
        entityPath: '/path/to/validate.ts',
        entityName: 'validateSchema',
        input: { name: 'Jane' },
        inputDescription: 'Run 2',
        passed: true,
      });

      const entity = Object.values(registry.entities)[0];
      const result = checkEntityHealth(registry, entity.entityId);

      expect(result.isHealthy).toBe(false);
      expect(result.novelRunCount).toBe(2);
      expect(result.missingRuns).toBe(1);
    });

    it('returns healthy for fully tested entity', () => {
      const registry = createTestRegistry();

      for (let i = 0; i < 3; i++) {
        recordTestRun(registry, {
          entityType: 'code-node',
          entityPath: '/path/to/validate.ts',
          entityName: 'validateSchema',
          input: { name: `Person${i}` },
          inputDescription: `Run ${i + 1}`,
          passed: true,
        });
      }

      const entity = Object.values(registry.entities)[0];
      const result = checkEntityHealth(registry, entity.entityId);

      expect(result.isHealthy).toBe(true);
      expect(result.novelRunCount).toBe(3);
      expect(result.missingRuns).toBe(0);
    });

    it('checks children health recursively', () => {
      const registry = createTestRegistry();

      // Create parent
      const parent = getOrCreateEntity(registry, 'subworkflow', '/path/workflow', 'MyWorkflow');

      // Create healthy child
      for (let i = 0; i < 3; i++) {
        recordTestRun(registry, {
          entityType: 'code-node',
          entityPath: '/path/child1.ts',
          entityName: 'Child1',
          input: { n: i },
          inputDescription: `Run ${i}`,
          passed: true,
          parentEntityId: parent.entityId,
        });
      }

      // Create unhealthy child (only 1 run)
      recordTestRun(registry, {
        entityType: 'code-node',
        entityPath: '/path/child2.ts',
        entityName: 'Child2',
        input: { n: 0 },
        inputDescription: 'Run 0',
        passed: true,
        parentEntityId: parent.entityId,
      });

      // Register children
      const child1 = Object.values(registry.entities).find((e) => e.entityName === 'Child1')!;
      const child2 = Object.values(registry.entities).find((e) => e.entityName === 'Child2')!;
      registerChild(registry, parent.entityId, child1.entityId);
      registerChild(registry, parent.entityId, child2.entityId);

      const result = checkEntityHealth(registry, parent.entityId, true);

      expect(result.childrenHealthy).toBe(false);
      expect(result.unhealthyChildren).toContain(child2.entityId);
      expect(result.isHealthy).toBe(false);
    });
  });

  describe('markEntityStale', () => {
    it('marks healthy entity as stale', () => {
      const registry = createTestRegistry();

      for (let i = 0; i < 3; i++) {
        recordTestRun(registry, {
          entityType: 'code-node',
          entityPath: '/path/to/validate.ts',
          entityName: 'validateSchema',
          input: { name: `Person${i}` },
          inputDescription: `Run ${i + 1}`,
          passed: true,
        });
      }

      const entity = Object.values(registry.entities)[0];
      expect(entity.status).toBe('healthy');

      markEntityStale(registry, entity.entityId);
      expect(entity.status).toBe('stale');
      expect(entity.healthyAt).toBeUndefined();
    });
  });

  describe('buildHierarchy', () => {
    it('builds hierarchy with all descendants', () => {
      const registry = createTestRegistry();

      // Create parent
      const parent = getOrCreateEntity(registry, 'parent-workflow', '/workflow', 'ParentWorkflow');

      // Create children
      const child1 = getOrCreateEntity(
        registry,
        'subworkflow',
        '/sw1',
        'Subworkflow1',
        parent.entityId
      );
      const child2 = getOrCreateEntity(
        registry,
        'subworkflow',
        '/sw2',
        'Subworkflow2',
        parent.entityId
      );

      // Create grandchildren
      const grandchild = getOrCreateEntity(
        registry,
        'code-node',
        '/node1',
        'Node1',
        child1.entityId
      );

      // Build connections
      registerChild(registry, parent.entityId, child1.entityId);
      registerChild(registry, parent.entityId, child2.entityId);
      registerChild(registry, child1.entityId, grandchild.entityId);

      const hierarchy = buildHierarchy(registry, parent.entityId);

      expect(hierarchy.totalEntities).toBe(4);
      expect(hierarchy.allDescendants).toContain(child1.entityId);
      expect(hierarchy.allDescendants).toContain(child2.entityId);
      expect(hierarchy.allDescendants).toContain(grandchild.entityId);
      expect(hierarchy.allHealthy).toBe(false); // None are healthy
    });
  });

  describe('getTestingSummary', () => {
    it('returns correct summary', () => {
      const registry = createTestRegistry();

      // Create untested entity
      getOrCreateEntity(registry, 'code-node', '/path1', 'Entity1');

      // Create testing entity (2 runs)
      recordTestRun(registry, {
        entityType: 'code-node',
        entityPath: '/path2',
        entityName: 'Entity2',
        input: { n: 1 },
        inputDescription: 'Run 1',
        passed: true,
      });
      recordTestRun(registry, {
        entityType: 'code-node',
        entityPath: '/path2',
        entityName: 'Entity2',
        input: { n: 2 },
        inputDescription: 'Run 2',
        passed: true,
      });

      // Create healthy entity (3 runs)
      for (let i = 0; i < 3; i++) {
        recordTestRun(registry, {
          entityType: 'code-node',
          entityPath: '/path3',
          entityName: 'Entity3',
          input: { n: i },
          inputDescription: `Run ${i}`,
          passed: true,
        });
      }

      const summary = getTestingSummary(registry);

      expect(summary.total).toBe(3);
      expect(summary.untested).toBe(1);
      expect(summary.testing).toBe(1);
      expect(summary.healthy).toBe(1);
    });
  });

  describe('formatEntityProgress', () => {
    it('formats progress bar correctly', () => {
      const registry = createTestRegistry();

      recordTestRun(registry, {
        entityType: 'code-node',
        entityPath: '/path',
        entityName: 'Entity',
        input: { n: 1 },
        inputDescription: 'Run 1',
        passed: true,
      });
      recordTestRun(registry, {
        entityType: 'code-node',
        entityPath: '/path',
        entityName: 'Entity',
        input: { n: 2 },
        inputDescription: 'Run 2',
        passed: true,
      });

      const entity = Object.values(registry.entities)[0];
      const progress = formatEntityProgress(entity, 3);

      expect(progress).toBe('[==-] 2/3');
    });
  });
});
