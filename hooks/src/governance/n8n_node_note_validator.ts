/**
 * n8n Node Note Validator Hook
 *
 * ENFORCES documentation requirements for n8n nodes.
 * Part of the Spinal Cord - global governance for child projects.
 *
 * Rules (see hooks/docs/n8n-governance.md "Node Documentation"):
 * - All nodes MUST have substantial notes (minimum 20 characters)
 * - Notes MUST describe purpose, not just repeat node name
 * - "Display Note in Flow?" MUST be enabled (notesInFlow: true)
 * - No placeholder text (TODO, FIXME, etc.)
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
  notes?: string;
  notesInFlow?: boolean;
  parameters?: Record<string, unknown>;
}

interface N8nWorkflowPayload {
  name?: string;
  nodes?: N8nNode[];
}

interface NoteValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

// ============================================================================
// Constants
// ============================================================================

const MIN_NOTE_LENGTH = 20;

const PLACEHOLDER_PATTERNS = [
  /^todo\b/i,
  /^fixme\b/i,
  /^xxx\b/i,
  /^hack\b/i,
  /\badd description\b/i,
  /\badd note\b/i,
  /\bdescription here\b/i,
  /\bnote here\b/i,
  /^tbd\b/i,
  /^\.\.\./,
  /^…/,
];

// ============================================================================
// Validation Functions
// ============================================================================

/**
 * Check if a note is a placeholder
 */
export function isPlaceholderNote(note: string): boolean {
  const trimmed = note.trim();
  return PLACEHOLDER_PATTERNS.some((pattern) => pattern.test(trimmed));
}

/**
 * Check if note duplicates the node name
 */
export function isDuplicateOfName(note: string, nodeName: string): boolean {
  const normalizedNote = note.toLowerCase().replace(/[^a-z0-9]/g, '');
  const normalizedName = nodeName.toLowerCase().replace(/[^a-z0-9]/g, '');

  // Exact match after normalization
  if (normalizedNote === normalizedName) {
    return true;
  }

  // Note is just the name with minor additions
  if (
    normalizedNote.length < normalizedName.length + 10 &&
    normalizedNote.includes(normalizedName)
  ) {
    return true;
  }

  return false;
}

/**
 * Check if note contains at least one verb (action word)
 * This ensures the note describes what the node does
 */
export function containsActionVerb(note: string): boolean {
  const commonVerbs = [
    'fetch',
    'get',
    'set',
    'send',
    'receive',
    'create',
    'update',
    'delete',
    'transform',
    'convert',
    'parse',
    'filter',
    'map',
    'reduce',
    'validate',
    'check',
    'verify',
    'process',
    'handle',
    'trigger',
    'execute',
    'run',
    'call',
    'invoke',
    'post',
    'put',
    'patch',
    'merge',
    'split',
    'join',
    'format',
    'extract',
    'load',
    'save',
    'store',
    'read',
    'write',
    'sync',
    'import',
    'export',
    'authenticate',
    'authorize',
    'notify',
    'log',
    'track',
    'monitor',
    'calculate',
    'compute',
    'generate',
    'build',
    'construct',
    'initialize',
    'configure',
    'setup',
    'wait',
    'delay',
    'retry',
    'loop',
    'iterate',
    'aggregate',
    'collect',
  ];

  const noteLower = note.toLowerCase();
  return commonVerbs.some((verb) => {
    // Match verb as whole word
    const regex = new RegExp(`\\b${verb}(?:s|es|ed|ing)?\\b`, 'i');
    return regex.test(noteLower);
  });
}

/**
 * Validate a single node's documentation
 */
export function validateNodeNote(node: N8nNode): NoteValidationResult {
  const result: NoteValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  const note = node.notes ?? '';
  const noteTrimmed = note.trim();

  // Check note presence
  if (!noteTrimmed) {
    result.valid = false;
    result.errors.push(
      `Node must have a note describing its purpose. ` +
        `Example: "Fetches active jobs from ServiceTitan API for current dispatch zone"`
    );
    return result;
  }

  // Check minimum length
  if (noteTrimmed.length < MIN_NOTE_LENGTH) {
    result.valid = false;
    result.errors.push(
      `Note too short (${noteTrimmed.length} chars, minimum ${MIN_NOTE_LENGTH}). ` +
        `Describe WHAT data is processed and WHERE it comes from`
    );
  }

  // Check for placeholder text
  if (isPlaceholderNote(noteTrimmed)) {
    result.valid = false;
    result.errors.push(
      `Placeholder notes not allowed - describe the actual purpose. ` +
        `Bad: "TODO: add description". ` +
        `Good: "Transforms raw API response into normalized format for downstream processing"`
    );
  }

  // Check if note just duplicates name
  if (isDuplicateOfName(noteTrimmed, node.name)) {
    result.valid = false;
    result.errors.push(
      `Note must describe purpose, not just repeat the node name. ` +
        `Bad: "${node.name}". ` +
        `Good: "Retrieves customer records filtered by status and creation date"`
    );
  }

  // Check for action verb (warning, not blocking)
  if (!containsActionVerb(noteTrimmed)) {
    result.warnings.push('Note should describe what the node does (use action verbs)');
  }

  // Check notesInFlow setting
  if (node.notesInFlow === false) {
    result.valid = false;
    result.errors.push('Enable "Display Note in Flow?" for visibility');
  }
  // Note: if notesInFlow is undefined, n8n may default to true, so we only block on explicit false

  return result;
}

/**
 * Validate all nodes in a workflow payload
 */
export function validateWorkflowNotes(payload: N8nWorkflowPayload): NoteValidationResult {
  const result: NoteValidationResult = {
    valid: true,
    errors: [],
    warnings: [],
  };

  if (!payload.nodes || !Array.isArray(payload.nodes)) {
    return result; // No nodes to validate
  }

  for (const node of payload.nodes) {
    // Skip certain built-in trigger nodes that may not need notes
    if (node.type === 'n8n-nodes-base.manualTrigger' || node.type === 'n8n-nodes-base.start') {
      continue;
    }

    const nodeResult = validateNodeNote(node);

    if (!nodeResult.valid) {
      result.valid = false;
    }

    // Prefix errors with node context
    result.errors.push(...nodeResult.errors.map((e) => `Node "${node.name}": ${e}`));
    result.warnings.push(...nodeResult.warnings.map((w) => `Node "${node.name}": ${w}`));
  }

  return result;
}

// ============================================================================
// Hook Implementation
// ============================================================================

/**
 * Main n8n node note validator hook
 */
export async function n8nNodeNoteValidatorHook(input: PreToolUseInput): Promise<PreToolUseOutput> {
  const toolName = input.tool_name ?? '';
  const toolInput = input.tool_input as Record<string, unknown>;

  log(`[NOTE] Validating n8n node documentation: ${toolName}`);

  // Extract nodes from payload
  const nodes = (toolInput['nodes'] as N8nNode[]) ?? [];

  const payload: N8nWorkflowPayload = {
    name: (toolInput['name'] as string) ?? '',
    nodes: nodes,
  };

  // Validate the nodes
  const validation = validateWorkflowNotes(payload);

  // Log validation results
  if (validation.errors.length > 0) {
    log('[NOTE] Documentation errors:');
    validation.errors.forEach((e) => log(`  - ${e}`));
  }
  if (validation.warnings.length > 0) {
    log('[NOTE] Documentation warnings:');
    validation.warnings.forEach((w) => log(`  - ${w}`));
  }

  // Block if invalid
  if (!validation.valid) {
    const errorSummary = validation.errors.join('; ');

    logBlocked(
      `Node documentation validation failed: ${errorSummary}`,
      'n8n Node Documentation - see hooks/docs/n8n-governance.md'
    );

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `DOCUMENTATION VIOLATION: ${errorSummary}`,
      },
    };
  }

  // Allow with warnings
  if (validation.warnings.length > 0) {
    const warningSummary = validation.warnings.join('; ');
    logAllowed(`Documentation validation passed with warnings: ${warningSummary}`);

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason: `DOCUMENTATION WARNING: ${warningSummary}`,
      },
    };
  }

  // Clean pass
  logAllowed('Node documentation validation passed');

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
      permissionDecisionReason: 'Node documentation validated',
    },
  };
}

// Register the hook
registerHook('n8n-node-note-validator', 'PreToolUse', n8nNodeNoteValidatorHook);

export default n8nNodeNoteValidatorHook;
