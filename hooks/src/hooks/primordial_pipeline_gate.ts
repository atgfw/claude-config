/**
 * Primordial Pipeline Gate Hook
 *
 * ENFORCES the 3-novel-test-run requirement before allowing build:
 * 1. Every entity must pass 3 complete end-to-end test runs
 * 2. Each run must use NOVEL input data (unique hash)
 * 3. Parent entities require ALL children to be healthy
 * 4. No weak links - single unhealthy child blocks parent
 *
 * This hook checks the test run registry before allowing:
 * - Implementation code writes
 * - Parent entity creation when children unhealthy
 * - Building upon untested/undertested entities
 *
 * Part of the Spinal Cord governance system.
 */

import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
import { log, logBlocked, logAllowed } from '../utils.js';
import { registerHook } from '../runner.js';
import {
  loadRegistry,
  checkEntityHealth,
  getEntityByPath,
  formatHealthReport,
  formatEntityProgress,
  type HealthCheckResult,
  type EntityType,
} from '../ledger/test_run_registry.js';

// ============================================================================
// Configuration
// ============================================================================

/**
 * Patterns for implementation code (requires health check)
 */
const IMPLEMENTATION_PATTERNS = [
  /[/\\]src[/\\]/i,
  /[/\\]lib[/\\]/i,
  /[/\\]app[/\\]/i,
  /[/\\]components[/\\]/i,
  /[/\\]services[/\\]/i,
  /[/\\]api[/\\]/i,
  /[/\\]routes[/\\]/i,
  /[/\\]controllers[/\\]/i,
  /[/\\]models[/\\]/i,
  /[/\\]utils[/\\]/i,
  /[/\\]helpers[/\\]/i,
];

/**
 * Patterns that are EXEMPT from primordial pipeline check
 * (specs, tests, docs, config)
 */
const EXEMPT_PATTERNS = [
  /[/\\]openspec[/\\]/i,
  /[/\\]specs[/\\]/i,
  /[/\\]tests[/\\]/i,
  /[/\\]__tests__[/\\]/i,
  /[/\\]fixtures[/\\]/i,
  /[/\\]mocks[/\\]/i,
  /\.test\.(ts|js|tsx|jsx)$/i,
  /\.spec\.(ts|js|tsx|jsx)$/i,
  /\.md$/i,
  /\.json$/i,
  /\.yaml$/i,
  /\.yml$/i,
  /\.config\.(ts|js)$/i,
  /vitest\.config/i,
  /jest\.config/i,
  /tsconfig/i,
  /package\.json$/i,
  /\.env/i,
];

/**
 * Mapping of file patterns to entity types
 */
const ENTITY_TYPE_PATTERNS: { pattern: RegExp; type: EntityType }[] = [
  { pattern: /[/\\]code-nodes[/\\]/i, type: 'code-node' },
  { pattern: /[/\\]nodes[/\\]/i, type: 'node' },
  { pattern: /[/\\]subworkflows[/\\]/i, type: 'subworkflow' },
  { pattern: /[/\\]workflows[/\\]/i, type: 'parent-workflow' },
  { pattern: /[/\\]agents[/\\]/i, type: 'agent' },
  { pattern: /[/\\]prompts[/\\]/i, type: 'prompt' },
  { pattern: /[/\\]orchestrators[/\\]/i, type: 'orchestrator' },
];

// ============================================================================
// Detection Functions
// ============================================================================

function isImplementationCode(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return IMPLEMENTATION_PATTERNS.some((p) => p.test(normalized));
}

function isExempt(filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  return EXEMPT_PATTERNS.some((p) => p.test(normalized));
}

function detectEntityType(filePath: string): EntityType | null {
  const normalized = filePath.replace(/\\/g, '/');
  for (const { pattern, type } of ENTITY_TYPE_PATTERNS) {
    if (pattern.test(normalized)) {
      return type;
    }
  }
  return null;
}

// Note: extractEntityName and findParentEntityPath are reserved for future use
// when we implement automatic hierarchy detection based on file paths

// ============================================================================
// Input Extraction
// ============================================================================

function extractFilePath(input: PreToolUseInput): string | null {
  const toolInput = input.tool_input;
  if (!toolInput || typeof toolInput !== 'object') {
    return null;
  }

  const filePath = toolInput['file_path'];
  return typeof filePath === 'string' ? filePath : null;
}

// ============================================================================
// Health Check Logic
// ============================================================================

interface GateCheckResult {
  allowed: boolean;
  entityPath: string | null;
  entityType: EntityType | null;
  healthResult: HealthCheckResult | null;
  reason: string;
}

function performGateCheck(filePath: string): GateCheckResult {
  // Check if exempt
  if (isExempt(filePath)) {
    return {
      allowed: true,
      entityPath: null,
      entityType: null,
      healthResult: null,
      reason: 'File is exempt from primordial pipeline check (spec/test/config)',
    };
  }

  // Check if implementation code
  if (!isImplementationCode(filePath)) {
    return {
      allowed: true,
      entityPath: null,
      entityType: null,
      healthResult: null,
      reason: 'File is not implementation code',
    };
  }

  // Detect entity type
  const entityType = detectEntityType(filePath);
  if (!entityType) {
    // Unknown entity type - allow but warn
    return {
      allowed: true,
      entityPath: filePath,
      entityType: null,
      healthResult: null,
      reason: 'Entity type not recognized - primordial check skipped',
    };
  }

  // Load registry and check health
  const registry = loadRegistry();
  const entity = getEntityByPath(registry, filePath);

  if (!entity) {
    // Entity not registered - this is a NEW entity being created
    // Allow creation but it starts as untested
    return {
      allowed: true,
      entityPath: filePath,
      entityType,
      healthResult: null,
      reason: 'New entity - will start as UNTESTED status',
    };
  }

  // Check entity health
  const healthResult = checkEntityHealth(registry, entity.entityId, true);

  if (!healthResult.isHealthy) {
    return {
      allowed: false,
      entityPath: filePath,
      entityType,
      healthResult,
      reason: healthResult.blockReason ?? 'Entity not healthy',
    };
  }

  return {
    allowed: true,
    entityPath: filePath,
    entityType,
    healthResult,
    reason: 'Entity passed primordial pipeline gate',
  };
}

// ============================================================================
// Formatting
// ============================================================================

function generateBlockMessage(result: GateCheckResult): string {
  const lines: string[] = [];

  lines.push('');
  lines.push('[PRIMORDIAL PIPELINE GATE BLOCKED]');
  lines.push('');
  lines.push('REQUIREMENT: Every entity must pass 3 complete end-to-end');
  lines.push('             test runs with NOVEL input data before building upon.');
  lines.push('');

  if (result.healthResult) {
    lines.push('ENTITY STATUS:');
    lines.push(
      formatHealthReport(result.healthResult)
        .split('\n')
        .map((l) => `  ${l}`)
        .join('\n')
    );
    lines.push('');
  }

  lines.push('BLOCK REASON:');
  lines.push(`  ${result.reason}`);
  lines.push('');

  lines.push('REQUIRED ACTIONS:');
  if (result.healthResult) {
    if (result.healthResult.missingRuns > 0) {
      lines.push(`  1. Run ${result.healthResult.missingRuns} more test(s) with NOVEL input data`);
      lines.push('  2. Each test must use UNIQUE input (different hash)');
      lines.push('  3. All tests must PASS');
    }
    if (result.healthResult.unhealthyChildren.length > 0) {
      lines.push('');
      lines.push('  UNHEALTHY CHILDREN (must fix first):');
      for (const childId of result.healthResult.unhealthyChildren) {
        lines.push(`    - ${childId}`);
      }
    }
  }
  lines.push('');

  lines.push('PRIMORDIAL PIPELINE PATTERN:');
  lines.push('  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐');
  lines.push('  │ Test Run 1   │ → │ Test Run 2   │ → │ Test Run 3   │');
  lines.push('  │ Novel Input  │   │ Novel Input  │   │ Novel Input  │');
  lines.push('  │ (unique)     │   │ (different)  │   │ (different)  │');
  lines.push('  └──────────────┘   └──────────────┘   └──────────────┘');
  lines.push('         ↓                  ↓                  ↓');
  lines.push('       PASS              PASS              PASS');
  lines.push('                          ↓');
  lines.push('                   [ENTITY HEALTHY]');
  lines.push('                          ↓');
  lines.push('                   [BUILD GATE OPENS]');

  return lines.join('\n');
}

// ============================================================================
// Hook Implementation
// ============================================================================

export async function primordialPipelineGateHook(
  input: PreToolUseInput
): Promise<PreToolUseOutput> {
  const filePath = extractFilePath(input);

  if (!filePath) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  log(`[PRIMORDIAL GATE] Checking: ${filePath}`);

  const result = performGateCheck(filePath);

  if (!result.allowed) {
    log(generateBlockMessage(result));

    logBlocked('Primordial Pipeline Gate', result.reason);

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `PRIMORDIAL PIPELINE BLOCKED: ${result.reason}. Entity requires ${result.healthResult?.requiredRuns ?? 3} novel test runs before building upon.`,
      },
    };
  }

  // Log status for awareness
  if (result.healthResult) {
    const registry = loadRegistry();
    const entity = getEntityByPath(registry, filePath);
    if (entity) {
      log(
        `[PRIMORDIAL GATE] ${formatEntityProgress(entity, registry.config.requiredNovelRuns)} ${entity.status.toUpperCase()}`
      );
    }
  }

  logAllowed(result.reason);

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
    },
  };
}

// Register the hook
registerHook('primordial-pipeline-gate', 'PreToolUse', primordialPipelineGateHook);

export default primordialPipelineGateHook;
