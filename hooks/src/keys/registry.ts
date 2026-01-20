/**
 * API Key Registry
 * Defines known services, their key patterns, and test endpoints
 */

export interface ServiceDefinition {
  name: string;
  envVar: string;
  pattern: RegExp;
  testEndpoint: string;
  testMethod: 'GET' | 'POST';
  testHeaders: (key: string) => Record<string, string>;
  testBody?: object;
  mcpServerNames: string[];
  maskPrefix: number;
}

export const SERVICES: ServiceDefinition[] = [
  {
    name: 'anthropic',
    envVar: 'ANTHROPIC_API_KEY',
    pattern: /sk-ant-[a-zA-Z0-9_-]{20,}/,
    testEndpoint: 'https://api.anthropic.com/v1/messages',
    testMethod: 'POST',
    testHeaders: (key) => ({
      'x-api-key': key,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    }),
    testBody: {
      model: 'claude-3-haiku-20240307',
      max_tokens: 1,
      messages: [{ role: 'user', content: 'hi' }],
    },
    mcpServerNames: [],
    maskPrefix: 10,
  },
  {
    name: 'openai',
    envVar: 'OPENAI_API_KEY',
    pattern: /sk-(?!ant)[a-zA-Z0-9]{32,}/,
    testEndpoint: 'https://api.openai.com/v1/models',
    testMethod: 'GET',
    testHeaders: (key) => ({
      Authorization: `Bearer ${key}`,
    }),
    mcpServerNames: [],
    maskPrefix: 7,
  },
  {
    name: 'github',
    envVar: 'GITHUB_TOKEN',
    pattern: /gh[pousr]_[a-zA-Z0-9]{36,}/,
    testEndpoint: 'https://api.github.com/user',
    testMethod: 'GET',
    testHeaders: (key) => ({
      Authorization: `token ${key}`,
      'User-Agent': 'Claude-Code-Hooks',
    }),
    mcpServerNames: ['github'],
    maskPrefix: 7,
  },
  {
    name: 'exa',
    envVar: 'EXA_API_KEY',
    pattern: /[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i,
    testEndpoint: 'https://api.exa.ai/search',
    testMethod: 'POST',
    testHeaders: (key) => ({
      'x-api-key': key,
      'Content-Type': 'application/json',
    }),
    testBody: {
      query: 'test',
      numResults: 1,
    },
    mcpServerNames: ['exa'],
    maskPrefix: 8,
  },
  {
    name: 'slack',
    envVar: 'SLACK_BOT_TOKEN',
    pattern: /xox[baprs]-[a-zA-Z0-9-]{10,}/,
    testEndpoint: 'https://slack.com/api/auth.test',
    testMethod: 'POST',
    testHeaders: (key) => ({
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    }),
    mcpServerNames: ['slack'],
    maskPrefix: 9,
  },
  {
    name: 'supabase',
    envVar: 'SUPABASE_ACCESS_TOKEN',
    pattern: /sbp_[a-f0-9]{40}/,
    testEndpoint: 'https://api.supabase.com/v1/projects',
    testMethod: 'GET',
    testHeaders: (key) => ({
      Authorization: `Bearer ${key}`,
    }),
    mcpServerNames: ['supabase'],
    maskPrefix: 8,
  },
  {
    name: 'elevenlabs',
    envVar: 'ELEVENLABS_API_KEY',
    pattern: /[a-f0-9]{32}/,
    testEndpoint: 'https://api.elevenlabs.io/v1/user',
    testMethod: 'GET',
    testHeaders: (key) => ({
      'xi-api-key': key,
    }),
    mcpServerNames: ['elevenlabs'],
    maskPrefix: 8,
  },
];

/**
 * Find service by name
 */
export function getService(name: string): ServiceDefinition | undefined {
  return SERVICES.find((s) => s.name === name);
}

/**
 * Find service by env var
 */
export function getServiceByEnvVar(envVar: string): ServiceDefinition | undefined {
  return SERVICES.find((s) => s.envVar === envVar);
}

/**
 * Mask an API key for safe logging
 */
export function maskKey(key: string, service: ServiceDefinition): string {
  if (key.length <= service.maskPrefix + 4) {
    return key.slice(0, 4) + '...' + key.slice(-2);
  }
  return key.slice(0, service.maskPrefix) + '...' + key.slice(-4);
}
