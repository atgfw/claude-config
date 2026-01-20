/**
 * n8n Workflow Activation Hook (PostToolUse)
 *
 * ENSURES n8n workflows are activated after creation to enable MCP-level access.
 * Webhook triggers only respond when workflows are active.
 *
 * This hook:
 * 1. Intercepts n8n_create_workflow completion
 * 2. Checks if workflow is active
 * 3. Auto-activates if inactive
 * 4. Provides status context to LLM
 *
 * Part of the Spinal Cord governance system.
 */

import type { PostToolUseInput, PostToolUseOutput } from '../types.js';
import { log, logAllowed, loadEnv } from '../utils.js';
import { registerHook } from '../runner.js';
import * as https from 'node:https';
import * as http from 'node:http';

interface N8nWorkflowResult {
  id?: string;
  name?: string;
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
 * Activate a workflow via n8n API
 */
async function activateWorkflow(workflowId: string): Promise<boolean> {
  const apiKey = getN8nApiKey();
  const baseUrl = getN8nBaseUrl();

  if (!apiKey) {
    log('[ACTIVATION] N8N_API_KEY not set, cannot activate workflow');
    return false;
  }

  try {
    const url = new URL(`${baseUrl}/api/v1/workflows/${workflowId}/activate`);
    const protocol = url.protocol === 'https:' ? https : http;

    return new Promise((resolve) => {
      const options = {
        method: 'POST',
        headers: {
          'X-N8N-API-KEY': apiKey,
          'Content-Type': 'application/json',
        },
      };

      const req = protocol.request(url.href, options, (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => {
          if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
            log(`[ACTIVATION] Successfully activated workflow ${workflowId}`);
            resolve(true);
          } else {
            log(`[ACTIVATION] Failed to activate workflow: ${res.statusCode} - ${data}`);
            resolve(false);
          }
        });
      });

      req.on('error', (e) => {
        log(`[ACTIVATION] Error activating workflow: ${e.message}`);
        resolve(false);
      });

      req.setTimeout(10000, () => {
        req.destroy();
        resolve(false);
      });

      req.end();
    });
  } catch (e) {
    log(`[ACTIVATION] Exception activating workflow: ${e}`);
    return false;
  }
}

/**
 * Parse workflow result from tool output
 */
function parseWorkflowResult(toolOutput: unknown): N8nWorkflowResult | null {
  if (!toolOutput) return null;

  // Handle string output (JSON)
  if (typeof toolOutput === 'string') {
    try {
      const parsed = JSON.parse(toolOutput);
      return extractWorkflowData(parsed);
    } catch {
      // Try to extract ID from string patterns like "Created workflow with ID: abc123"
      const idMatch = toolOutput.match(/(?:id|ID)[:\s]+["']?([a-zA-Z0-9-]+)["']?/);
      if (idMatch) {
        return { id: idMatch[1] };
      }
      return null;
    }
  }

  // Handle object output
  if (typeof toolOutput === 'object') {
    return extractWorkflowData(toolOutput as Record<string, unknown>);
  }

  return null;
}

/**
 * Extract workflow data from parsed object
 */
function extractWorkflowData(data: Record<string, unknown>): N8nWorkflowResult | null {
  // Check for direct properties
  if (data['id']) {
    return {
      id: String(data['id']),
      name: data['name'] ? String(data['name']) : undefined,
      active: typeof data['active'] === 'boolean' ? data['active'] : undefined,
    };
  }

  // Check for nested workflow property
  const workflow = data['workflow'] as Record<string, unknown> | undefined;
  if (workflow && workflow['id']) {
    return {
      id: String(workflow['id']),
      name: workflow['name'] ? String(workflow['name']) : undefined,
      active: typeof workflow['active'] === 'boolean' ? workflow['active'] : undefined,
    };
  }

  // Check for data.data pattern (common in API responses)
  const nestedData = data['data'] as Record<string, unknown> | undefined;
  if (nestedData && nestedData['id']) {
    return {
      id: String(nestedData['id']),
      name: nestedData['name'] ? String(nestedData['name']) : undefined,
      active: typeof nestedData['active'] === 'boolean' ? nestedData['active'] : undefined,
    };
  }

  return null;
}

/**
 * Check if this is an n8n workflow creation/update tool
 */
function isN8nWorkflowTool(toolName: string): boolean {
  const n8nWorkflowTools = [
    'n8n_create_workflow',
    'n8n_update_workflow',
    'mcp__n8n-mcp__n8n_create_workflow',
    'mcp__n8n-mcp__n8n_update_workflow',
  ];

  return n8nWorkflowTools.some((tool) => toolName === tool || toolName.includes(tool));
}

/**
 * n8n Workflow Activation Hook Implementation
 */
export async function n8nWorkflowActivationHook(
  input: PostToolUseInput
): Promise<PostToolUseOutput> {
  const toolName = input.tool_name ?? '';

  // Only process n8n workflow tools
  if (!isN8nWorkflowTool(toolName)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
      },
    };
  }

  log(`[ACTIVATION] Processing ${toolName} result`);

  // Parse the workflow result
  const workflowResult = parseWorkflowResult(input.tool_output);

  if (!workflowResult || !workflowResult.id) {
    log('[ACTIVATION] Could not parse workflow ID from result');
    return {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext:
          'WARNING: Could not parse workflow ID from result. Verify workflow is active in n8n UI for webhook access.',
      },
    };
  }

  const workflowId = workflowResult.id;
  const workflowName = workflowResult.name ?? 'unknown';

  log(`[ACTIVATION] Workflow ID: ${workflowId}, Name: ${workflowName}`);

  // Check if already active
  if (workflowResult.active === true) {
    logAllowed(`Workflow "${workflowName}" is already active - MCP access enabled`);
    return {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `Workflow "${workflowName}" (${workflowId}) is ACTIVE. Webhook triggers are operational for MCP-level access.`,
      },
    };
  }

  // Workflow is inactive or status unknown - activate it
  log(`[ACTIVATION] Workflow inactive - auto-activating for MCP access`);

  const activated = await activateWorkflow(workflowId);

  if (activated) {
    logAllowed(`Auto-activated workflow "${workflowName}" for MCP access`);
    return {
      hookSpecificOutput: {
        hookEventName: 'PostToolUse',
        additionalContext: `AUTO-ACTIVATED workflow "${workflowName}" (${workflowId}). Webhook triggers are now operational for MCP-level access. Verify with n8n_get_workflow if needed.`,
      },
    };
  }

  // Activation failed
  log('[ACTIVATION] Auto-activation failed');
  return {
    hookSpecificOutput: {
      hookEventName: 'PostToolUse',
      additionalContext: `WARNING: Could not auto-activate workflow "${workflowName}" (${workflowId}). MANUAL ACTION REQUIRED: Use n8n UI or n8n_update_workflow to set active=true for webhook access.`,
    },
  };
}

// Register the hook
registerHook('n8n-workflow-activation', 'PostToolUse', n8nWorkflowActivationHook);

export default n8nWorkflowActivationHook;
