/**
 * Spec Completeness Validator
 *
 * ENFORCES that all specs are complete before build phase
 *
 * Critical Rules from CLAUDE.md:
 * - Every node/function/object MUST have detailed spec BEFORE building
 * - Spec must include: inputs, logic, outputs, routes, test cases
 * - Design Enforcer Audit required before approval
 *
 * Checks:
 * - Spec files have all required sections
 * - No PENDING or TODO markers in specs
 * - All checkboxes marked complete
 */

import { PreToolUseInput, PreToolUseOutput } from '../types.js';
import { log, logBlocked } from '../utils.js';
import { registerHook } from '../runner.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Check if file is a spec file
 */
function isSpecFile(filePath: string): boolean {
  const filename = path.basename(filePath).toLowerCase();
  return filename.includes('spec') || filename.includes('design');
}

/**
 * Check if file is implementation code
 */
function isImplementationFile(filePath: string): boolean {
  const ext = path.extname(filePath).toLowerCase();
  return (
    ['.ts', '.js', '.tsx', '.jsx', '.py'].includes(ext) &&
    !filePath.includes('/test') &&
    !filePath.includes('\\test') &&
    !isSpecFile(filePath)
  );
}

/**
 * Check spec completeness
 */
function validateSpec(content: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for PENDING markers
  if (content.includes('PENDING') || content.includes('[ ] PENDING')) {
    errors.push('Spec contains PENDING markers');
  }

  // Check for TODO markers
  if (content.includes('TODO:') || content.includes('TODO -')) {
    errors.push('Spec contains TODO markers');
  }

  // Check for incomplete checkboxes in audit sections
  const auditSectionMatch = content.match(/## ENFORCER AUDIT[\s\S]*?##/);
  if (auditSectionMatch) {
    const auditSection = auditSectionMatch[0];
    if (auditSection.includes('[ ]')) {
      errors.push('Enforcer audit has unchecked items');
    }
  }

  // Check for required sections (for YAML specs)
  if (content.includes('inputs:') || content.includes('outputs:')) {
    const requiredSections = ['inputs:', 'logic:', 'outputs:', 'routes:', 'test_cases:'];
    const missingSections = requiredSections.filter((section) => !content.includes(section));
    if (missingSections.length > 0) {
      errors.push(`Missing required sections: ${missingSections.join(', ')}`);
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

export async function specCompletenessValidatorHook(
  input: PreToolUseInput
): Promise<PreToolUseOutput> {
  // Only check Write to implementation files
  if (input.tool_name !== 'Write' && input.tool_name !== 'Edit') {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  const toolInput = input.tool_input as Record<string, unknown>;
  const filePath = toolInput['file_path'] as string;

  if (!filePath || !isImplementationFile(filePath)) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  // Find associated spec file
  const dir = path.dirname(filePath);
  const possibleSpecPaths = [
    path.join(dir, 'spec.md'),
    path.join(dir, 'design.md'),
    path.join(dir, '..', 'specs', path.basename(filePath, path.extname(filePath)) + '.yaml'),
    path.join(dir, '..', 'openspec', 'design.md'),
  ];

  let specFound = false;
  let specValid = true;
  let specErrors: string[] = [];

  for (const specPath of possibleSpecPaths) {
    if (fs.existsSync(specPath)) {
      specFound = true;
      const specContent = fs.readFileSync(specPath, 'utf-8');
      const validation = validateSpec(specContent);
      if (!validation.valid) {
        specValid = false;
        specErrors = validation.errors;
        break;
      }
    }
  }

  if (!specFound) {
    log(`[SPEC] WARNING: No spec file found for ${path.basename(filePath)}`);
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
        permissionDecisionReason:
          `GOVERNANCE WARNING: No spec file found for "${path.basename(filePath)}". ` +
          `CLAUDE.md requires detailed specs before implementation. ` +
          `Create spec file with: inputs, logic, outputs, routes, test_cases.`,
      },
    };
  }

  if (!specValid) {
    logBlocked(
      `Spec incomplete for ${path.basename(filePath)}`,
      `Spec errors: ${specErrors.join(', ')}`
    );

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason:
          `BLOCKED: Spec incomplete for "${path.basename(filePath)}". ` +
          `Errors: ${specErrors.join('; ')}. ` +
          `CLAUDE.md requires complete specs before BUILD phase. ` +
          `Complete the spec and enforcer audit before implementing.`,
      },
    };
  }

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
    },
  };
}

// Register the hook
registerHook('spec-completeness-validator', 'PreToolUse', specCompletenessValidatorHook);
