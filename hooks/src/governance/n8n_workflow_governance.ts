/**
 * N8N Workflow Governance Hook
 *
 * PREVENTS duplicate workflow creation by checking live n8n instance
 * before allowing n8n_create_workflow operations.
 *
 * Part of the Spinal Cord - global governance for child projects.
 *
 * Rules:
 * - Deletion BLOCKED (archive instead)
 * - Only DEV workflows can be modified
 * - Before creating, check ALL live workflows for duplicates
 * - New workflows auto-tagged as DEV
 */

import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
import { log, logBlocked, logAllowed, loadEnv } from '../utils.js';
import { registerHook } from '../runner.js';
import * as https from 'node:https';
import * as http from 'node:http';

interface N8nWorkflow {
  id: string;
  name: string;
  description?: string;
  active?: boolean;
  tags?: Array<{ id: string; name: string } | string>;
}

interface SimilarWorkflow {
  id: string;
  name: string;
  description?: string;
  similarity: number;
  source: 'n8n-api' | 'registry' | 'governance';
  active?: boolean;
}

/**
 * Get N8N API key from environment
 */
function getN8nApiKey(): string | null {
  loadEnv();
  return process.env['N8N_API_KEY'] ?? null;
}

/**
 * Get N8N base URL from environment
 */
function getN8nBaseUrl(): string {
  loadEnv();
  return process.env['N8N_BASE_URL'] ?? 'https://n8n.atgfw.com';
}

/**
 * Calculate word-based similarity between two strings
 * Returns score 0-100 using Jaccard similarity
 */
function calculateSimilarity(str1: string, str2: string): number {
  if (!str1 || !str2) return 0;

  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, '');
  const words1 = new Set(
    normalize(str1)
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );
  const words2 = new Set(
    normalize(str2)
      .split(/\s+/)
      .filter((w) => w.length > 2)
  );

  if (words1.size === 0 || words2.size === 0) return 0;

  const intersection = [...words1].filter((w) => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;

  return Math.round((intersection / union) * 100);
}

/**
 * Fetch ALL workflows from n8n API
 * CRITICAL: This prevents duplicate workflow creation
 */
async function fetchAllWorkflowsFromN8n(): Promise<N8nWorkflow[]> {
  const apiKey = getN8nApiKey();
  const baseUrl = getN8nBaseUrl();

  if (!apiKey) {
    log('[GOVERNANCE] N8N_API_KEY not set, cannot fetch workflow list');
    return [];
  }

  try {
    const url = new URL(`${baseUrl}/api/v1/workflows`);
    const protocol = url.protocol === 'https:' ? https : http;

    return new Promise((resolve) => {
      const req = protocol.get(
        url.href,
        {
          headers: { 'X-N8N-API-KEY': apiKey },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              const workflows = parsed.data ?? parsed ?? [];
              log(`[GOVERNANCE] Fetched ${workflows.length} workflows from n8n`);
              resolve(workflows);
            } catch (e) {
              log(`[GOVERNANCE] Failed to parse workflow list: ${e}`);
              resolve([]);
            }
          });
        }
      );
      req.on('error', (e) => {
        log(`[GOVERNANCE] Error fetching workflows: ${e.message}`);
        resolve([]);
      });
      req.setTimeout(10000, () => {
        req.destroy();
        resolve([]);
      });
    });
  } catch (e) {
    log(`[GOVERNANCE] Exception fetching workflows: ${e}`);
    return [];
  }
}

/**
 * Find similar workflows from the live n8n instance
 */
function findSimilarWorkflows(name: string, liveWorkflows: N8nWorkflow[]): SimilarWorkflow[] {
  const matches: SimilarWorkflow[] = [];
  const searchText = name;

  for (const workflow of liveWorkflows) {
    const workflowText = `${workflow.name ?? ''} ${workflow.description ?? ''}`;
    const score = calculateSimilarity(searchText, workflowText);

    if (score >= 30) {
      matches.push({
        id: workflow.id,
        name: workflow.name,
        description: workflow.description ?? '(no description)',
        similarity: score,
        source: 'n8n-api',
        active: workflow.active,
      });
    }
  }

  return matches.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Handle pre-create workflow check
 * BLOCKS creation if very similar workflow exists
 */
async function handlePreCreate(input: PreToolUseInput): Promise<PreToolUseOutput> {
  const toolInput = input.tool_input as Record<string, unknown>;
  const name = (toolInput['name'] as string) ?? '';

  log(`[GOVERNANCE] Pre-create check for workflow: "${name}"`);

  // Fetch live workflows from n8n
  const liveWorkflows = await fetchAllWorkflowsFromN8n();

  if (liveWorkflows.length === 0) {
    log('[GOVERNANCE] WARNING: Could not fetch live workflows - precedent check incomplete');
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason: `GOVERNANCE WARNING: Could not verify against live workflows. Proceeding with caution.`,
      },
    };
  }

  // Find similar workflows
  const similar = findSimilarWorkflows(name, liveWorkflows);
  const top = similar[0];

  if (top && top.similarity >= 70) {
    // BLOCK - very similar workflow exists
    logBlocked(
      `Found very similar workflow "${top.name}" (${top.similarity}% match)`,
      'Before creating workflows, check for existing similar workflows to prevent duplication.'
    );

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `GOVERNANCE BLOCKED: Very similar workflow "${top.name}" exists (${top.similarity}% match, ID: ${top.id}). Review existing workflow with n8n_get_workflow(id: "${top.id}") before creating new.`,
      },
    };
  } else if (top && top.similarity >= 40) {
    // WARN but allow
    const topMatches = similar
      .slice(0, 5)
      .map((m) => `  - "${m.name}" (${m.similarity}% match)`)
      .join('\n');

    log(`[GOVERNANCE] Found ${similar.length} similar workflows:\n${topMatches}`);

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason: `GOVERNANCE WARNING: Found ${similar.length} similar workflows:\n${topMatches}\n\nReview these before proceeding. Is this truly new functionality?`,
      },
    };
  }

  // No similar workflows found
  logAllowed(`Checked ${liveWorkflows.length} live workflows - no duplicates found`);

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: `GOVERNANCE: Checked ${liveWorkflows.length} live workflows - no similar found. New workflow will be tagged as DEV.`,
    },
  };
}

/**
 * Handle pre-delete - ALWAYS BLOCK
 */
async function handlePreDelete(input: PreToolUseInput): Promise<PreToolUseOutput> {
  const toolInput = input.tool_input as Record<string, unknown>;
  const workflowId = toolInput['id'] as string;

  logBlocked('Workflow deletion is not allowed', 'Deletion is banned - archive workflows instead');

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `GOVERNANCE BLOCKED: Deletion is not allowed. Archive the workflow instead by adding "archived" tag or updating to ARCHIVED phase. Workflow ID: ${workflowId}`,
    },
  };
}

/**
 * Main n8n workflow governance hook
 */
export async function n8nWorkflowGovernanceHook(input: PreToolUseInput): Promise<PreToolUseOutput> {
  const toolName = input.tool_name ?? '';

  log(`[GOVERNANCE] n8n tool: ${toolName}`);

  // Route to appropriate handler
  if (toolName.includes('n8n_create_workflow')) {
    return handlePreCreate(input);
  }

  if (toolName.includes('n8n_delete_workflow')) {
    return handlePreDelete(input);
  }

  // Allow other n8n operations with logging
  logAllowed(`n8n operation allowed: ${toolName}`);

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
    },
  };
}

// Register the hook
registerHook('n8n-workflow-governance', 'PreToolUse', n8nWorkflowGovernanceHook);

export default n8nWorkflowGovernanceHook;
