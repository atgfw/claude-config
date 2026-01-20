/**
 * API Key Writer
 * Saves API keys to both .env and MCP config files
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { ServiceDefinition } from './registry.js';

function getClaudeDir(): string {
  return process.env['CLAUDE_DIR'] ?? path.join(os.homedir(), '.claude');
}

/**
 * Save an API key to .env file
 */
export function saveToEnv(service: ServiceDefinition, key: string): void {
  const envPath = path.join(getClaudeDir(), '.env');

  let lines: string[] = [];
  if (fs.existsSync(envPath)) {
    lines = fs.readFileSync(envPath, 'utf-8').split('\n');
  }

  // Find existing entry
  const existingIndex = lines.findIndex(
    (l) => l.startsWith(`${service.envVar}=`) || l.startsWith(`export ${service.envVar}=`)
  );

  const keyLine = `${service.envVar}=${key}`;
  const commentLine = `# Auto-detected: ${new Date().toISOString()}`;

  if (existingIndex >= 0) {
    // Update existing
    lines[existingIndex] = keyLine;
    // Update comment if it's on previous line
    if (existingIndex > 0 && lines[existingIndex - 1]?.startsWith('# Auto-detected:')) {
      lines[existingIndex - 1] = commentLine;
    }
  } else {
    // Append new
    if (lines.length > 0 && lines[lines.length - 1] !== '') {
      lines.push('');
    }
    lines.push(commentLine);
    lines.push(keyLine);
  }

  // Atomic write via temp file
  const tempPath = envPath + '.tmp';
  fs.writeFileSync(tempPath, lines.join('\n') + '\n');
  fs.renameSync(tempPath, envPath);
}

/**
 * Save an API key to MCP config files
 */
export function saveToMcpConfig(service: ServiceDefinition, key: string): void {
  const mcpPaths = [
    path.join(getClaudeDir(), '.mcp.json'),
    path.join(getClaudeDir(), 'mcp', 'mcp-config.json'),
  ];

  for (const mcpPath of mcpPaths) {
    if (!fs.existsSync(mcpPath)) continue;

    try {
      const content = fs.readFileSync(mcpPath, 'utf-8');
      const config = JSON.parse(content);

      let modified = false;

      // Update matching MCP servers
      if (config.mcpServers) {
        for (const serverName of service.mcpServerNames) {
          if (config.mcpServers[serverName]) {
            if (!config.mcpServers[serverName].env) {
              config.mcpServers[serverName].env = {};
            }
            config.mcpServers[serverName].env[service.envVar] = key;
            modified = true;
          }
        }
      }

      if (modified) {
        // Backup before modify
        const backupPath = mcpPath + '.backup';
        fs.copyFileSync(mcpPath, backupPath);

        // Write updated config
        fs.writeFileSync(mcpPath, JSON.stringify(config, null, 2) + '\n');
      }
    } catch {
      // Skip invalid JSON files
    }
  }
}

/**
 * Save an API key to both .env and MCP config
 */
export function saveKey(service: ServiceDefinition, key: string): void {
  saveToEnv(service, key);
  saveToMcpConfig(service, key);
}

/**
 * Check if a key already exists in .env
 */
export function keyExistsInEnv(envVar: string): boolean {
  const envPath = path.join(getClaudeDir(), '.env');
  if (!fs.existsSync(envPath)) return false;

  const content = fs.readFileSync(envPath, 'utf-8');
  return content.includes(`${envVar}=`);
}

/**
 * Get current key value from .env
 */
export function getKeyFromEnv(envVar: string): string | undefined {
  const envPath = path.join(getClaudeDir(), '.env');
  if (!fs.existsSync(envPath)) return undefined;

  const content = fs.readFileSync(envPath, 'utf-8');
  const match = content.match(new RegExp(`^${envVar}=(.+)$`, 'm'));
  return match ? match[1] : undefined;
}
