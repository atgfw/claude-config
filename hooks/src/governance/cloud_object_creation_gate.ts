/**
 * Cloud Object Creation Gate
 *
 * P0-CRITICAL: Blocks ALL cloud object creation/update MCP tools unless
 * the hierarchical development pipeline was followed:
 * 1. PROJECT-DIRECTIVE.md exists
 * 2. Spec files exist for the entity
 * 3. test-run-registry has 3 novel runs
 * 4. Local version-controlled files exist
 *
 * Root cause: Correction ledger 6367b84b1230db23 - Claude deployed 4
 * workflows to cloud bypassing all file-based governance gates.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
import { logBlocked, logAllowed, logWarn, getClaudeDir } from '../utils.js';
import { registerHook } from '../runner.js';

// ============================================================================
// Tool Matching
// ============================================================================

const CLOUD_TOOL_PATTERNS = [
  /^mcp__n8n-mcp__n8n_create_workflow$/,
  /^mcp__n8n-mcp__n8n_update_workflow$/,
  /^mcp__elevenlabs__/,
  /^mcp__servicetitan__/,
];

const N8N_READ_ONLY = new Set([
  'mcp__n8n-mcp__n8n_get_workflow',
  'mcp__n8n-mcp__n8n_list_workflows',
  'mcp__n8n-mcp__n8n_executions',
  'mcp__n8n-mcp__n8n_health_check',
]);

/**
 * Check if a tool name matches cloud creation/update patterns
 */
export function isCloudCreationTool(toolName: string): boolean {
  if (N8N_READ_ONLY.has(toolName)) {
    return false;
  }

  return CLOUD_TOOL_PATTERNS.some((pattern) => pattern.test(toolName));
}

// ============================================================================
// Entity Name Extraction
// ============================================================================

/**
 * Extract entity name from tool input
 */
export function extractEntityName(toolInput: Record<string, unknown>): string | null {
  // Direct name field
  if (typeof toolInput['name'] === 'string') {
    return toolInput['name'];
  }

  // Nested workflow.name
  const workflow = toolInput['workflow'];
  if (
    workflow &&
    typeof workflow === 'object' &&
    typeof (workflow as Record<string, unknown>)['name'] === 'string'
  ) {
    return (workflow as Record<string, unknown>)['name'] as string;
  }

  // agent_name for ElevenLabs
  if (typeof toolInput['agent_name'] === 'string') {
    return toolInput['agent_name'];
  }

  return null;
}

// ============================================================================
// PROJECT-DIRECTIVE.md Walk-up
// ============================================================================

/**
 * Walk up directory tree looking for PROJECT-DIRECTIVE.md
 */
export function findProjectDirective(startDir: string): string | null {
  let current = path.resolve(startDir);
  const root = path.parse(current).root;

  // Safety limit to prevent infinite loops
  let depth = 0;
  const maxDepth = 50;

  while (depth < maxDepth) {
    const candidate = path.join(current, 'PROJECT-DIRECTIVE.md');
    if (fs.existsSync(candidate)) {
      return candidate;
    }

    if (current === root) {
      return null;
    }

    current = path.dirname(current);
    depth++;
  }

  return null;
}

// ============================================================================
// Test Run Registry Check
// ============================================================================

/**
 * Normalize entity name for matching (snake_case and kebab-case equivalence)
 */
function normalizeEntityName(name: string): string {
  return name.toLowerCase().replaceAll(/[-_]/g, '');
}

/**
 * Check test-run-registry for novel run count
 */
export function checkTestRunRegistry(registryPath: string, entityName: string): number {
  if (!fs.existsSync(registryPath)) {
    return 0;
  }

  try {
    const content = fs.readFileSync(registryPath, 'utf8');
    const registry = JSON.parse(content) as {
      entities: Record<string, { novelInputHashes?: string[] }>;
    };

    const normalized = normalizeEntityName(entityName);

    for (const [key, entity] of Object.entries(registry.entities)) {
      if (normalizeEntityName(key) === normalized) {
        return entity.novelInputHashes?.length ?? 0;
      }
    }

    return 0;
  } catch {
    return 0;
  }
}

// ============================================================================
// Helpers
// ============================================================================

const REQUIRED_NOVEL_RUNS = 3;

function allow(reason?: string): PreToolUseOutput {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      ...(reason ? { permissionDecisionReason: reason } : {}),
    },
  };
}

function deny(reason: string): PreToolUseOutput {
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: reason,
    },
  };
}

// ============================================================================
// Hook Implementation
// ============================================================================

export async function cloudObjectCreationGateHook(
  input: PreToolUseInput,
  options?: { cwd?: string }
): Promise<PreToolUseOutput> {
  const toolName = input.tool_name ?? '';

  // Only intercept cloud creation/update tools
  if (!isCloudCreationTool(toolName)) {
    return allow();
  }

  // Check bypass
  if (process.env['CLOUD_GATE_BYPASS'] === '1') {
    logWarn('CLOUD_GATE_BYPASS active - skipping precondition checks');
    return allow('CLOUD_GATE_BYPASS active - skipping precondition checks');
  }

  const toolInput = input.tool_input as Record<string, unknown>;
  const entityName = extractEntityName(toolInput);

  // Check 1: PROJECT-DIRECTIVE.md
  const cwd = options?.cwd ?? process.cwd();
  const directive = findProjectDirective(cwd);
  if (!directive) {
    logBlocked('Missing PROJECT-DIRECTIVE.md', 'Cloud Object Creation Gate');
    return deny(
      `BLOCKED: Missing PROJECT-DIRECTIVE.md in ${cwd} or any parent directory. ` +
        'Create a PROJECT-DIRECTIVE.md before deploying cloud objects.'
    );
  }

  // Remaining checks require entity name
  if (!entityName) {
    logAllowed('Cloud tool allowed - could not extract entity name for further checks');
    return allow('Entity name not extractable - PROJECT-DIRECTIVE.md check passed');
  }

  // Check 2: Spec files
  // Look in common spec locations
  const specLocations = [
    path.join(cwd, 'specs', entityName),
    path.join(cwd, 'specs', entityName.replaceAll('_', '-')),
    path.join(getClaudeDir(), 'hooks', 'specs', entityName),
    path.join(getClaudeDir(), 'openspec', 'specs', entityName),
    path.join(getClaudeDir(), 'openspec', 'specs', entityName.replaceAll('_', '-')),
  ];

  const specExists = specLocations.some((location) => fs.existsSync(location));
  if (!specExists) {
    logBlocked(`Missing spec for entity: ${entityName}`, 'Cloud Object Creation Gate');
    return deny(
      `BLOCKED: Missing spec for entity "${entityName}". ` +
        `Create a spec directory at one of: ${specLocations.slice(0, 2).join(', ')}`
    );
  }

  // Check 3: Test run registry (3 novel runs)
  const registryPath = path.join(getClaudeDir(), 'ledger', 'test-run-registry.json');
  const novelRuns = checkTestRunRegistry(registryPath, entityName);
  if (novelRuns < REQUIRED_NOVEL_RUNS) {
    logBlocked(
      `Primordial pipeline incomplete: ${novelRuns}/${REQUIRED_NOVEL_RUNS} novel runs for ${entityName}`,
      'Cloud Object Creation Gate'
    );
    return deny(
      `BLOCKED: Primordial pipeline incomplete: ${novelRuns}/${REQUIRED_NOVEL_RUNS} novel runs for "${entityName}". ` +
        `Complete ${REQUIRED_NOVEL_RUNS} test runs with unique input data before deploying to cloud.`
    );
  }

  // Check 4: Local files exist
  const localLocations = [
    path.join(cwd, `${entityName}.json`),
    path.join(cwd, `${entityName.replaceAll('_', '-')}.json`),
    path.join(cwd, 'workflows', `${entityName}.json`),
    path.join(cwd, 'workflows', `${entityName.replaceAll('_', '-')}.json`),
    path.join(cwd, 'src', `${entityName}.ts`),
    path.join(cwd, 'src', `${entityName}.js`),
  ];

  const localExists = localLocations.some((location) => fs.existsSync(location));
  if (!localExists) {
    logBlocked(`No local files for entity: ${entityName}`, 'Cloud Object Creation Gate');
    return deny(
      `BLOCKED: No local files for entity "${entityName}". ` +
        'Build and test locally before deploying to cloud.'
    );
  }

  logAllowed(`Cloud gate passed for ${entityName}`);
  return allow(`All preconditions met for "${entityName}"`);
}

// Register the hook
registerHook('cloud-object-creation-gate', 'PreToolUse', cloudObjectCreationGateHook);

export default cloudObjectCreationGateHook;
