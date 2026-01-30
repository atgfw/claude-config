import { describe, it, expect } from 'vitest';
import { servicetitanGovernanceHook } from '../../src/governance/servicetitan_governance.js';
import { type PreToolUseInput } from '../../src/types.js';

describe('servicetitanGovernance', () => {
  it('should block non-whitelisted ServiceTitan tool', async () => {
    const input: PreToolUseInput = {
      tool_name: 'mcp__servicetitan-mcp__st_customers_get',
      tool_args: {},
    };

    const result = await servicetitanGovernanceHook(input);

    expect(result.hookSpecificOutput.permissionDecision).toBe('deny');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('st_customers_get');
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain(
      'blocked to reduce context bloat'
    );
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('454 ServiceTitan tools');
  });

  it('should extract operation name correctly', async () => {
    const input: PreToolUseInput = {
      tool_name: 'mcp__servicetitan-mcp__st_jobs_create',
      tool_args: {},
    };

    const result = await servicetitanGovernanceHook(input);

    expect(result.hookSpecificOutput.permissionDecisionReason).toContain('st_jobs_create');
    expect(result.hookSpecificOutput.permissionDecisionReason).not.toContain(
      'mcp__servicetitan-mcp__'
    );
  });

  it('should provide cherry-picking instructions in error message', async () => {
    const input: PreToolUseInput = {
      tool_name: 'mcp__servicetitan-mcp__st_invoices_getlist',
      tool_args: {},
    };

    const result = await servicetitanGovernanceHook(input);

    expect(result.hookSpecificOutput.permissionDecisionReason).toContain(
      'add it to the whitelist in servicetitan_governance.ts'
    );
    expect(result.hookSpecificOutput.permissionDecisionReason).toContain(
      'Cherry-pick by uncommenting'
    );
  });

  // Note: Testing whitelisted tools requires modifying WHITELISTED_TOOLS array
  // This would be done during cherry-picking phase
});
