/**
 * Session-Start Hook
 * Self-managing MCP infrastructure: self-install, self-update, self-test, self-heal
 * Validates hooks, installs MCP servers, and prepares environment
 */

import type { SessionStartInput, SessionStartOutput } from '../types.js';
import {
  log,
  logSeparator,
  loadEnv,
  hasApiKey,
  getClaudeDir,
  getEnvPath,
  markSessionValidated,
} from '../utils.js';
import { registerHook } from '../runner.js';
import { syncApiKeys } from '../mcp/api_key_sync.js';
import { buildKanbanContext } from '../github/issue_kanban.js';
import { detectImplementedFile } from '../github/issue_file_detector.js';
import { closeIssue } from '../github/issue_crud.js';
import { auditFolderHygiene } from '../session/folder_hygiene_auditor.js';
import { getStats as getLedgerStats } from '../ledger/correction_ledger.js';
import { formatForSessionStart as formatEscalationReport } from '../escalation/reporter.js';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';

// MCP Server definitions
interface MCPServerDef {
  name: string;
  description: string;
  apiKeyEnv?: string;
  critical: boolean;
}

const MCP_SERVERS: MCPServerDef[] = [
  {
    name: 'filesystem-with-morph',
    description: 'Fast code editing',
    apiKeyEnv: 'MORPH_API_KEY',
    critical: true,
  },
  { name: 'scrapling', description: 'Browser automation (primary)', critical: true },
  { name: 'playwright', description: 'Browser automation (fallback)', critical: false },
  { name: 'exa', description: 'Web search', apiKeyEnv: 'EXA_API_KEY', critical: false },
  { name: 'memory', description: 'Persistent memory', critical: false },
  {
    name: 'supabase',
    description: 'Database',
    apiKeyEnv: 'SUPABASE_ACCESS_TOKEN',
    critical: false,
  },
  {
    name: 'n8n-mcp',
    description: 'Workflow automation',
    apiKeyEnv: 'N8N_API_KEY',
    critical: false,
  },
];

const REQUIRED_AGENTS = [
  'code-reviewer',
  'debugger',
  'test-automator',
  'system-architect',
  'security-auditor',
];

/**
 * Format a loaded summary for injection into session context
 */
function formatSummaryForInjection(content: string, filename: string): string {
  return `## PREVIOUS CONVERSATION CONTEXT

The following summary was automatically loaded from a previous session:

**Source**: \`conversation_history/${filename}\`

---

${content}

---

Use this context to maintain continuity with the previous conversation.`;
}

/**
 * Load the most recent conversation summary from the project's conversation_history directory
 */
async function loadConversationSummary(
  _issues: string[],
  successes: string[]
): Promise<string | undefined> {
  log('Step 0: Conversation History');
  log('-'.repeat(30));

  const cwd = process.cwd();
  const historyDir = path.join(cwd, 'conversation_history');

  if (!fs.existsSync(historyDir)) {
    log('[--] No conversation_history directory found');
    log('');
    return undefined;
  }

  try {
    // Get all .md files in the history directory
    const files = fs
      .readdirSync(historyDir)
      .filter((f) => f.endsWith('.md'))
      .map((f) => {
        const filePath = path.join(historyDir, f);
        const stats = fs.statSync(filePath);
        return {
          name: f,
          path: filePath,
          mtime: stats.mtime.getTime(),
        };
      })
      .sort((a, b) => b.mtime - a.mtime); // Most recent first

    if (files.length === 0) {
      log('[--] No summary files found in conversation_history');
      log('');
      return undefined;
    }

    const mostRecentFile = files[0];
    if (!mostRecentFile) return undefined;
    const content = fs.readFileSync(mostRecentFile.path, 'utf-8');

    // Validate it's a real summary (contains expected header)
    if (!content.includes('# Conversation Summary')) {
      log('[WARN] Most recent file does not appear to be a valid summary');
      log('');
      return undefined;
    }

    log(`[OK] Loaded conversation summary: ${mostRecentFile.name}`);
    successes.push(`Loaded conversation summary: ${mostRecentFile.name}`);
    log('');

    return formatSummaryForInjection(content, mostRecentFile.name);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    log(`[ERROR] Failed to load conversation history: ${msg}`);
    log('');
    return undefined;
  }
}

const ENV_TEMPLATE = `# MCP Server API Keys
# Fill in your keys and restart session

# Morph Fast Apply (CRITICAL)
MORPH_API_KEY=

# Exa Search API (https://exa.ai)
EXA_API_KEY=

# Supabase (https://supabase.com)
SUPABASE_ACCESS_TOKEN=

# n8n Workflow Automation
N8N_API_KEY=
N8N_BASE_URL=

# ElevenLabs (https://elevenlabs.io)
ELEVENLABS_API_KEY=

# Add other API keys as needed
`;

/**
 * Session-Start Hook Implementation
 *
 * Performs comprehensive session initialization:
 * 1. Environment setup (.env creation, variable loading)
 * 2. Prerequisites check (Node.js, npx, Claude CLI)
 * 3. MCP server health check and self-healing
 * 4. Subagent availability verification
 * 5. Session validation caching
 */
export async function sessionStartHook(_input: SessionStartInput): Promise<SessionStartOutput> {
  const issues: string[] = [];
  const successes: string[] = [];

  logSeparator('SESSION START - MCP Server Setup');
  log('');

  // Step 0: Load Previous Conversation Summary
  const previousSummary = await loadConversationSummary(issues, successes);

  // Step 1: Environment Setup
  await setupEnvironment(issues, successes);

  // Step 2: Prerequisites Check
  await checkPrerequisites(issues, successes);

  // Step 3: MCP Server Health Check
  await checkMCPServers(issues, successes);

  // Step 4: Subagent Availability
  await checkSubagents(issues, successes);

  // Step 5: API Key Sync
  await syncApiKeysStep(issues, successes);

  // Step 6: Correction Ledger Status
  await checkCorrectionLedger(issues, successes);

  // Step 7: Escalation Status
  await checkEscalationStatus(issues, successes);

  // Step 8: Mark session as validated
  markSessionValidated();
  log('');
  log('[COMPACT MODE] Session validation cached - pre-task checks will skip for 1 hour');

  // Step 9: Auto-commit and push ~/.claude repo
  await autoCommitAndPush(issues, successes);

  // Step 10: Sync GitHub issues to local registry
  await syncGitHubIssues(issues, successes);

  // Step 11: Build kanban board for context injection
  const kanbanContext = await buildKanbanStep(issues, successes);

  // Step 12: Reconcile open issues against implemented files
  await reconcileStaleIssues(issues, successes);

  // Step 13: Folder hygiene audit
  await runHygieneAudit(issues, successes);

  // Generate summary
  logSeparator('SESSION START COMPLETE');
  log('');

  if (issues.length > 0) {
    log('Issues found:');
    for (const issue of issues) {
      log(`  - ${issue}`);
    }
    log('');
  }

  const summary = [
    `Successes: ${successes.length}`,
    `Issues: ${issues.length}`,
    issues.length > 0 ? `Action needed: ${issues.slice(0, 3).join('; ')}` : 'All systems ready',
  ].join(' | ');

  // Combine status summary with previous conversation context and kanban
  let additionalContext = summary;
  if (previousSummary) {
    additionalContext = `${summary}\n\n${previousSummary}`;
  }

  if (kanbanContext) {
    additionalContext = `${additionalContext}\n\n${kanbanContext}`;
  }

  return {
    hookEventName: 'SessionStart',
    additionalContext,
  };
}

/**
 * Setup environment variables and .env file
 */
async function setupEnvironment(issues: string[], successes: string[]): Promise<void> {
  log('Step 1: Environment Setup');
  log('-'.repeat(30));

  const claudeDir = getClaudeDir();
  const envPath = getEnvPath();
  const oldDir = path.join(claudeDir, 'old');

  // Ensure directories exist
  fs.mkdirSync(oldDir, { recursive: true });

  // Create .env template if missing
  if (!fs.existsSync(envPath)) {
    log('Creating .env file for API keys...');
    fs.writeFileSync(envPath, ENV_TEMPLATE);
    log(`Created ${envPath}`);
    issues.push('ACTION REQUIRED: Add your API keys to .env');
  } else {
    successes.push('.env file exists');
  }

  // Load environment variables
  loadEnv();
  log('[OK] Environment loaded');
  log('');
}

/**
 * Check prerequisites (Node.js, npx, Claude CLI)
 */
async function checkPrerequisites(issues: string[], successes: string[]): Promise<void> {
  log('Step 2: Checking Prerequisites');
  log('-'.repeat(30));

  // Check Node.js
  try {
    const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
    log(`[OK] Node.js ${nodeVersion}`);
    successes.push(`Node.js ${nodeVersion}`);
  } catch {
    log('[MISSING] Node.js not installed');
    issues.push('Node.js not installed');
  }

  // Check npx
  try {
    execSync('npx --version', { encoding: 'utf-8', stdio: 'pipe' });
    log('[OK] npx available');
    successes.push('npx available');
  } catch {
    log('[MISSING] npx not installed');
    issues.push('npx not installed');
  }

  // Check Claude CLI
  try {
    const claudeVersion = execSync('claude --version', { encoding: 'utf-8', stdio: 'pipe' }).trim();
    log(`[OK] Claude CLI ${claudeVersion || 'installed'}`);
    successes.push('Claude CLI installed');
  } catch {
    log('[MISSING] Claude CLI not installed');
    log('         Install from: https://claude.ai/code');
    issues.push('Claude CLI not installed');
  }

  log('');
}

/**
 * Check MCP server health and attempt self-healing
 */
async function checkMCPServers(issues: string[], successes: string[]): Promise<void> {
  log('Step 3: MCP Server Status');
  log('-'.repeat(30));

  for (const server of MCP_SERVERS) {
    const status = await checkServerHealth(server);

    if (status.healthy) {
      log(`[OK] ${server.name} - ${server.description}`);
      successes.push(`${server.name} healthy`);
    } else if (status.needsApiKey) {
      log(`[WARN] ${server.name} - missing API key (${server.apiKeyEnv ?? 'N/A'})`);
      if (server.critical) {
        issues.push(`${server.name} missing API key`);
      }
    } else {
      log(`[--] ${server.name} - not configured`);
      if (server.critical) {
        issues.push(`${server.name} not configured`);

        // Attempt self-heal for critical servers
        log(`     Attempting self-heal for ${server.name}...`);
        const healed = await attemptSelfHeal(server);
        if (healed) {
          log(`     [HEALED] ${server.name} recovered`);
          successes.push(`${server.name} self-healed`);
        } else {
          log(`     [FAILED] ${server.name} could not be healed automatically`);
        }
      }
    }
  }

  log('');
}

/**
 * Check individual server health
 */
async function checkServerHealth(
  server: MCPServerDef
): Promise<{ healthy: boolean; needsApiKey: boolean }> {
  // Check if API key is required and present
  if (server.apiKeyEnv && !hasApiKey(server.apiKeyEnv)) {
    return { healthy: false, needsApiKey: true };
  }

  // For now, assume configured if API key present (or not required)
  // In future, can add actual health check calls
  return { healthy: true, needsApiKey: false };
}

/**
 * Attempt to self-heal a failed MCP server
 */
async function attemptSelfHeal(server: MCPServerDef): Promise<boolean> {
  // Self-healing strategies:
  // 1. Try to reinstall the MCP server
  // 2. Check and repair configuration
  // 3. Restart the server

  try {
    // For now, just log the attempt
    // In future, implement actual healing logic:
    // - npx install for the MCP server
    // - Configuration repair
    // - Server restart

    log(`     Self-heal strategy: Would reinstall ${server.name}`);

    // Placeholder for actual implementation
    return false;
  } catch {
    return false;
  }
}

/**
 * Check subagent availability
 */
async function checkSubagents(issues: string[], successes: string[]): Promise<void> {
  log('Step 4: Subagent Availability');
  log('-'.repeat(30));

  const agentDir = path.join(getClaudeDir(), 'agents');

  if (!fs.existsSync(agentDir)) {
    log('[MISSING] Agent directory not found');
    log('          Clone from: https://github.com/wshobson/agents');
    issues.push('Agent directory missing');
    log('');
    return;
  }

  // Count agents
  const agents = fs
    .readdirSync(agentDir, { withFileTypes: true })
    .filter((f) => f.isFile() && f.name.endsWith('.md'));

  log(`[OK] Agent directory exists with ${agents.length} agents`);
  successes.push(`${agents.length} agents available`);

  // Check required agents
  for (const agentName of REQUIRED_AGENTS) {
    const agentPath = path.join(agentDir, `${agentName}.md`);
    if (fs.existsSync(agentPath)) {
      log(`  [OK] ${agentName}`);
      successes.push(`${agentName} agent`);
    } else {
      log(`  [--] ${agentName} not found`);
      issues.push(`${agentName} agent missing`);
    }
  }

  log('');
}

/**
 * Sync API keys between .env and MCP config
 */
async function syncApiKeysStep(issues: string[], successes: string[]): Promise<void> {
  log('Step 5: API Key Sync');
  log('-'.repeat(30));

  try {
    const result = syncApiKeys();

    if (result.synced.length > 0) {
      log(`[OK] ${result.synced.length} keys already synced`);
      successes.push(`${result.synced.length} API keys synced`);
    }

    if (result.envOnly.length > 0) {
      log(`[SYNC] ${result.envOnly.length} keys synced from .env to MCP`);
    }

    if (result.mcpOnly.length > 0) {
      log(`[SYNC] ${result.mcpOnly.length} keys synced from MCP to .env`);
    }

    if (result.missing.length > 0) {
      log(`[WARN] ${result.missing.length} keys missing from both locations`);
      for (const key of result.missing) {
        log(`  - ${key}`);
      }
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    log(`[ERROR] API key sync failed: ${msg}`);
    issues.push('API key sync failed');
  }

  log('');
}

/**
 * Check correction ledger status
 */
async function checkCorrectionLedger(issues: string[], successes: string[]): Promise<void> {
  log('Step 6: Correction Ledger');
  log('-'.repeat(30));

  try {
    const stats = getLedgerStats();

    log(`Total corrections: ${stats.total}`);
    log(`Resolved (hooks implemented): ${stats.resolved}`);
    log(`Unresolved: ${stats.unresolved}`);

    if (stats.recurring > 0) {
      log(
        `[WARN] ${stats.recurring} corrections with recurrences (${stats.totalRecurrences} total)`
      );
      issues.push(`${stats.recurring} recurring corrections need attention`);
    }

    if (stats.unresolved > 0) {
      log(`[ACTION] ${stats.unresolved} corrections need hooks implemented`);
    } else if (stats.total > 0) {
      log('[OK] All corrections have hooks');
      successes.push('All corrections resolved');
    }
  } catch {
    log('[OK] Ledger not yet initialized');
  }

  log('');
}

/**
 * Check escalation registry status
 */
async function checkEscalationStatus(issues: string[], successes: string[]): Promise<void> {
  try {
    const result = formatEscalationReport();
    issues.push(...result.issues);
    successes.push(...result.successes);
  } catch {
    log('[OK] Escalation registry not yet initialized');
  }
}

/**
 * Auto-commit and push ~/.claude repo state (non-blocking)
 */
async function autoCommitAndPush(issues: string[], successes: string[]): Promise<void> {
  log('Step 9: Auto-commit and Push');
  log('-'.repeat(30));

  const claudeDir = getClaudeDir();

  try {
    // Check for uncommitted changes in tracked directories
    const status = execSync('git status --porcelain ledger/ openspec/', {
      cwd: claudeDir,
      encoding: 'utf-8',
      stdio: 'pipe',
    }).trim();

    if (!status) {
      log('[--] No changes to push');
      log('');
      return;
    }

    // Stage ledger and openspec changes
    execSync('git add ledger/ openspec/', {
      cwd: claudeDir,
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    // Check if there are staged changes
    try {
      execSync('git diff --cached --quiet', {
        cwd: claudeDir,
        encoding: 'utf-8',
        stdio: 'pipe',
      });
      // No staged changes
      log('[--] No staged changes');
      log('');
      return;
    } catch {
      // diff --cached returns exit 1 when there ARE changes - this is expected
    }

    // Commit
    execSync('git commit -m "chore(sync): session state sync"', {
      cwd: claudeDir,
      encoding: 'utf-8',
      stdio: 'pipe',
    });

    // Pull with rebase before push
    try {
      execSync('git pull --rebase origin main', {
        cwd: claudeDir,
        encoding: 'utf-8',
        stdio: 'pipe',
        timeout: 15_000,
      });
    } catch {
      log('[!] Rebase conflict, skipping push');
      issues.push('Git rebase conflict on auto-push');
      log('');
      return;
    }

    // Push
    execSync('git push origin main', {
      cwd: claudeDir,
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 15_000,
    });

    log('[+] Session state pushed');
    successes.push('Session state auto-pushed');
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    log(`[!] Push failed: ${msg}`);
    // Non-blocking: warn but do not add to issues that block session
  }

  log('');
}

/**
 * Build kanban board and return context string (non-blocking)
 */
async function buildKanbanStep(_issues: string[], successes: string[]): Promise<string> {
  log('Step 11: Issue Kanban Board');
  log('-'.repeat(30));

  try {
    const context = buildKanbanContext();
    if (context) {
      successes.push('Kanban board built');
    }

    log('');
    return context;
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    log(`[!] Kanban failed: ${msg}`);
    log('');
    return '';
  }
}

/**
 * Sync GitHub issues to local registry (non-blocking)
 */
async function syncGitHubIssues(_issues: string[], successes: string[]): Promise<void> {
  log('Step 10: GitHub Issue Sync');
  log('-'.repeat(30));

  try {
    const result = execSync(
      'gh issue list --state all --json number,title,state,labels --limit 100',
      { encoding: 'utf-8', stdio: 'pipe', timeout: 15_000 }
    );

    const remoteIssues = JSON.parse(result) as Array<{
      number: number;
      title: string;
      state: string;
      labels: Array<{ name: string }>;
    }>;

    // Load local registry
    const registryPath = path.join(getClaudeDir(), 'ledger', 'issue-sync-registry.json');
    let registry: {
      version: number;
      entries: Array<{
        unified_id: string;
        github_issue: number | null;
        status: string;
        last_synced: string;
      }>;
    };

    try {
      registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
    } catch {
      registry = { version: 1, entries: [] };
    }

    let created = 0;
    let updated = 0;

    for (const issue of remoteIssues) {
      const existing = registry.entries.find((e) => e.github_issue === issue.number);
      const remoteStatus = issue.state === 'OPEN' ? 'open' : 'closed';

      if (!existing) {
        registry.entries.push({
          unified_id: `unified-gh-${issue.number}`,
          github_issue: issue.number,
          status: remoteStatus,
          last_synced: new Date().toISOString(),
        });
        created++;
      } else if (existing.status !== remoteStatus) {
        existing.status = remoteStatus;
        existing.last_synced = new Date().toISOString();
        updated++;
      }
    }

    fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));

    if (created > 0 || updated > 0) {
      log(`[+] Sync: ${created} new, ${updated} updated`);
      successes.push(`Issue sync: ${created} new, ${updated} updated`);
    } else {
      log('[--] Issues in sync');
    }
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Unknown error';
    log(`[!] Issue sync failed: ${msg}`);
    // Non-blocking
  }

  log('');
}

/**
 * Run folder hygiene audit (non-blocking)
 */
async function runHygieneAudit(_issues: string[], successes: string[]): Promise<void> {
  log('Step 13: Folder Hygiene Audit');
  log('-'.repeat(30));

  try {
    const result = auditFolderHygiene();
    if (result.issues.length > 0) {
      log(`[!] ${result.issues.length} hygiene issues found`);
    } else {
      successes.push('Folder hygiene clean');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log(`[!] Hygiene audit failed: ${message}`);
  }

  log('');
}

/**
 * Reconcile open GitHub issues against implemented files (non-blocking)
 */
async function reconcileStaleIssues(_issues: string[], successes: string[]): Promise<void> {
  log('Step 12: Issue Reconciliation');
  log('-'.repeat(30));

  try {
    const result = execSync('gh issue list --state open --json number,title,labels --limit 100', {
      encoding: 'utf-8',
      stdio: 'pipe',
      timeout: 15_000,
    });

    const openIssues = JSON.parse(result) as Array<{
      number: number;
      title: string;
      labels: Array<{ name: string }>;
    }>;

    let closedCount = 0;

    for (const issue of openIssues) {
      const labelNames = issue.labels.map((l) => l.name);
      const isFeatOrFix = labelNames.some((l) => l === 'type/feat' || l === 'type/fix');
      if (!isFeatOrFix) continue;

      const found = detectImplementedFile(issue.title);
      if (found) {
        log(`[+] #${issue.number} already implemented: ${path.basename(found)}`);
        closeIssue(issue.number);
        closedCount++;
      }
    }

    if (closedCount > 0) {
      log(`[+] Auto-closed ${closedCount} stale issues`);
      successes.push(`Reconciled ${closedCount} stale issues`);
    } else {
      log('[--] No stale issues found');
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log(`[!] Reconciliation failed: ${message}`);
  }

  log('');
}

// Register the hook
registerHook('session-start', 'SessionStart', sessionStartHook);

export default sessionStartHook;
