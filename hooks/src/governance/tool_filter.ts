/**
 * Generic Tool Filter Hook
 *
 * Blocks or allows MCP tools based on patterns defined in tool-filter-config.json.
 * This is the "usual whitelisting/blacklisting" mechanism for Claude Code tools.
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';
import { registerHook } from '../runner.js';
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';

interface ToolFilterConfig {
  mode: 'blocklist' | 'allowlist';
  patterns: {
    pattern: string;
    action: 'block' | 'allow';
    reason?: string;
    exceptions?: string[];
  }[];
}

const CONFIG_PATH = join(homedir(), '.claude', 'tool-filter-config.json');

function loadConfig(): ToolFilterConfig {
  try {
    const content = readFileSync(CONFIG_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (error) {
    // Default: allow everything if config doesn't exist
    return {
      mode: 'allowlist',
      patterns: [],
    };
  }
}

function matchesPattern(toolName: string, pattern: string): boolean {
  // Convert glob-style pattern to regex
  const regexPattern = pattern.replace(/\./g, '\\.').replace(/\*/g, '.*').replace(/\?/g, '.');
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(toolName);
}

export async function toolFilterHook(input: PreToolUseInput): Promise<PreToolUseOutput> {
  const toolName = input.tool_name;
  const config = loadConfig();

  // Check each pattern
  for (const rule of config.patterns) {
    if (matchesPattern(toolName, rule.pattern)) {
      // Check if tool is in exceptions list
      if (rule.exceptions && rule.exceptions.some((exc) => matchesPattern(toolName, exc))) {
        continue; // Skip this rule, check next
      }

      if (rule.action === 'block') {
        const reason = rule.reason || `Tool "${toolName}" is blocked by pattern "${rule.pattern}".`;
        return {
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'deny',
            permissionDecisionReason: reason,
          },
        };
      }

      if (rule.action === 'allow') {
        return {
          hookSpecificOutput: {
            hookEventName: 'PreToolUse',
            permissionDecision: 'allow',
            permissionDecisionReason: `Tool "${toolName}" is explicitly allowed by pattern "${rule.pattern}".`,
          },
        };
      }
    }
  }

  // Default behavior based on mode
  if (config.mode === 'blocklist') {
    // Blocklist mode: allow by default
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason: 'Tool not matched by any blocklist pattern.',
      },
    };
  } else {
    // Allowlist mode: if no patterns match, allow (safe default)
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason: 'Tool not matched by any allowlist pattern, using safe default.',
      },
    };
  }
}

registerHook('tool-filter', 'PreToolUse', toolFilterHook);
