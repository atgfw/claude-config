/**
 * Branch Naming Validator Hook
 * Validates branch names follow standard naming conventions
 * Enforcement: WARN - Display warning but allow branch creation
 */

import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
import { log, logAllowed } from '../utils.js';
import { registerHook } from '../runner.js';

// Allowed branch prefixes
const allowedPrefixes = ['feature', 'bugfix', 'hotfix', 'release', 'chore', 'docs'];

// Protected branches that cannot be created directly
const protectedBranches = new Set(['main', 'develop']);

// BANNED branch name - always use 'main' instead
const BANNED_BRANCH = 'master';
const DEFAULT_BRANCH = 'main';

// Regex for valid branch name format: prefix/kebab-case-description
const branchNameRegex =
  /^(?<prefix>feature|bugfix|hotfix|release|chore|docs)\/(?<description>[a-z\d][a-z\d-]*[a-z\d])$/;

type ValidationResult = {
  valid: boolean;
  prefix?: string;
  description?: string;
  errors: string[];
  warnings: string[];
};

/**
 * Extract branch name from git command
 */
function extractBranchName(command: string): string | undefined {
  // Match git checkout -b <branch>
  const checkoutMatch = /git\s+checkout\s+-b\s+["']?([^\s"']+)["']?/i.exec(command);
  if (checkoutMatch) {
    return checkoutMatch[1];
  }

  // Match git branch <branch>
  const branchMatch = /git\s+branch\s+["']?([^\s"'-][^\s"']*)["']?/i.exec(command);
  if (branchMatch) {
    return branchMatch[1];
  }

  // Match git switch -c <branch>
  const switchMatch = /git\s+switch\s+-c\s+["']?([^\s"']+)["']?/i.exec(command);
  if (switchMatch) {
    return switchMatch[1];
  }

  return undefined;
}

/**
 * Validate a branch name against naming conventions
 */
function validateBranchName(branchName: string): ValidationResult {
  const result: ValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  // Check if it's a protected branch
  if (protectedBranches.has(branchName.toLowerCase())) {
    result.valid = false;
    result.errors.push(
      `"${branchName}" is a protected branch and cannot be created directly`,
      'Create a feature branch instead: feature/<description>'
    );
    return result;
  }

  // Try to parse the branch name
  const match = branchNameRegex.exec(branchName);

  if (!match?.groups) {
    result.valid = false;

    // Provide specific guidance based on the issue
    if (branchName.includes('/')) {
      const [prefix] = branchName.split('/');
      if (prefix && !allowedPrefixes.includes(prefix.toLowerCase())) {
        result.errors.push(
          `Invalid prefix "${prefix}"`,
          `Allowed prefixes: ${allowedPrefixes.join(', ')}`
        );
      }
    } else {
      result.errors.push('Branch name must include a prefix with slash: prefix/description');
    }

    // Check for common issues
    if (/[A-Z]/.test(branchName)) {
      result.errors.push('Branch name must be lowercase');
    }

    if (branchName.includes('_')) {
      result.errors.push('Use hyphens (-) instead of underscores (_)');
    }

    if (/\s/.test(branchName)) {
      result.errors.push('Branch name cannot contain spaces');
    }

    return result;
  }

  const { prefix, description } = match.groups;
  result.prefix = prefix;
  result.description = description;

  // Additional warnings
  if (description && description.length < 3) {
    result.warnings.push('Description is very short - consider a more descriptive name');
  }

  if (description && description.length > 50) {
    result.warnings.push(`Description is long (${description.length} chars) - consider shortening`);
  }

  return result;
}

/**
 * Check if the command creates a new branch
 */
function isNewBranchCommand(command: string): boolean {
  return (
    /git\s+checkout\s+-b\b/.test(command) ||
    /git\s+branch\s+[^-]/.test(command) ||
    /git\s+switch\s+-c\b/.test(command)
  );
}

/**
 * Check if command references the banned 'master' branch
 */
function referencesMasterBranch(command: string): boolean {
  // Match various git commands that reference master
  const masterPatterns = [
    /git\s+checkout\s+master\b/i,
    /git\s+switch\s+master\b/i,
    /git\s+push\s+\S+\s+master\b/i,
    /git\s+pull\s+\S+\s+master\b/i,
    /git\s+merge\s+master\b/i,
    /git\s+rebase\s+master\b/i,
    /git\s+branch\s+-[dD]\s+master\b/i,
    /origin\/master\b/i,
  ];
  return masterPatterns.some((pattern) => pattern.test(command));
}

/**
 * Log a warning (non-blocking)
 */
function logWarning(title: string, details?: string): void {
  log('');
  log(`[WARNING] ${title}`);
  if (details) {
    log('');
    log('Rule:');
    log(`> ${details}`);
  }
}

/**
 * Branch Naming Validator Hook Implementation
 */
export async function branchNamingValidatorHook(input: PreToolUseInput): Promise<PreToolUseOutput> {
  // Extract command
  const toolInput = input.tool_input;
  const command = typeof toolInput === 'object' && toolInput ? (toolInput.command as string) : '';

  log(`Command: ${command || '(empty)'}`);

  // STRICT: Block any reference to 'master' branch
  if (command && referencesMasterBranch(command)) {
    log('');
    log('[BLOCKED] Reference to banned branch "master" detected');
    log('');
    log('STANDARD: Always use "main" as the default branch');
    log('');
    log('Replace your command:');
    log(`  - "master" -> "${DEFAULT_BRANCH}"`);
    log(`  - "origin/master" -> "origin/${DEFAULT_BRANCH}"`);
    log('');

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `BLOCKED: Branch "${BANNED_BRANCH}" is banned. Use "${DEFAULT_BRANCH}" instead. ` +
          'All repositories must use "main" as the default branch.',
      },
    };
  }

  // Check if this creates a new branch
  if (!command || !isNewBranchCommand(command)) {
    logAllowed('Not a new branch creation command');
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  // Extract the branch name
  const branchName = extractBranchName(command);

  if (!branchName) {
    logAllowed('Could not extract branch name');
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  log(`Validating branch name: "${branchName}"`);

  // Validate the branch name
  const validation = validateBranchName(branchName);

  if (validation.valid && validation.warnings.length === 0) {
    logAllowed('Branch name follows naming conventions');
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  // Log issues (but allow the branch creation)
  if (!validation.valid) {
    logWarning(
      'Branch name does not follow naming conventions',
      'All branches should follow the pattern: prefix/kebab-case-description'
    );

    log('');
    log('ERRORS:');
    for (const error of validation.errors) {
      log(`  - ${error}`);
    }
  }

  if (validation.warnings.length > 0) {
    if (validation.valid) {
      logWarning('Branch name has style issues');
    }

    log('');
    log('WARNINGS:');
    for (const warning of validation.warnings) {
      log(`  - ${warning}`);
    }
  }

  log('');
  log('BRANCH NAMING CONVENTIONS:');
  log('  Format: <prefix>/<kebab-case-description>');
  log('');
  log('  Prefixes:');
  log('    feature/ - New functionality');
  log('    bugfix/  - Bug fixes');
  log('    hotfix/  - Urgent production fixes');
  log('    release/ - Release preparation');
  log('    chore/   - Maintenance tasks');
  log('    docs/    - Documentation changes');
  log('');
  log('EXAMPLES:');
  log('  feature/add-user-authentication');
  log('  bugfix/fix-login-redirect');
  log('  hotfix/patch-security-vulnerability');
  log('  docs/update-api-reference');
  log('');

  // WARN only - allow the branch creation to proceed
  logAllowed('Branch creation allowed (soft enforcement)');

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: validation.valid
        ? `Warning: ${validation.warnings.length} style issue(s) in branch name`
        : 'Warning: Branch name does not follow naming conventions',
    },
  };
}

// Register the hook
registerHook('branch-naming-validator', 'PreToolUse', branchNamingValidatorHook);

export default branchNamingValidatorHook;
