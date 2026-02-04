/**
 * Credential Context Injector Hook
 * Detects when credentials/API keys are discussed and injects context about where they're stored
 * Prevents Claude from: (1) claiming keys don't exist when they do (2) putting keys in wrong places
 */

import * as fs from 'node:fs';
import type { UserPromptSubmitInput, UserPromptSubmitOutput } from '../types.js';
import { logTerse, getEnvPath } from '../utils.js';
import { registerHook } from '../runner.js';

/**
 * Patterns that indicate credential-related discussion
 */
const CREDENTIAL_PATTERNS = [
  // Direct mentions
  /\b(api[_\s-]?key|secret[_\s-]?key|auth[_\s-]?token|access[_\s-]?token|bearer[_\s-]?token)\b/i,
  /\b(password|credential|secret|token)\b/i,
  /\b(authenticate|authentication|authorization)\b/i,

  // Environment variables
  /\b[A-Z][A-Z0-9_]*(_KEY|_SECRET|_TOKEN|_PASSWORD|_CREDENTIAL)\b/,
  /\.env\b/i,
  /\benvironment\s+variable/i,

  // Service-specific patterns
  /\b(anthropic|openai|elevenlabs|servicetitan|supabase|stripe|github|n8n|tavily|exa|morph)\s+(key|token|api|auth|secret|credential)/i,
  /\b(key|token|api|auth|secret|credential)\s+for\s+(anthropic|openai|elevenlabs|servicetitan|supabase|stripe|github|n8n|tavily|exa|morph)/i,

  // Actions
  /\b(add|set|update|change|configure|store|save)\s+.{0,20}(key|token|secret|credential|password)/i,
  /\b(key|token|secret|credential|password).{0,20}(add|set|update|change|configure|store|save)/i,
  /\b(where|how).{0,30}(key|token|secret|credential|password)/i,

  // Common questions
  /\bdo\s+(you|i|we)\s+have\b.{0,30}(key|token|secret|credential|api)/i,
  /\b(missing|need|require|don'?t\s+have).{0,20}(key|token|secret|credential|api)/i,
];

/**
 * Parse .env file to extract configured service names (not values)
 */
function getConfiguredServices(envPath: string): string[] {
  if (!fs.existsSync(envPath)) {
    return [];
  }

  const content = fs.readFileSync(envPath, 'utf-8');
  const services: string[] = [];
  const seen = new Set<string>();

  for (const line of content.split('\n')) {
    const trimmed = line.trim();

    // Skip comments and empty lines
    if (trimmed.startsWith('#') || !trimmed.includes('=')) {
      continue;
    }

    const [key] = trimmed.split('=');
    if (!key) continue;

    const keyTrimmed = key.trim();

    // Skip empty values
    const value = trimmed.split('=').slice(1).join('=').trim();
    if (!value) continue;

    // Extract service name from key pattern
    // e.g., ELEVENLABS_API_KEY -> ElevenLabs
    // e.g., N8N_API_KEY -> n8n
    // e.g., ST_CLIENT_ID -> ServiceTitan
    let serviceName = '';

    // Check specific patterns first before generic prefixes
    if (keyTrimmed.startsWith('N8N_IN_SECRET_')) {
      // Webhook secrets - extract the webhook name
      serviceName = `Webhook:${keyTrimmed.replace('N8N_IN_SECRET_', '').toLowerCase()}`;
    } else if (keyTrimmed.startsWith('ELEVENLABS')) {
      serviceName = 'ElevenLabs';
    } else if (keyTrimmed.startsWith('N8N')) {
      serviceName = 'n8n';
    } else if (keyTrimmed.startsWith('ST_')) {
      serviceName = 'ServiceTitan';
    } else if (keyTrimmed.startsWith('MORPH')) {
      serviceName = 'Morph';
    } else if (keyTrimmed.startsWith('EXA')) {
      serviceName = 'Exa';
    } else if (keyTrimmed.startsWith('TAVILY')) {
      serviceName = 'Tavily';
    } else if (keyTrimmed.startsWith('SUPABASE')) {
      serviceName = 'Supabase';
    } else if (keyTrimmed.startsWith('OPENAI')) {
      serviceName = 'OpenAI';
    } else if (keyTrimmed.startsWith('ANTHROPIC')) {
      serviceName = 'Anthropic';
    } else if (keyTrimmed.startsWith('GITHUB')) {
      serviceName = 'GitHub';
    } else if (keyTrimmed.startsWith('STRIPE')) {
      serviceName = 'Stripe';
    } else if (keyTrimmed.startsWith('REWST')) {
      serviceName = 'Rewst';
    } else if (keyTrimmed.startsWith('POST_CALL_WEBHOOK')) {
      serviceName = 'PostCallWebhook';
    } else if (keyTrimmed.includes('_SECRET') && !keyTrimmed.startsWith('N8N_IN_SECRET_')) {
      // Generic secrets (not already handled above)
      serviceName = `Secret:${keyTrimmed.toLowerCase()}`;
    }

    if (serviceName && !seen.has(serviceName)) {
      services.push(serviceName);
      seen.add(serviceName);
    }
  }

  return services;
}

/**
 * Check if prompt discusses credentials
 */
function detectsCredentialDiscussion(prompt: string): boolean {
  return CREDENTIAL_PATTERNS.some((pattern) => pattern.test(prompt));
}

/**
 * Build context injection message
 */
function buildContextMessage(services: string[]): string {
  const envPath = '~/.claude/.env';

  const message = `**CREDENTIAL CONTEXT REMINDER**

**Location:** All API keys and credentials are stored in \`${envPath}\`

**Configured Services:** ${services.length > 0 ? services.join(', ') : 'None detected'}

**CRUD Rules:**
- **READ:** \`grep -i <service> ~/.claude/.env\` or read the file directly
- **CREATE/UPDATE:** Add/update in \`~/.claude/.env\` with format: \`SERVICE_API_KEY=value\`
- **SYNC:** Keys used by MCP servers must also be in MCP config (handled by api_key_sync)

**FORBIDDEN:**
- Do NOT put credentials in project-level .env files
- Do NOT inline credentials in code
- Do NOT commit credentials to git

**Before claiming a key doesn't exist:** Check \`~/.claude/.env\` first!`;

  return message;
}

/**
 * Credential Context Injector Hook Implementation
 */
async function credentialContextInjector(
  input: UserPromptSubmitInput
): Promise<UserPromptSubmitOutput> {
  const prompt = input.prompt || '';

  // Check if prompt discusses credentials
  if (!detectsCredentialDiscussion(prompt)) {
    return { hookEventName: 'UserPromptSubmit' };
  }

  logTerse('[+] Credential discussion detected - injecting context');

  // Get configured services
  const envPath = getEnvPath();
  const services = getConfiguredServices(envPath);

  // Build and return context
  const contextMessage = buildContextMessage(services);

  return {
    hookEventName: 'UserPromptSubmit',
    additionalContext: contextMessage,
  };
}

registerHook('credential-context-injector', 'UserPromptSubmit', credentialContextInjector);
export default credentialContextInjector;

// Export for testing
export {
  detectsCredentialDiscussion,
  getConfiguredServices,
  buildContextMessage,
  CREDENTIAL_PATTERNS,
};
