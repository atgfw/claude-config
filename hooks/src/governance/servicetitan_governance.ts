/**
 * ServiceTitan Governance Hook
 * Blocks non-whitelisted ServiceTitan tools to reduce context bloat.
 * ServiceTitan MCP exposes 454 tools - only cherry-picked operations are allowed.
 */

import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
import { registerHook } from '../runner.js';

/**
 * Whitelisted ServiceTitan operations
 * Cherry-pick by uncommenting the operations you need
 */
const WHITELISTED_TOOLS = new Set<string>([
  // Uncomment as needed:
  // 'st_jobs_get',
  // 'st_jobs_create',
  // 'st_customers_get',
  // 'st_invoices_getlist',
]);

/**
 * Extract operation name from full tool name
 * mcp__servicetitan-mcp__st_jobs_get -> st_jobs_get
 */
function extractOperationName(toolName: string): string {
  const parts = toolName.split('__');
  return parts.at(-1) || toolName;
}

/**
 * Check if tool is a ServiceTitan MCP tool
 */
function isServiceTitanTool(toolName: string): boolean {
  return toolName.toLowerCase().includes('servicetitan');
}

/**
 * ServiceTitan Governance Hook
 * Blocks all ServiceTitan tools except whitelisted ones
 */
export async function servicetitanGovernanceHook(
  input: PreToolUseInput
): Promise<PreToolUseOutput> {
  const toolName = input.tool_name;

  if (!isServiceTitanTool(toolName)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  const operationName = extractOperationName(toolName);

  if (WHITELISTED_TOOLS.has(operationName)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason: `ServiceTitan operation ${operationName} is whitelisted`,
      },
    };
  }

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason:
        `ServiceTitan operation ${operationName} is blocked to reduce context bloat. ` +
        `There are 454 ServiceTitan tools available. ` +
        `To use this operation, add it to the whitelist in servicetitan_governance.ts. ` +
        `Cherry-pick by uncommenting the operation in WHITELISTED_TOOLS array.`,
    },
  };
}

registerHook('servicetitan-governance', 'PreToolUse', servicetitanGovernanceHook);
export default servicetitanGovernanceHook;
