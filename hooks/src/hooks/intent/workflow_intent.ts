/**
 * Workflow Intent Detection Hook
 * Detects n8n workflow-related requests and triggers skill invocation
 *
 * Hook: UserPromptSubmit
 * Behavior: Only fires in n8n projects, outputs mandatory skill instruction
 */

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { UserPromptSubmitInput, UserPromptSubmitOutput } from '../../types.js';
import { detectProjectContext, isN8nProject } from '../../context/index.js';
import { registerHook } from '../../runner.js';

// ============================================================================
// Configuration
// ============================================================================

const KNOWN_APPS: Record<string, string[]> = {
  crm: ['salesforce', 'hubspot', 'pipedrive', 'zoho', 'monday', 'airtable', 'notion'],
  communication: ['slack', 'discord', 'telegram', 'twilio', 'sendgrid', 'teams', 'ringcentral'],
  storage: ['google drive', 'dropbox', 's3', 'aws', 'azure', 'onedrive'],
  database: ['postgres', 'postgresql', 'mysql', 'mongodb', 'supabase', 'firebase', 'redis'],
  ai: ['openai', 'chatgpt', 'gpt', 'anthropic', 'claude', 'gemini', 'elevenlabs'],
  payment: ['stripe', 'paypal', 'square', 'shopify'],
  social: ['twitter', 'linkedin', 'facebook', 'instagram', 'youtube'],
  productivity: ['google sheets', 'excel', 'asana', 'trello', 'jira', 'clickup'],
};

const ALL_KNOWN_APPS = Object.values(KNOWN_APPS).flat();

const WORKFLOW_KEYWORDS = {
  strong: [
    'workflow',
    'n8n',
    'automation',
    'automate',
    'webhook',
    'trigger',
    'cron',
    'schedule',
    'http request',
    'integration',
    'twilio',
    'send sms',
    'voice call',
    'phone call',
  ],
  weak: [
    'integrate',
    'connect',
    'sync',
    'pipeline',
    'process',
    'fetch',
    'notify',
    'alert',
    'send to slack',
    'send email',
    'daily',
    'hourly',
    'automatically',
    'agent',
    'ai agent',
  ],
  actions: ['create', 'build', 'make', 'set up', 'configure', 'design', 'implement', 'deploy'],
  visual: ['screenshot', 'image', 'picture', 'recreate', 'convert this'],
  pipeline: ['process audit', 'proposal generation', 'middleware', 'data pipeline'],
  integrationPatterns: [/from\s+\w+\s+to\s+\w+/i, /\w+\s+to\s+\w+/i],
};

// ============================================================================
// Types
// ============================================================================

interface Detection {
  isWorkflow: boolean;
  isPipeline: boolean;
  skillToInvoke: string;
  confidence: 'high' | 'medium' | 'low';
  detected: {
    strong: string[];
    weak: string[];
    actions: string[];
    visual: string[];
    pipeline: string[];
    appsFound: string[];
    hasIntegrationPattern: boolean;
  };
}

interface SessionState {
  n8nUp: boolean;
  workflowCount: number;
  timestamp?: number;
}

interface IntentState {
  timestamp: number;
}

// ============================================================================
// Detection Logic
// ============================================================================

function detectWorkflowIntent(prompt: string): Detection {
  const lower = prompt.toLowerCase();

  const strong = WORKFLOW_KEYWORDS.strong.filter((k) => lower.includes(k));
  const weak = WORKFLOW_KEYWORDS.weak.filter((k) => lower.includes(k));
  const actions = WORKFLOW_KEYWORDS.actions.filter((k) => lower.includes(k));
  const visual = WORKFLOW_KEYWORDS.visual.filter((k) => lower.includes(k));
  const pipeline = WORKFLOW_KEYWORDS.pipeline.filter((k) => lower.includes(k));

  const hasIntegrationPattern = WORKFLOW_KEYWORDS.integrationPatterns.some((p) => p.test(lower));
  const appsFound = ALL_KNOWN_APPS.filter((app) => lower.includes(app));
  const multipleApps = appsFound.length >= 2;

  const isPipeline = pipeline.length > 0;
  const isWorkflow =
    isPipeline ||
    strong.length > 0 ||
    weak.length >= 2 ||
    (weak.length >= 1 && actions.length >= 1) ||
    visual.length > 0 ||
    (hasIntegrationPattern && weak.length >= 1) ||
    multipleApps;

  const skillToInvoke = isPipeline ? 'n8n-pipeline-middleware' : 'n8n-workflow-dev';

  return {
    isWorkflow,
    isPipeline,
    skillToInvoke,
    confidence: isPipeline ? 'high' : strong.length > 0 || multipleApps ? 'high' : 'medium',
    detected: { strong, weak, actions, visual, pipeline, appsFound, hasIntegrationPattern },
  };
}

// ============================================================================
// State Management
// ============================================================================

function getStateFiles(projectRoot: string) {
  const logsDir = join(projectRoot, '.claude', 'logs');
  return {
    stateFile: join(logsDir, 'session-state.json'),
    intentFile: join(logsDir, 'intent-fired.json'),
  };
}

function readJsonFile<T>(path: string, defaultValue: T): T {
  try {
    if (existsSync(path)) {
      return JSON.parse(readFileSync(path, 'utf-8'));
    }
  } catch {
    // Ignore parse errors
  }
  return defaultValue;
}

function writeJsonFile(path: string, data: unknown): void {
  try {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, JSON.stringify(data, null, 2));
  } catch {
    // Ignore write errors
  }
}

// ============================================================================
// Message Builder
// ============================================================================

function buildMandatoryMessage(detection: Detection, sessionState: SessionState): string {
  const { confidence, detected, isPipeline } = detection;
  const { n8nUp, workflowCount } = sessionState;

  const keywordSummary = [
    ...detected.strong.map((k) => `[${k}]`),
    ...detected.weak.slice(0, 2).map((k) => `(${k})`),
  ]
    .filter(Boolean)
    .join(' ');

  if (isPipeline) {
    return `
PIPELINE MIDDLEWARE REQUEST DETECTED (${confidence} confidence)
MANDATORY: Invoke Skill("n8n-pipeline-middleware") NOW
`.trim();
  }

  return `
WORKFLOW REQUEST DETECTED (${confidence} confidence)
Keywords: ${keywordSummary || 'contextual match'}

MANDATORY: Invoke Skill("n8n-workflow-dev") NOW

Session Context:
- n8n Instance: ${n8nUp ? 'Online' : 'Offline'}
- Local Workflows: ${workflowCount}

NEXT ACTION: Skill("n8n-workflow-dev")
`.trim();
}

// ============================================================================
// Main Hook
// ============================================================================

export async function workflowIntentHook(
  input: UserPromptSubmitInput
): Promise<UserPromptSubmitOutput> {
  // Check if we're in an n8n project
  const context = detectProjectContext();
  if (!isN8nProject(context)) {
    return { hookEventName: 'UserPromptSubmit' };
  }

  const prompt = (input.prompt || '').trim();

  // Skip if prompt is too short
  if (prompt.length < 10) {
    return { hookEventName: 'UserPromptSubmit' };
  }

  const { stateFile, intentFile } = getStateFiles(context.projectRoot);

  // Check if already fired this session
  const intentState = readJsonFile<IntentState>(intentFile, { timestamp: 0 });
  const sessionState = readJsonFile<SessionState>(stateFile, { n8nUp: false, workflowCount: 0 });

  if (intentState.timestamp > (sessionState.timestamp || 0)) {
    return { hookEventName: 'UserPromptSubmit' };
  }

  // Detect workflow intent
  const detection = detectWorkflowIntent(prompt);

  if (!detection.isWorkflow) {
    return { hookEventName: 'UserPromptSubmit' };
  }

  // Mark as fired
  writeJsonFile(intentFile, {
    timestamp: Date.now(),
    confidence: detection.confidence,
  });

  // Build and return message
  const message = buildMandatoryMessage(detection, sessionState);

  return {
    hookEventName: 'UserPromptSubmit',
    additionalContext: message,
  };
}

// Register the hook
registerHook('workflow-intent', 'UserPromptSubmit', workflowIntentHook);

export default workflowIntentHook;
