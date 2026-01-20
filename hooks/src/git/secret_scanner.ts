/**
 * Secret Scanner Hook
 * BLOCKS git commits/pushes that contain secrets or API keys
 * Enforcement: STRICT - Hard block on detection
 */

import { execSync } from 'node:child_process';
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
import { log, logBlocked, logAllowed } from '../utils.js';
import { registerHook } from '../runner.js';

// Secret patterns with descriptions
type SecretPattern = {
  name: string;
  pattern: RegExp;
  severity: 'CRITICAL' | 'HIGH' | 'MEDIUM';
};

const secretPatterns: SecretPattern[] = [
  // AWS
  {
    name: 'AWS Access Key',
    pattern: /AKIA[\dA-Z]{16}/g,
    severity: 'CRITICAL',
  },
  {
    name: 'AWS Secret Key',
    pattern:
      /(?:aws_secret_access_key|secret_key|aws_secret)\s*[=:]\s*["']?([a-z\d/+=]{40})["']?/gi,
    severity: 'CRITICAL',
  },
  // GitHub
  {
    name: 'GitHub Token',
    pattern: /gh[pousr]_[a-zA-Z\d]{36,}/g,
    severity: 'CRITICAL',
  },
  // Anthropic
  {
    name: 'Anthropic API Key',
    pattern: /sk-ant-[a-zA-Z\d-]{20,}/g,
    severity: 'CRITICAL',
  },
  // OpenAI
  {
    name: 'OpenAI API Key',
    pattern: /sk-[a-zA-Z\d]{48,}/g,
    severity: 'CRITICAL',
  },
  // Slack
  {
    name: 'Slack Token',
    pattern: /xox[baprs]-[\da-zA-Z-]{10,}/g,
    severity: 'CRITICAL',
  },
  // Private Keys
  {
    name: 'Private Key',
    pattern: /-----BEGIN\s+(?:RSA|DSA|EC|OPENSSH|PGP)\s+PRIVATE\s+KEY-----/g,
    severity: 'CRITICAL',
  },
  // Connection Strings
  {
    name: 'Database Connection String',
    pattern: /(?:mongodb|postgres|postgresql|mysql|redis|amqp):\/\/[^:]+:[^@]+@[^\s"']+/gi,
    severity: 'CRITICAL',
  },
  // Password in URL
  {
    name: 'Password in URL',
    pattern: /:\/\/[^:]+:[^@\s"']+@[^\s"']+/g,
    severity: 'HIGH',
  },
  // JWT
  {
    name: 'JWT Token',
    pattern: /(?:eyJ[\w-]{10,}\.){2}[\w-]{10,}/g,
    severity: 'HIGH',
  },
  // Generic API Key patterns
  {
    name: 'Generic API Key',
    pattern: /(?:api[_-]?key|apikey|api_secret|api_token)\s*[=:]\s*["']?[\w-]{20,}["']?/gi,
    severity: 'MEDIUM',
  },
  // Bearer Token
  {
    name: 'Bearer Token',
    pattern: /Bearer\s+[\w.-]{20,}/g,
    severity: 'HIGH',
  },
  // Generic Secret
  {
    name: 'Generic Secret',
    pattern: /(?:secret|password|passwd|pwd)\s*[=:]\s*["'][^"']{8,}["']/gi,
    severity: 'MEDIUM',
  },
  // Stripe
  {
    name: 'Stripe API Key',
    pattern: /sk_(?:live|test)_[a-zA-Z\d]{24,}/g,
    severity: 'CRITICAL',
  },
  // SendGrid
  {
    name: 'SendGrid API Key',
    pattern: /SG\.[\w-]{22}\.[\w-]{43}/g,
    severity: 'CRITICAL',
  },
  // Twilio
  {
    name: 'Twilio API Key',
    pattern: /SK[a-f\d]{32}/g,
    severity: 'CRITICAL',
  },
];

type SecretMatch = {
  pattern: SecretPattern;
  file: string;
  line: number;
  preview: string;
};

/**
 * Check if the command is a git commit or git push
 */
function isGitCommitOrPush(command: string): boolean {
  return /git\s+(?:commit|push)\b/.test(command);
}

/**
 * Mask a secret for safe display
 */
function maskSecret(secret: string): string {
  if (secret.length <= 8) {
    return '*'.repeat(secret.length);
  }

  return secret.slice(0, 4) + '*'.repeat(secret.length - 8) + secret.slice(-4);
}

/**
 * Get staged files and their content
 */
function getStagedContent(): Map<string, string> {
  const content = new Map<string, string>();

  try {
    // Get list of staged files
    const stagedFiles = execSync('git diff --cached --name-only', {
      encoding: 'utf8',
      timeout: 5000,
    })
      .trim()
      .split('\n')
      .filter(Boolean);

    for (const file of stagedFiles) {
      try {
        // Get staged content of each file
        const fileContent = execSync(`git show :0:"${file}"`, {
          encoding: 'utf8',
          timeout: 5000,
        });
        content.set(file, fileContent);
      } catch {
        // File might be deleted or binary, skip
      }
    }
  } catch {
    // Not in a git repo or no staged files
  }

  return content;
}

/**
 * Scan content for secrets
 */
function scanForSecrets(files: Map<string, string>): SecretMatch[] {
  const matches: SecretMatch[] = [];

  for (const [file, content] of files) {
    const lines = content.split('\n');

    for (const pattern of secretPatterns) {
      // Reset regex state
      pattern.pattern.lastIndex = 0;

      let match: RegExpExecArray | undefined;
      while ((match = pattern.pattern.exec(content) ?? undefined) !== undefined) {
        // Find the line number
        const beforeMatch = content.slice(0, match.index);
        const lineNumber = beforeMatch.split('\n').length;
        const line = lines[lineNumber - 1] ?? '';

        // Create a preview with masked secret
        const matchedText = match[0];
        const maskedLine = line.replace(matchedText, maskSecret(matchedText));

        matches.push({
          pattern,
          file,
          line: lineNumber,
          preview: maskedLine.trim().slice(0, 80),
        });
      }
    }
  }

  return matches;
}

/**
 * Format matches for display
 */
function formatMatches(matches: SecretMatch[]): string {
  const lines: string[] = [];

  // Group by file
  const byFile = new Map<string, SecretMatch[]>();
  for (const match of matches) {
    const existing = byFile.get(match.file) ?? [];
    existing.push(match);
    byFile.set(match.file, existing);
  }

  for (const [file, fileMatches] of byFile) {
    lines.push(`\nFile: ${file}`);
    for (const match of fileMatches) {
      lines.push(
        `  Line ${match.line}: ${match.pattern.name} [${match.pattern.severity}]`,
        `    > ${match.preview}`
      );
    }
  }

  return lines.join('\n');
}

/**
 * Secret Scanner Hook Implementation
 */
export async function secretScannerHook(input: PreToolUseInput): Promise<PreToolUseOutput> {
  // Extract command
  const toolInput = input.tool_input;
  const command = typeof toolInput === 'object' && toolInput ? (toolInput.command as string) : '';

  log(`Command: ${command || '(empty)'}`);

  // Check if this is a git commit or push
  if (!command || !isGitCommitOrPush(command)) {
    logAllowed('Not a git commit/push command');
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  log('Scanning staged files for secrets...');

  // Get staged files
  const stagedContent = getStagedContent();

  if (stagedContent.size === 0) {
    logAllowed('No staged files to scan');
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  log(`Scanning ${stagedContent.size} staged file(s)`);

  // Scan for secrets
  const matches = scanForSecrets(stagedContent);

  if (matches.length === 0) {
    logAllowed('No secrets detected in staged files');
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  // Secrets found - BLOCK
  const criticalCount = matches.filter((m) => m.pattern.severity === 'CRITICAL').length;
  const highCount = matches.filter((m) => m.pattern.severity === 'HIGH').length;
  const mediumCount = matches.filter((m) => m.pattern.severity === 'MEDIUM').length;

  logBlocked(
    `${matches.length} secret(s) detected in staged files`,
    'NEVER commit secrets to version control.'
  );

  log('');
  log(`Found: ${criticalCount} CRITICAL, ${highCount} HIGH, ${mediumCount} MEDIUM`);
  log(formatMatches(matches));
  log('');
  log('RESOLUTION:');
  log('1. Remove the secret(s) from the file(s)');
  log('2. Use environment variables instead');
  log('3. Run: git reset HEAD <file> to unstage');
  log('4. Add sensitive files to .gitignore');
  log('');

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `Blocked: ${matches.length} secret(s) detected in staged files (${criticalCount} CRITICAL, ${highCount} HIGH, ${mediumCount} MEDIUM)`,
    },
  };
}

// Register the hook
registerHook('secret-scanner', 'PreToolUse', secretScannerHook);

export default secretScannerHook;
