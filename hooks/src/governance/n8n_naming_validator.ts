/**
 * n8n Naming Validator Hook
 *
 * ENFORCES naming conventions for n8n workflows and nodes.
 * Part of the Spinal Cord - global governance for child projects.
 *
 * Rules (see hooks/docs/n8n-governance.md "Naming Conventions"):
 * - Reserve [TAG] syntax for systems without built-in tags (n8n has native tags)
 * - Use full system names as prefixes (ServiceTitan_ not [ST])
 * - Ban version numbers in names (v1, v2, r1, r2)
 * - Enforce snake_case for node names
 * - Ban arbitrary integers in names (unless canonical like base64, oauth2)
 */

import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
import { log, logBlocked, logAllowed } from '../utils.js';
import { registerHook } from '../runner.js';

// ============================================================================
// Types
// ============================================================================

interface N8nNode {
  name: string;
  type: string;
  parameters?: Record<string, unknown>;
}

interface N8nWorkflowPayload {
  name?: string;
  nodes?: N8nNode[];
}

interface NamingValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

// ============================================================================
// Canonical Exceptions
// ============================================================================

/**
 * Canonical names that contain integers but are allowed
 * These are industry-standard terms where the integer is part of the name
 */
const CANONICAL_INTEGER_EXCEPTIONS = new Set([
  'base64',
  'utf8',
  'utf16',
  'utf32',
  'sha256',
  'sha512',
  'sha384',
  'sha1',
  'md5',
  'oauth2',
  'http2',
  'http3',
  'web3',
  'es6',
  'es2015',
  'es2020',
  'es2021',
  'es2022',
  'es2023',
  'ipv4',
  'ipv6',
  'mp3',
  'mp4',
  'h264',
  'h265',
  'aes128',
  'aes256',
  'rsa2048',
  'rsa4096',
  'i18n',
  'l10n',
  'g11n',
  '3d',
  '2d',
  '2fa',
  'mfa',
]);

/**
 * System name mappings - abbreviations to full names
 */
const SYSTEM_ABBREVIATIONS: Record<string, string> = {
  '[ST]': 'ServiceTitan_',
  '[EL]': 'ElevenLabs_',
  '[N8N]': '', // No prefix needed for native n8n workflows
  '[HV]': 'Harvest_',
  '[QB]': 'QuickBooks_',
  '[SF]': 'Salesforce_',
  '[ZD]': 'Zendesk_',
  '[TW]': 'Twilio_',
  '[SG]': 'SendGrid_',
  '[GS]': 'GoogleSheets_',
  '[GD]': 'GoogleDrive_',
  '[GC]': 'GoogleCalendar_',
  '[SL]': 'Slack_',
  '[DS]': 'Discord_',
  '[GH]': 'GitHub_',
  '[GL]': 'GitLab_',
  '[JR]': 'Jira_',
  '[AS]': 'Asana_',
  '[TR]': 'Trello_',
  '[NT]': 'Notion_',
  '[AF]': 'Airtable_',
};

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if name contains bracket tag syntax [TAG]
 */
export function containsBracketTag(name: string): { found: boolean; tag: string | null } {
  const tagMatch = name.match(/\[([A-Z0-9]+)\]/);
  if (tagMatch) {
    return { found: true, tag: tagMatch[0] };
  }
  return { found: false, tag: null };
}

/**
 * Check if name contains version number patterns (v1, v2, r1, _1, etc.)
 */
export function containsVersionNumber(name: string): { found: boolean; pattern: string | null } {
  // Match patterns like v1, v2, r1, r2, _1, _2
  // Note: \b doesn't work as expected with underscore, so we use explicit patterns
  const versionPatterns = [
    /(?:^|[^a-z])v(\d+)(?:$|[^a-z0-9])/i, // v1, v2, V3 (not preceded by letter)
    /(?:^|[^a-z])r(\d+)(?:$|[^a-z0-9])/i, // r1, r2, R3 (revision)
    /_(\d+)$/, // trailing _1, _2
    /(?:^|_)ver(\d+)(?:$|_)/i, // ver1, ver2
    /(?:^|_)version(\d+)(?:$|_)/i, // version1, version2
  ];

  for (const pattern of versionPatterns) {
    const match = name.match(pattern);
    if (match) {
      // Extract the matched version part
      const fullMatch = match[0];
      // Clean up the matched pattern to show just the version
      const versionPart = fullMatch.replace(/^[^a-zA-Z0-9]+/, '').replace(/[^a-zA-Z0-9]+$/, '');
      return { found: true, pattern: versionPart };
    }
  }

  return { found: false, pattern: null };
}

/**
 * Check if name is snake_case
 * Allows alphanumeric lowercase and underscores
 */
export function isSnakeCase(name: string): boolean {
  // snake_case: lowercase letters, numbers, underscores only
  // Must not start or end with underscore
  // Must not have consecutive underscores
  return /^[a-z][a-z0-9]*(?:_[a-z0-9]+)*$/.test(name);
}

/**
 * Convert name to suggested snake_case
 */
export function toSnakeCase(name: string): string {
  return name
    .replace(/([A-Z])/g, '_$1') // Add underscore before capitals
    .toLowerCase()
    .replace(/[\s-]+/g, '_') // Replace spaces/hyphens with underscore
    .replace(/_+/g, '_') // Collapse multiple underscores
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
}

/**
 * Check if name contains arbitrary integers (not canonical)
 */
export function containsArbitraryInteger(name: string): { found: boolean; integer: string | null } {
  // Extract all numeric sequences
  const nameLower = name.toLowerCase();

  // First check if the entire name (or a word in it) matches a canonical exception
  for (const canonical of CANONICAL_INTEGER_EXCEPTIONS) {
    if (nameLower.includes(canonical)) {
      // This is a canonical pattern, check if the number is part of it
      const numMatch = canonical.match(/\d+/);
      if (numMatch) {
        // Remove this canonical pattern from consideration
        const withoutCanonical = nameLower.replace(canonical, '');
        // Check remaining for integers
        const remainingMatch = withoutCanonical.match(/\d+/);
        if (remainingMatch) {
          return { found: true, integer: remainingMatch[0] };
        }
        return { found: false, integer: null };
      }
    }
  }

  // No canonical exception, check for any integers
  const integerMatch = name.match(/\d+/);
  if (integerMatch) {
    return { found: true, integer: integerMatch[0] };
  }

  return { found: false, integer: null };
}

/**
 * Suggest full system name prefix from abbreviation
 */
export function suggestSystemPrefix(tag: string): string | null {
  const upperTag = tag.toUpperCase();
  // Handle with or without brackets
  const withBrackets = upperTag.startsWith('[') ? upperTag : `[${upperTag}]`;
  return SYSTEM_ABBREVIATIONS[withBrackets] ?? null;
}

// ============================================================================
// Main Validation
// ============================================================================

/**
 * Validate a workflow name
 */
export function validateWorkflowName(name: string): NamingValidationResult {
  const result: NamingValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  };

  if (!name || name.trim() === '') {
    result.valid = false;
    result.errors.push('Workflow name cannot be empty');
    return result;
  }

  // Check for bracket tags (blocked for n8n - use native tags)
  const bracketCheck = containsBracketTag(name);
  if (bracketCheck.found && bracketCheck.tag !== '[DEV]') {
    result.valid = false;
    const suggestion = bracketCheck.tag ? suggestSystemPrefix(bracketCheck.tag) : null;
    if (suggestion) {
      result.errors.push(`Bracket tag "${bracketCheck.tag}" not allowed in n8n (use native tags)`);
      result.suggestions.push(`Replace "${bracketCheck.tag}" with prefix "${suggestion}"`);
    } else {
      result.errors.push(
        `Bracket tag "${bracketCheck.tag}" not allowed in n8n (use native tags instead)`
      );
    }
  }

  // Check for version numbers
  const versionCheck = containsVersionNumber(name);
  if (versionCheck.found) {
    result.valid = false;
    result.errors.push(`Version number "${versionCheck.pattern}" banned in names`);
    result.suggestions.push('Use n8n tags or create a new workflow instead of versioning names');
  }

  // Check for arbitrary integers (warning, not blocking for workflow names)
  const integerCheck = containsArbitraryInteger(name);
  if (integerCheck.found) {
    result.warnings.push(
      `Integer "${integerCheck.integer}" in name - consider if this is necessary`
    );
  }

  return result;
}

/**
 * Validate a node name
 */
export function validateNodeName(name: string): NamingValidationResult {
  const result: NamingValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  };

  if (!name || name.trim() === '') {
    result.valid = false;
    result.errors.push('Node name cannot be empty');
    return result;
  }

  // Check for snake_case
  if (!isSnakeCase(name)) {
    result.valid = false;
    result.errors.push(`Node name "${name}" must be snake_case`);
    result.suggestions.push(`Rename to "${toSnakeCase(name)}"`);
  }

  // Check for version numbers
  const versionCheck = containsVersionNumber(name);
  if (versionCheck.found) {
    result.valid = false;
    result.errors.push(`Version number "${versionCheck.pattern}" banned in node names`);
    result.suggestions.push('Use descriptive name without version suffix');
  }

  // Check for arbitrary integers
  const integerCheck = containsArbitraryInteger(name);
  if (integerCheck.found) {
    result.valid = false;
    result.errors.push(
      `Integer "${integerCheck.integer}" not allowed in node names (unless canonical)`
    );
    result.suggestions.push('Use descriptive suffix instead of numeric identifier');
  }

  return result;
}

/**
 * Validate an entire workflow payload (name + all nodes)
 */
export function validateWorkflowPayload(payload: N8nWorkflowPayload): NamingValidationResult {
  const result: NamingValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  };

  // Validate workflow name
  if (payload.name) {
    const nameResult = validateWorkflowName(payload.name);
    if (!nameResult.valid) {
      result.valid = false;
    }
    result.errors.push(...nameResult.errors);
    result.warnings.push(...nameResult.warnings);
    result.suggestions.push(...nameResult.suggestions);
  }

  // Validate node names
  if (payload.nodes && Array.isArray(payload.nodes)) {
    for (const node of payload.nodes) {
      if (node.name) {
        const nodeResult = validateNodeName(node.name);
        if (!nodeResult.valid) {
          result.valid = false;
        }
        // Prefix errors with node context
        result.errors.push(...nodeResult.errors.map((e) => `Node "${node.name}": ${e}`));
        result.warnings.push(...nodeResult.warnings.map((w) => `Node "${node.name}": ${w}`));
        result.suggestions.push(...nodeResult.suggestions.map((s) => `Node "${node.name}": ${s}`));
      }
    }
  }

  return result;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Main n8n naming validator hook
 */
export async function n8nNamingValidatorHook(input: PreToolUseInput): Promise<PreToolUseOutput> {
  const toolName = input.tool_name ?? '';
  const toolInput = input.tool_input as Record<string, unknown>;

  log(`[NAMING] Validating n8n operation: ${toolName}`);

  // Extract workflow payload
  const workflowName = (toolInput['name'] as string) ?? '';
  const nodes = (toolInput['nodes'] as N8nNode[]) ?? [];

  const payload: N8nWorkflowPayload = {
    name: workflowName,
    nodes: nodes,
  };

  // Validate the payload
  const validation = validateWorkflowPayload(payload);

  // Log validation results
  if (validation.errors.length > 0) {
    log('[NAMING] Validation errors:');
    validation.errors.forEach((e) => log(`  - ${e}`));
  }
  if (validation.warnings.length > 0) {
    log('[NAMING] Validation warnings:');
    validation.warnings.forEach((w) => log(`  - ${w}`));
  }
  if (validation.suggestions.length > 0) {
    log('[NAMING] Suggestions:');
    validation.suggestions.forEach((s) => log(`  - ${s}`));
  }

  // Block if invalid
  if (!validation.valid) {
    const errorSummary = validation.errors.join('; ');
    const suggestionSummary =
      validation.suggestions.length > 0
        ? `\n\nSuggestions:\n${validation.suggestions.map((s) => `  - ${s}`).join('\n')}`
        : '';

    logBlocked(
      `Naming validation failed: ${errorSummary}`,
      'n8n Naming Conventions - see hooks/docs/n8n-governance.md'
    );

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `NAMING VIOLATION: ${errorSummary}${suggestionSummary}`,
      },
    };
  }

  // Allow with warnings
  if (validation.warnings.length > 0) {
    const warningSummary = validation.warnings.join('; ');
    logAllowed(`Naming validation passed with warnings: ${warningSummary}`);

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason: `NAMING WARNING: ${warningSummary}`,
      },
    };
  }

  // Clean pass
  logAllowed('Naming validation passed');

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: 'Naming conventions validated',
    },
  };
}

// Register the hook
registerHook('n8n-naming-validator', 'PreToolUse', n8nNamingValidatorHook);

export default n8nNamingValidatorHook;
