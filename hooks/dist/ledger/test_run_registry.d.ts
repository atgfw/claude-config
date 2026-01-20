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
export type EntityType = 'code-node' | 'node' | 'subworkflow' | 'parent-workflow' | 'agent' | 'prompt' | 'orchestrator';
export type EntityStatus = 'untested' | 'testing' | 'healthy' | 'failing' | 'stale';
export interface TestRun {
    id: string;
    timestamp: string;
    inputHash: string;
    inputDescription: string;
    passed: boolean;
    outputHash?: string;
    duration?: number;
    error?: string;
}
export interface EntityRecord {
    entityId: string;
    entityType: EntityType;
    entityPath: string;
    entityName: string;
    parentEntityId?: string;
    children: string[];
    testRuns: TestRun[];
    novelInputHashes: string[];
    status: EntityStatus;
    healthyAt?: string;
    lastTestedAt?: string;
    lastModifiedAt?: string;
    codeHash?: string;
    evaluationConfigured?: boolean;
    evaluationSuccessRate?: number;
    evaluationTestCaseCount?: number;
    productionChecklistCompleted?: boolean;
    evaluationGateResult?: 'pass' | 'fail' | 'skipped';
    evaluationGateTimestamp?: string;
}
export interface HierarchyRecord {
    rootEntityId: string;
    allDescendants: string[];
    depth: number;
    totalEntities: number;
    allHealthy: boolean;
    unhealthyEntities: string[];
}
export interface RegistryConfig {
    requiredNovelRuns: number;
    inputHashAlgorithm: string;
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
export declare function loadRegistry(): TestRunRegistry;
export declare function saveRegistry(registry: TestRunRegistry): void;
export declare function generateInputHash(input: unknown): string;
export declare function generateEntityId(entityType: EntityType, entityPath: string): string;
export declare function generateRunId(): string;
export declare function getOrCreateEntity(registry: TestRunRegistry, entityType: EntityType, entityPath: string, entityName: string, parentEntityId?: string): EntityRecord;
export declare function registerChild(registry: TestRunRegistry, parentEntityId: string, childEntityId: string): void;
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
export declare function recordTestRun(registry: TestRunRegistry, params: RecordTestRunParams): {
    entity: EntityRecord;
    isNovel: boolean;
    novelCount: number;
};
export declare function markEntityStale(registry: TestRunRegistry, entityId: string): void;
export declare function checkEntityHealth(registry: TestRunRegistry, entityId: string, checkChildren?: boolean): HealthCheckResult;
export declare function buildHierarchy(registry: TestRunRegistry, rootEntityId: string): HierarchyRecord;
export declare function getEntityByPath(registry: TestRunRegistry, entityPath: string): EntityRecord | undefined;
export declare function getUnhealthyEntities(registry: TestRunRegistry): EntityRecord[];
export declare function getTestingSummary(registry: TestRunRegistry): {
    total: number;
    healthy: number;
    testing: number;
    untested: number;
    failing: number;
    stale: number;
};
export declare function formatHealthReport(result: HealthCheckResult): string;
export declare function formatEntityProgress(entity: EntityRecord, requiredRuns: number): string;
//# sourceMappingURL=test_run_registry.d.ts.map