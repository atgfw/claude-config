/**
 * ElevenLabs Agent Governance Hook
 *
 * PREVENTS duplicate agent creation by checking LIVE ElevenLabs cloud API
 * before allowing mcp__elevenlabs-mcp__create_agent operations.
 *
 * Part of the Spinal Cord - global governance for child projects.
 *
 * CRITICAL: The source of truth is the LIVE CLOUD API, not local files.
 * Local governance.yaml, registry.yaml, etc. are documentation caches only.
 *
 * Rules:
 * - Before creating agent, fetch ALL agents from ElevenLabs API
 * - Check for name/purpose similarity
 * - Block 70%+ similar, warn 40%+ similar
 * - Never trust local files as authoritative
 */
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
/**
 * Main ElevenLabs agent governance hook
 */
export declare function elevenlabsAgentGovernanceHook(input: PreToolUseInput): Promise<PreToolUseOutput>;
export default elevenlabsAgentGovernanceHook;
//# sourceMappingURL=elevenlabs_agent_governance.d.ts.map