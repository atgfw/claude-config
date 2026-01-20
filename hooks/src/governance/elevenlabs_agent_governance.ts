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
import { log, logBlocked, logAllowed, loadEnv } from '../utils.js';
import { registerHook } from '../runner.js';
import * as https from 'node:https';

interface ElevenLabsAgent {
  agent_id: string;
  name: string;
  conversation_config?: {
    agent?: {
      prompt?: {
        prompt?: string;
      };
    };
  };
}

interface SimilarAgent {
  agent_id: string;
  name: string;
  similarity: number;
}

/**
 * Get ElevenLabs API key from environment
 */
function getElevenLabsApiKey(): string | null {
  loadEnv();
  return process.env['ELEVENLABS_API_KEY'] ?? process.env['XI_API_KEY'] ?? null;
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
 * Fetch ALL agents from ElevenLabs LIVE API
 * This is the source of truth - NOT local files
 */
async function fetchAllAgentsFromElevenLabs(): Promise<ElevenLabsAgent[]> {
  const apiKey = getElevenLabsApiKey();

  if (!apiKey) {
    log('[GOVERNANCE] ELEVENLABS_API_KEY not set, cannot fetch agent list');
    return [];
  }

  try {
    const url = new URL('https://api.elevenlabs.io/v1/convai/agents');

    return new Promise((resolve) => {
      const req = https.get(
        url.href,
        {
          headers: {
            'xi-api-key': apiKey,
            Accept: 'application/json',
          },
        },
        (res) => {
          let data = '';
          res.on('data', (chunk) => (data += chunk));
          res.on('end', () => {
            try {
              const parsed = JSON.parse(data);
              const agents = parsed.agents ?? parsed ?? [];
              log(`[GOVERNANCE] Fetched ${agents.length} agents from ElevenLabs LIVE API`);
              resolve(agents);
            } catch (e) {
              log(`[GOVERNANCE] Failed to parse agent list: ${e}`);
              resolve([]);
            }
          });
        }
      );
      req.on('error', (e) => {
        log(`[GOVERNANCE] Error fetching agents: ${e.message}`);
        resolve([]);
      });
      req.setTimeout(15000, () => {
        req.destroy();
        resolve([]);
      });
    });
  } catch (e) {
    log(`[GOVERNANCE] Exception fetching agents: ${e}`);
    return [];
  }
}

/**
 * Find similar agents from the LIVE ElevenLabs API
 */
function findSimilarAgents(
  name: string,
  prompt: string,
  liveAgents: ElevenLabsAgent[]
): SimilarAgent[] {
  const matches: SimilarAgent[] = [];
  const searchText = `${name} ${prompt}`;

  for (const agent of liveAgents) {
    const agentPrompt = agent.conversation_config?.agent?.prompt?.prompt ?? '';
    const agentText = `${agent.name ?? ''} ${agentPrompt}`;
    const score = calculateSimilarity(searchText, agentText);

    if (score >= 30) {
      matches.push({
        agent_id: agent.agent_id,
        name: agent.name,
        similarity: score,
      });
    }
  }

  return matches.sort((a, b) => b.similarity - a.similarity);
}

/**
 * Handle pre-create agent check
 * CRITICAL: Checks LIVE cloud API, not local files
 */
async function handlePreCreateAgent(input: PreToolUseInput): Promise<PreToolUseOutput> {
  const toolInput = input.tool_input as Record<string, unknown>;
  const name = (toolInput['name'] as string) ?? '';
  const conversationConfig = (toolInput['conversation_config'] as Record<string, unknown>) ?? {};
  const agentConfig = (conversationConfig['agent'] as Record<string, unknown>) ?? {};
  const promptConfig = (agentConfig['prompt'] as Record<string, unknown>) ?? {};
  const prompt = (promptConfig['prompt'] as string) ?? '';

  log(`[GOVERNANCE] Pre-create agent check: "${name}"`);
  log('[GOVERNANCE] SOURCE OF TRUTH: ElevenLabs LIVE API (not local files)');

  // Fetch LIVE agents from ElevenLabs cloud
  const liveAgents = await fetchAllAgentsFromElevenLabs();

  if (liveAgents.length === 0) {
    log('[GOVERNANCE] WARNING: Could not fetch live agents - precedent check incomplete');
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason: `GOVERNANCE WARNING: Could not verify against ElevenLabs LIVE API. Proceeding with caution.`,
      },
    };
  }

  // Find similar agents from LIVE data
  const similar = findSimilarAgents(name, prompt, liveAgents);
  const top = similar[0];

  if (top && top.similarity >= 70) {
    // BLOCK - very similar agent exists in cloud
    logBlocked(
      `Found very similar agent "${top.name}" (${top.similarity}% match) in ElevenLabs cloud`,
      'Before creating agents, check existing agents via LIVE API to prevent duplication.'
    );

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `GOVERNANCE BLOCKED: Very similar agent "${top.name}" exists in ElevenLabs cloud (${top.similarity}% match, ID: ${top.agent_id}). Review existing agent with mcp__elevenlabs-mcp__get_agent(agent_id: "${top.agent_id}") before creating new.`,
      },
    };
  } else if (top && top.similarity >= 40) {
    // WARN but allow
    const topMatches = similar
      .slice(0, 5)
      .map((m) => `  - "${m.name}" (${m.similarity}% match, ID: ${m.agent_id})`)
      .join('\n');

    log(`[GOVERNANCE] Found ${similar.length} similar agents in cloud:\n${topMatches}`);

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason: `GOVERNANCE WARNING: Found ${similar.length} similar agents in ElevenLabs cloud:\n${topMatches}\n\nReview these before proceeding. Is this truly a new agent?`,
      },
    };
  }

  // No similar agents found in cloud
  logAllowed(`Checked ${liveAgents.length} live agents in ElevenLabs cloud - no duplicates found`);

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: `GOVERNANCE: Checked ${liveAgents.length} agents in ElevenLabs LIVE API - no similar found.`,
    },
  };
}

/**
 * Main ElevenLabs agent governance hook
 */
export async function elevenlabsAgentGovernanceHook(
  input: PreToolUseInput
): Promise<PreToolUseOutput> {
  const toolName = input.tool_name ?? '';

  log(`[GOVERNANCE] ElevenLabs tool: ${toolName}`);

  // Route to appropriate handler
  if (toolName.includes('create_agent')) {
    return handlePreCreateAgent(input);
  }

  // Allow other ElevenLabs operations
  logAllowed(`ElevenLabs operation allowed: ${toolName}`);

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
    },
  };
}

// Register the hook
registerHook('elevenlabs-agent-governance', 'PreToolUse', elevenlabsAgentGovernanceHook);

export default elevenlabsAgentGovernanceHook;
