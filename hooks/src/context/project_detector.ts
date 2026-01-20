/**
 * Project Context Detection System
 * Detects project type and configuration from working directory
 */

import { existsSync, readFileSync } from 'fs';
import { join } from 'path';

export type ProjectType = 'n8n' | 'elevenlabs' | 'generic';

export interface ProjectContext {
  projectType: ProjectType;
  projectRoot: string;
  hasLocalClaudeDir: boolean;
  hasGovernanceFile: boolean;
  hasWorkflowsDir: boolean;
  governancePath: string | null;
  registryPath: string | null;
  n8nApiUrl: string | null;
}

const N8N_MARKERS = [
  'workflows/governance.yaml',
  'workflows/registry.yaml',
  '.claude/hooks/workflow-governance.js',
  '.claude/skills/n8n-workflow-dev',
];

const ELEVENLABS_MARKERS = [
  'context/elevenlabs-agents/governance.yaml',
  '.claude/directives/integrations/elevenlabs/manifest.yaml',
  '.claude/hooks/elevenlabs-agent-governance.js',
];

function checkFileExists(basePath: string, relativePath: string): boolean {
  try {
    return existsSync(join(basePath, relativePath));
  } catch {
    return false;
  }
}

function countMarkers(basePath: string, markers: string[]): number {
  return markers.filter((marker) => checkFileExists(basePath, marker)).length;
}

function detectN8nApiUrl(basePath: string): string | null {
  if (process.env.N8N_API_URL) {
    return process.env.N8N_API_URL;
  }

  const mcpConfigPath = join(basePath, 'config', 'mcp-servers.json');
  try {
    if (existsSync(mcpConfigPath)) {
      const config = JSON.parse(readFileSync(mcpConfigPath, 'utf-8'));
      const n8nConfig = config?.servers?.['n8n-mcp']?.config;
      if (n8nConfig?.N8N_API_URL) {
        return n8nConfig.N8N_API_URL;
      }
    }
  } catch {
    // Ignore parse errors
  }

  return null;
}

export function detectProjectContext(workingDirectory?: string): ProjectContext {
  const projectRoot = workingDirectory || process.cwd();

  const hasLocalClaudeDir = checkFileExists(projectRoot, '.claude');
  const hasWorkflowsDir = checkFileExists(projectRoot, 'workflows');

  const governancePath = checkFileExists(projectRoot, 'workflows/governance.yaml')
    ? join(projectRoot, 'workflows', 'governance.yaml')
    : null;

  const registryPath = checkFileExists(projectRoot, 'workflows/registry.yaml')
    ? join(projectRoot, 'workflows', 'registry.yaml')
    : null;

  const n8nMarkerCount = countMarkers(projectRoot, N8N_MARKERS);
  const elevenlabsMarkerCount = countMarkers(projectRoot, ELEVENLABS_MARKERS);

  let projectType: ProjectType = 'generic';

  if (n8nMarkerCount >= 2) {
    projectType = 'n8n';
  } else if (elevenlabsMarkerCount >= 2) {
    projectType = 'elevenlabs';
  } else if (n8nMarkerCount === 1 || hasWorkflowsDir) {
    projectType = 'n8n';
  }

  const n8nApiUrl = projectType === 'n8n' ? detectN8nApiUrl(projectRoot) : null;

  return {
    projectType,
    projectRoot,
    hasLocalClaudeDir,
    hasGovernanceFile: governancePath !== null,
    hasWorkflowsDir,
    governancePath,
    registryPath,
    n8nApiUrl,
  };
}

export function isN8nProject(context?: ProjectContext): boolean {
  const ctx = context || detectProjectContext();
  return ctx.projectType === 'n8n';
}

export function isElevenLabsProject(context?: ProjectContext): boolean {
  const ctx = context || detectProjectContext();
  return ctx.projectType === 'elevenlabs' || ctx.projectType === 'n8n';
}

export function hasGovernance(context?: ProjectContext): boolean {
  const ctx = context || detectProjectContext();
  return ctx.hasGovernanceFile;
}
