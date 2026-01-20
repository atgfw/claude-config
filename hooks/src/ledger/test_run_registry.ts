/**
 * Test Run Registry - Primordial Pipeline Chain Enforcement
 *
 * Tracks test executions per entity to ensure:
 * 1. Minimum 3 complete end-to-end test runs per entity
 * 2. Each test run uses NOVEL input data (unique hash)
 * 3. Hierarchical entities require ALL children to be healthy
 * 4. No weak links - single unhealthy child blocks parent
 *
 * Part of the Spinal Cord governance system.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import * as os from 'node:os';

// ============================================================================
// Types
// ============================================================================

export type EntityType =
  | 'code-node'
  | 'node'
  | 'subworkflow'
  | 'parent-workflow'
  | 'agent'
  | 'prompt'
  | 'orchestrator';

export type EntityStatus =
  | 'untested' // No test runs recorded
  | 'testing' // 1-2 novel test runs (not yet healthy)
  | 'healthy' // 3+ novel test runs, all passing
  | 'failing' // Has test failures
  | 'stale'; // Code changed after last test

export interface TestRun {
  id: string; // Unique run ID
  timestamp: string; // ISO timestamp
  inputHash: string; // SHA-256 prefix of input data
  inputDescription: string; // Human-readable description
  passed: boolean; // Test result
  outputHash?: string; // For regression detection
  duration?: number; // Execution time in ms
  error?: string; // Error message if failed
}

export interface EntityRecord {
  entityId: string; // Unique identifier
  entityType: EntityType; // Type of entity
  entityPath: string; // File path or workflow ID
  entityName: string; // Human-readable name
  parentEntityId?: string; // Parent in hierarchy
  children: string[]; // Child entity IDs
  testRuns: TestRun[]; // All test runs
  novelInputHashes: string[]; // Unique input hashes seen
  status: EntityStatus; // Current health status
  healthyAt?: string; // When achieved healthy status
  lastTestedAt?: string; // Last test timestamp
  lastModifiedAt?: string; // Last code modification
  codeHash?: string; // Hash of current code (for staleness)
  // n8n Evaluation Gate fields
  evaluationConfigured?: boolean; // Has Evaluation Trigger node
  evaluationSuccessRate?: number; // Last calculated success rate (0-1)
  evaluationTestCaseCount?: number; // Number of evaluation test cases
  productionChecklistCompleted?: boolean; // All checklist items done
  evaluationGateResult?: 'pass' | 'fail' | 'skipped'; // Last gate check result
  evaluationGateTimestamp?: string; // When gate was last checked
}

export interface HierarchyRecord {
  rootEntityId: string; // Root of hierarchy
  allDescendants: string[]; // All descendant entity IDs
  depth: number; // Maximum depth
  totalEntities: number; // Count including root
  allHealthy: boolean; // All entities healthy
  unhealthyEntities: string[]; // List of unhealthy entity IDs
}

export interface RegistryConfig {
  requiredNovelRuns: number; // Default: 3
  inputHashAlgorithm: string; // Default: sha256-prefix-16
}

export interface TestRunRegistry {
  entities: Record<string, EntityRecord>;
  hierarchies: Record<string, HierarchyRecord>;
  config: RegistryConfig;
  lastUpdated: string;
}

export interface HealthCheckResult {
  entityId: string;
  isHealthy: boolean;
  status: EntityStatus;
  novelRunCount: number;
  requiredRuns: number;
  missingRuns: number;
  childrenHealthy: boolean;
  unhealthyChildren: string[];
  blockReason?: string;
}

// ============================================================================
// Registry File Operations
// ============================================================================

const REGISTRY_PATH = path.join(os.homedir(), '.claude', 'ledger', 'test-run-registry.json');

function getDefaultRegistry(): TestRunRegistry {
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

export function loadRegistry(): TestRunRegistry {
  try {
    if (fs.existsSync(REGISTRY_PATH)) {
      const content = fs.readFileSync(REGISTRY_PATH, 'utf-8');
      return JSON.parse(content) as TestRunRegistry;
    }
  } catch {
    // Fall through to default
  }
  return getDefaultRegistry();
}

export function saveRegistry(registry: TestRunRegistry): void {
  registry.lastUpdated = new Date().toISOString();
  const dir = path.dirname(REGISTRY_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(registry, null, 2));
}

// ============================================================================
// Hash Generation
// ============================================================================

export function generateInputHash(input: unknown): string {
  const normalized = JSON.stringify(input, Object.keys(input as object).sort());
  const hash = crypto.createHash('sha256').update(normalized).digest('hex');
  return hash.substring(0, 16); // 16 char prefix for readability
}

export function generateEntityId(entityType: EntityType, entityPath: string): string {
  const hash = crypto.createHash('sha256').update(`${entityType}:${entityPath}`).digest('hex');
  return hash.substring(0, 16);
}

export function generateRunId(): string {
  return crypto.randomBytes(8).toString('hex');
}

// ============================================================================
// Entity Management
// ============================================================================

export function getOrCreateEntity(
  registry: TestRunRegistry,
  entityType: EntityType,
  entityPath: string,
  entityName: string,
  parentEntityId?: string
): EntityRecord {
  const entityId = generateEntityId(entityType, entityPath);

  if (!registry.entities[entityId]) {
    registry.entities[entityId] = {
      entityId,
      entityType,
      entityPath,
      entityName,
      parentEntityId,
      children: [],
      testRuns: [],
      novelInputHashes: [],
      status: 'untested',
    };

    // Add to parent's children list if parent exists
    if (parentEntityId && registry.entities[parentEntityId]) {
      const parent = registry.entities[parentEntityId];
      if (!parent.children.includes(entityId)) {
        parent.children.push(entityId);
      }
    }
  }

  return registry.entities[entityId];
}

export function registerChild(
  registry: TestRunRegistry,
  parentEntityId: string,
  childEntityId: string
): void {
  const parent = registry.entities[parentEntityId];
  const child = registry.entities[childEntityId];

  if (parent && child) {
    if (!parent.children.includes(childEntityId)) {
      parent.children.push(childEntityId);
    }
    child.parentEntityId = parentEntityId;
  }
}

// ============================================================================
// Test Run Recording
// ============================================================================

export interface RecordTestRunParams {
  entityType: EntityType;
  entityPath: string;
  entityName: string;
  input: unknown;
  inputDescription: string;
  passed: boolean;
  output?: unknown;
  duration?: number;
  error?: string;
  parentEntityId?: string;
}

export function recordTestRun(
  registry: TestRunRegistry,
  params: RecordTestRunParams
): { entity: EntityRecord; isNovel: boolean; novelCount: number } {
  const entity = getOrCreateEntity(
    registry,
    params.entityType,
    params.entityPath,
    params.entityName,
    params.parentEntityId
  );

  const inputHash = generateInputHash(params.input);
  const isNovel = !entity.novelInputHashes.includes(inputHash);

  const testRun: TestRun = {
    id: generateRunId(),
    timestamp: new Date().toISOString(),
    inputHash,
    inputDescription: params.inputDescription,
    passed: params.passed,
    outputHash: params.output ? generateInputHash(params.output) : undefined,
    duration: params.duration,
    error: params.error,
  };

  entity.testRuns.push(testRun);
  entity.lastTestedAt = testRun.timestamp;

  if (isNovel) {
    entity.novelInputHashes.push(inputHash);
  }

  // Update status
  updateEntityStatus(registry, entity);

  return {
    entity,
    isNovel,
    novelCount: entity.novelInputHashes.length,
  };
}

// ============================================================================
// Status Calculation
// ============================================================================

function updateEntityStatus(registry: TestRunRegistry, entity: EntityRecord): void {
  const requiredRuns = registry.config.requiredNovelRuns;

  // Count unique passing input hashes
  const uniquePassingHashes = new Set<string>();
  for (const run of entity.testRuns) {
    if (run.passed) {
      uniquePassingHashes.add(run.inputHash);
    }
  }

  const hasFailures = entity.testRuns.some((r) => !r.passed);
  const novelPassCount = uniquePassingHashes.size;

  if (novelPassCount >= requiredRuns) {
    entity.status = 'healthy';
    if (!entity.healthyAt) {
      entity.healthyAt = new Date().toISOString();
    }
  } else if (hasFailures) {
    entity.status = 'failing';
  } else if (novelPassCount > 0) {
    entity.status = 'testing';
  } else {
    entity.status = 'untested';
  }
}

export function markEntityStale(registry: TestRunRegistry, entityId: string): void {
  const entity = registry.entities[entityId];
  if (entity) {
    entity.status = 'stale';
    entity.lastModifiedAt = new Date().toISOString();
    // Clear healthy status - needs re-testing
    entity.healthyAt = undefined;
  }
}

// ============================================================================
// Health Checking - Core Primordial Pipeline Gate
// ============================================================================

export function checkEntityHealth(
  registry: TestRunRegistry,
  entityId: string,
  checkChildren: boolean = true
): HealthCheckResult {
  const entity = registry.entities[entityId];
  const requiredRuns = registry.config.requiredNovelRuns;

  if (!entity) {
    return {
      entityId,
      isHealthy: false,
      status: 'untested',
      novelRunCount: 0,
      requiredRuns,
      missingRuns: requiredRuns,
      childrenHealthy: true,
      unhealthyChildren: [],
      blockReason: `Entity ${entityId} not found in registry - never tested`,
    };
  }

  // Count unique passing input hashes
  const uniquePassingHashes = new Set<string>();
  for (const run of entity.testRuns) {
    if (run.passed) {
      uniquePassingHashes.add(run.inputHash);
    }
  }
  const novelRunCount = uniquePassingHashes.size;
  const missingRuns = Math.max(0, requiredRuns - novelRunCount);

  // Check if entity itself is healthy
  const entityHealthy = entity.status === 'healthy' && novelRunCount >= requiredRuns;

  // Check children recursively
  let childrenHealthy = true;
  const unhealthyChildren: string[] = [];

  if (checkChildren && entity.children.length > 0) {
    for (const childId of entity.children) {
      const childResult = checkEntityHealth(registry, childId, true);
      if (!childResult.isHealthy) {
        childrenHealthy = false;
        unhealthyChildren.push(childId);
        // Also include grandchildren that are unhealthy
        unhealthyChildren.push(...childResult.unhealthyChildren);
      }
    }
  }

  const isHealthy = entityHealthy && childrenHealthy;

  let blockReason: string | undefined;
  if (!isHealthy) {
    const reasons: string[] = [];

    if (entity.status === 'stale') {
      reasons.push('Entity code modified - needs re-testing');
    } else if (entity.status === 'failing') {
      reasons.push('Entity has failing test runs');
    } else if (novelRunCount < requiredRuns) {
      reasons.push(`Only ${novelRunCount}/${requiredRuns} novel test runs completed`);
    }

    if (!childrenHealthy) {
      reasons.push(
        `${unhealthyChildren.length} child entities not healthy: ${unhealthyChildren.join(', ')}`
      );
    }

    blockReason = reasons.join('; ');
  }

  return {
    entityId,
    isHealthy,
    status: entity.status,
    novelRunCount,
    requiredRuns,
    missingRuns,
    childrenHealthy,
    unhealthyChildren,
    blockReason,
  };
}

// ============================================================================
// Hierarchy Management
// ============================================================================

export function buildHierarchy(registry: TestRunRegistry, rootEntityId: string): HierarchyRecord {
  const allDescendants: string[] = [];
  let maxDepth = 0;

  function traverse(entityId: string, depth: number): void {
    const entity = registry.entities[entityId];
    if (!entity) return;

    maxDepth = Math.max(maxDepth, depth);

    for (const childId of entity.children) {
      allDescendants.push(childId);
      traverse(childId, depth + 1);
    }
  }

  traverse(rootEntityId, 0);

  // Check health of all entities
  const unhealthyEntities: string[] = [];
  const rootResult = checkEntityHealth(registry, rootEntityId, false);
  if (!rootResult.isHealthy) {
    unhealthyEntities.push(rootEntityId);
  }

  for (const descendantId of allDescendants) {
    const result = checkEntityHealth(registry, descendantId, false);
    if (!result.isHealthy) {
      unhealthyEntities.push(descendantId);
    }
  }

  const hierarchy: HierarchyRecord = {
    rootEntityId,
    allDescendants,
    depth: maxDepth,
    totalEntities: allDescendants.length + 1,
    allHealthy: unhealthyEntities.length === 0,
    unhealthyEntities,
  };

  registry.hierarchies[rootEntityId] = hierarchy;
  return hierarchy;
}

// ============================================================================
// Query Functions
// ============================================================================

export function getEntityByPath(
  registry: TestRunRegistry,
  entityPath: string
): EntityRecord | undefined {
  return Object.values(registry.entities).find((e) => e.entityPath === entityPath);
}

export function getUnhealthyEntities(registry: TestRunRegistry): EntityRecord[] {
  return Object.values(registry.entities).filter((e) => e.status !== 'healthy');
}

export function getTestingSummary(registry: TestRunRegistry): {
  total: number;
  healthy: number;
  testing: number;
  untested: number;
  failing: number;
  stale: number;
} {
  const entities = Object.values(registry.entities);
  return {
    total: entities.length,
    healthy: entities.filter((e) => e.status === 'healthy').length,
    testing: entities.filter((e) => e.status === 'testing').length,
    untested: entities.filter((e) => e.status === 'untested').length,
    failing: entities.filter((e) => e.status === 'failing').length,
    stale: entities.filter((e) => e.status === 'stale').length,
  };
}

// ============================================================================
// Formatting
// ============================================================================

export function formatHealthReport(result: HealthCheckResult): string {
  const lines: string[] = [];

  lines.push(`Entity: ${result.entityId}`);
  lines.push(`Status: ${result.status.toUpperCase()}`);
  lines.push(`Health: ${result.isHealthy ? 'HEALTHY' : 'NOT HEALTHY'}`);
  lines.push(`Novel Test Runs: ${result.novelRunCount}/${result.requiredRuns}`);

  if (result.missingRuns > 0) {
    lines.push(`Missing Runs: ${result.missingRuns} more novel test runs required`);
  }

  if (!result.childrenHealthy) {
    lines.push(`Unhealthy Children: ${result.unhealthyChildren.join(', ')}`);
  }

  if (result.blockReason) {
    lines.push(`Block Reason: ${result.blockReason}`);
  }

  return lines.join('\n');
}

export function formatEntityProgress(entity: EntityRecord, requiredRuns: number): string {
  const bar =
    '='.repeat(entity.novelInputHashes.length) +
    '-'.repeat(Math.max(0, requiredRuns - entity.novelInputHashes.length));
  return `[${bar}] ${entity.novelInputHashes.length}/${requiredRuns}`;
}
