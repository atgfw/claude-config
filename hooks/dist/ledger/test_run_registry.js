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
// Registry File Operations
// ============================================================================
const REGISTRY_PATH = path.join(os.homedir(), '.claude', 'ledger', 'test-run-registry.json');
function getDefaultRegistry() {
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
export function loadRegistry() {
    try {
        if (fs.existsSync(REGISTRY_PATH)) {
            const content = fs.readFileSync(REGISTRY_PATH, 'utf-8');
            return JSON.parse(content);
        }
    }
    catch {
        // Fall through to default
    }
    return getDefaultRegistry();
}
export function saveRegistry(registry) {
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
export function generateInputHash(input) {
    const normalized = JSON.stringify(input, Object.keys(input).sort());
    const hash = crypto.createHash('sha256').update(normalized).digest('hex');
    return hash.substring(0, 16); // 16 char prefix for readability
}
export function generateEntityId(entityType, entityPath) {
    const hash = crypto.createHash('sha256').update(`${entityType}:${entityPath}`).digest('hex');
    return hash.substring(0, 16);
}
export function generateRunId() {
    return crypto.randomBytes(8).toString('hex');
}
// ============================================================================
// Entity Management
// ============================================================================
export function getOrCreateEntity(registry, entityType, entityPath, entityName, parentEntityId) {
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
export function registerChild(registry, parentEntityId, childEntityId) {
    const parent = registry.entities[parentEntityId];
    const child = registry.entities[childEntityId];
    if (parent && child) {
        if (!parent.children.includes(childEntityId)) {
            parent.children.push(childEntityId);
        }
        child.parentEntityId = parentEntityId;
    }
}
export function recordTestRun(registry, params) {
    const entity = getOrCreateEntity(registry, params.entityType, params.entityPath, params.entityName, params.parentEntityId);
    const inputHash = generateInputHash(params.input);
    const isNovel = !entity.novelInputHashes.includes(inputHash);
    const testRun = {
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
function updateEntityStatus(registry, entity) {
    const requiredRuns = registry.config.requiredNovelRuns;
    // Count unique passing input hashes
    const uniquePassingHashes = new Set();
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
    }
    else if (hasFailures) {
        entity.status = 'failing';
    }
    else if (novelPassCount > 0) {
        entity.status = 'testing';
    }
    else {
        entity.status = 'untested';
    }
}
export function markEntityStale(registry, entityId) {
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
export function checkEntityHealth(registry, entityId, checkChildren = true) {
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
    const uniquePassingHashes = new Set();
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
    const unhealthyChildren = [];
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
    let blockReason;
    if (!isHealthy) {
        const reasons = [];
        if (entity.status === 'stale') {
            reasons.push('Entity code modified - needs re-testing');
        }
        else if (entity.status === 'failing') {
            reasons.push('Entity has failing test runs');
        }
        else if (novelRunCount < requiredRuns) {
            reasons.push(`Only ${novelRunCount}/${requiredRuns} novel test runs completed`);
        }
        if (!childrenHealthy) {
            reasons.push(`${unhealthyChildren.length} child entities not healthy: ${unhealthyChildren.join(', ')}`);
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
export function buildHierarchy(registry, rootEntityId) {
    const allDescendants = [];
    let maxDepth = 0;
    function traverse(entityId, depth) {
        const entity = registry.entities[entityId];
        if (!entity)
            return;
        maxDepth = Math.max(maxDepth, depth);
        for (const childId of entity.children) {
            allDescendants.push(childId);
            traverse(childId, depth + 1);
        }
    }
    traverse(rootEntityId, 0);
    // Check health of all entities
    const unhealthyEntities = [];
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
    const hierarchy = {
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
export function getEntityByPath(registry, entityPath) {
    return Object.values(registry.entities).find((e) => e.entityPath === entityPath);
}
export function getUnhealthyEntities(registry) {
    return Object.values(registry.entities).filter((e) => e.status !== 'healthy');
}
export function getTestingSummary(registry) {
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
export function formatHealthReport(result) {
    const lines = [];
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
export function formatEntityProgress(entity, requiredRuns) {
    const bar = '='.repeat(entity.novelInputHashes.length) +
        '-'.repeat(Math.max(0, requiredRuns - entity.novelInputHashes.length));
    return `[${bar}] ${entity.novelInputHashes.length}/${requiredRuns}`;
}
//# sourceMappingURL=test_run_registry.js.map