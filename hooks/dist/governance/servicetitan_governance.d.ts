/**
 * ServiceTitan Governance Hook
 * Blocks non-whitelisted ServiceTitan tools to reduce context bloat.
 * ServiceTitan MCP exposes 454 tools - only cherry-picked operations are allowed.
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
/**
 * ServiceTitan Governance Hook
 * Blocks all ServiceTitan tools except whitelisted ones
 */
export declare function servicetitanGovernanceHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default servicetitanGovernanceHook;
//# sourceMappingURL=servicetitan_governance.d.ts.map