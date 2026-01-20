/**
 * Pre-Build Gate Hook
 *
 * BLOCKS implementation code writes when:
 * 1. PROJECT-DIRECTIVE.md is missing from project root
 * 2. Enforcer audit checkboxes in design.md are still PENDING
 *
 * This hook enforces the governance rule that specs must be fully audited
 * before proceeding to BUILD phase.
 *
 * Part of the Spinal Cord - correction ledger entry i4f37h9g8j0k1234
 */

import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
import { log, logBlocked, logAllowed } from '../utils.js';
import { registerHook } from '../runner.js';
import * as fs from 'node:fs';
import * as path from 'node:path';

/**
 * Patterns that indicate spec/design files (allowed without gate check)
 */
const SPEC_DESIGN_PATTERNS = [
  /[/\\]openspec[/\\]/i, // openspec/ directory
  /[/\\]specs[/\\]/i, // specs/ directory
  /[/\\]tests[/\\]fixtures[/\\]/i, // test fixtures
  /[/\\]docs[/\\]/i, // documentation
  /\.md$/i, // Markdown files
  /PROJECT-DIRECTIVE\.md$/i, // The directive itself
  /design\.md$/i, // Design specs
  /spec\.md$/i, // Spec files
  /proposal\.md$/i, // Proposal files
  /tasks\.md$/i, // Task tracking
];

/**
 * Patterns that indicate implementation code (requires gate check)
 */
const IMPLEMENTATION_PATTERNS = [
  /[/\\]src[/\\]/i, // src/ directory
  /[/\\]lib[/\\]/i, // lib/ directory
  /[/\\]app[/\\]/i, // app/ directory
  /[/\\]components[/\\]/i, // components/ directory
  /[/\\]services[/\\]/i, // services/ directory
  /[/\\]temp[/\\]code-nodes[/\\]/i, // code node development
  /\.(ts|js|tsx|jsx|py|go|rs)$/i, // Code file extensions
];

/**
 * Files/directories to exclude from implementation check
 */
const EXCLUDE_FROM_IMPLEMENTATION = [
  /[/\\]node_modules[/\\]/i,
  /[/\\]dist[/\\]/i,
  /[/\\]\.claude[/\\]/i, // Global hooks directory itself
  /[/\\]tests[/\\]/i, // Test files are OK
  /\.test\.(ts|js)$/i, // Test files
  /\.spec\.(ts|js)$/i, // Spec test files
  /vitest\.config/i, // Config files
  /package\.json$/i,
  /tsconfig\.json$/i,
];

interface GateCheckResult {
  passed: boolean;
  projectRoot: string | null;
  hasProjectDirective: boolean;
  pendingAudits: PendingAudit[];
  incompleteSpecs: IncompleteSpec[];
  unverifiedCriteria: string[];
  errors: string[];
}

interface PendingAudit {
  file: string;
  line: number;
  content: string;
}

interface IncompleteSpec {
  file: string;
  line: number;
  marker: 'TBD' | 'TODO' | 'PENDING' | 'INCOMPLETE';
  content: string;
}

/**
 * Check if file path matches any pattern in array
 */
function matchesAny(filePath: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(filePath));
}

/**
 * Determine if this is implementation code that requires gate check
 */
function isImplementationCode(filePath: string): boolean {
  // Normalize path separators
  const normalized = filePath.replace(/\\/g, '/');

  // First check exclusions
  if (matchesAny(normalized, EXCLUDE_FROM_IMPLEMENTATION)) {
    return false;
  }

  // Check if it's a spec/design file
  if (matchesAny(normalized, SPEC_DESIGN_PATTERNS)) {
    return false;
  }

  // Check if it matches implementation patterns
  return matchesAny(normalized, IMPLEMENTATION_PATTERNS);
}

/**
 * Find the project root from a file path
 * Looks for common project root indicators
 */
function findProjectRoot(filePath: string): string | null {
  const indicators = [
    'package.json',
    '.git',
    'CLAUDE.md',
    'PROJECT-DIRECTIVE.md',
    'pyproject.toml',
    'Cargo.toml',
    'go.mod',
  ];

  let current = path.dirname(filePath);
  const root = path.parse(current).root;

  while (current !== root) {
    for (const indicator of indicators) {
      if (fs.existsSync(path.join(current, indicator))) {
        return current;
      }
    }
    current = path.dirname(current);
  }

  return null;
}

/**
 * Check if PROJECT-DIRECTIVE.md exists at project root
 */
function hasProjectDirective(projectRoot: string): boolean {
  const directivePath = path.join(projectRoot, 'PROJECT-DIRECTIVE.md');
  return fs.existsSync(directivePath);
}

/**
 * Scan openspec directories for PENDING enforcer audit checkboxes
 */
function findPendingAudits(projectRoot: string): PendingAudit[] {
  const pending: PendingAudit[] = [];

  // Look in openspec directory
  const openspecDir = path.join(projectRoot, 'openspec');
  if (!fs.existsSync(openspecDir)) {
    return pending;
  }

  // Find all design.md files recursively
  const designFiles = findFilesRecursive(openspecDir, /design\.md$/i);

  for (const designFile of designFiles) {
    try {
      const content = fs.readFileSync(designFile, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;
        // Look for unchecked boxes with PENDING
        if (line.includes('- [ ]') && line.toLowerCase().includes('pending')) {
          pending.push({
            file: designFile,
            line: i + 1,
            content: line.trim(),
          });
        }
      }
    } catch (e) {
      // Skip files that can't be read
    }
  }

  return pending;
}

/**
 * Scan spec files for TBD, TODO, INCOMPLETE markers indicating unfinished specs
 * These markers indicate the spec is not ready for implementation
 */
function findIncompleteSpecs(projectRoot: string): IncompleteSpec[] {
  const incomplete: IncompleteSpec[] = [];

  // Look in openspec directory
  const openspecDir = path.join(projectRoot, 'openspec');
  if (!fs.existsSync(openspecDir)) {
    return incomplete;
  }

  // Find all design.md and spec.md files recursively
  const specFiles = [
    ...findFilesRecursive(openspecDir, /design\.md$/i),
    ...findFilesRecursive(openspecDir, /spec\.md$/i),
  ];

  // Patterns that indicate incomplete specifications
  const incompletePatterns = [
    { regex: /\bTBD\b/i, marker: 'TBD' as const },
    { regex: /\bTODO\b/i, marker: 'TODO' as const },
    { regex: /\bPENDING\b/i, marker: 'PENDING' as const },
    { regex: /\bINCOMPLETE\b/i, marker: 'INCOMPLETE' as const },
  ];

  for (const specFile of specFiles) {
    try {
      const content = fs.readFileSync(specFile, 'utf-8');
      const lines = content.split('\n');

      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line) continue;

        // Skip lines that are part of code blocks
        if (line.trim().startsWith('```')) continue;

        for (const { regex, marker } of incompletePatterns) {
          if (regex.test(line)) {
            // Skip if it's in a table header or just describing what TBD means
            if (line.includes('| Status |') || line.includes('marker')) continue;

            incomplete.push({
              file: specFile,
              line: i + 1,
              marker,
              content: line.trim().substring(0, 100),
            });
            break; // Only count once per line
          }
        }
      }
    } catch (e) {
      // Skip files that can't be read
    }
  }

  return incomplete;
}

/**
 * Parse PROJECT-DIRECTIVE.md and find unverified success criteria
 * Success criteria should have checkbox format: - [x] or - [ ]
 */
function findUnverifiedCriteria(projectRoot: string): string[] {
  const unverified: string[] = [];
  const directivePath = path.join(projectRoot, 'PROJECT-DIRECTIVE.md');

  if (!fs.existsSync(directivePath)) {
    return unverified;
  }

  try {
    const content = fs.readFileSync(directivePath, 'utf-8');
    const lines = content.split('\n');

    let inSuccessCriteria = false;

    for (const line of lines) {
      // Detect success criteria section
      if (/^##\s*Success Criteria/i.test(line)) {
        inSuccessCriteria = true;
        continue;
      }

      // End of section
      if (inSuccessCriteria && /^##\s/.test(line)) {
        inSuccessCriteria = false;
        continue;
      }

      // Check for unchecked criteria
      if (inSuccessCriteria && line.includes('- [ ]')) {
        const criterion = line.replace(/^[\s-]*\[\s*\]/, '').trim();
        if (criterion) {
          unverified.push(criterion);
        }
      }
    }
  } catch (e) {
    // Skip if file can't be read
  }

  return unverified;
}

/**
 * Recursively find files matching a pattern
 */
function findFilesRecursive(dir: string, pattern: RegExp): string[] {
  const results: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Skip node_modules and hidden directories
        if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          results.push(...findFilesRecursive(fullPath, pattern));
        }
      } else if (pattern.test(entry.name)) {
        results.push(fullPath);
      }
    }
  } catch (e) {
    // Skip directories that can't be read
  }

  return results;
}

/**
 * Perform the full gate check
 */
function performGateCheck(filePath: string): GateCheckResult {
  const result: GateCheckResult = {
    passed: true,
    projectRoot: null,
    hasProjectDirective: false,
    pendingAudits: [],
    incompleteSpecs: [],
    unverifiedCriteria: [],
    errors: [],
  };

  // Find project root
  result.projectRoot = findProjectRoot(filePath);
  if (!result.projectRoot) {
    result.errors.push('Could not determine project root');
    result.passed = false;
    return result;
  }

  // Check for PROJECT-DIRECTIVE.md
  result.hasProjectDirective = hasProjectDirective(result.projectRoot);
  if (!result.hasProjectDirective) {
    result.errors.push(`PROJECT-DIRECTIVE.md not found at: ${result.projectRoot}`);
    result.passed = false;
  }

  // Check for pending enforcer audits
  result.pendingAudits = findPendingAudits(result.projectRoot);
  if (result.pendingAudits.length > 0) {
    result.errors.push(`Found ${result.pendingAudits.length} PENDING enforcer audit(s)`);
    result.passed = false;
  }

  // Check for incomplete specs (TBD, TODO, etc.)
  result.incompleteSpecs = findIncompleteSpecs(result.projectRoot);
  if (result.incompleteSpecs.length > 0) {
    result.errors.push(
      `Found ${result.incompleteSpecs.length} incomplete spec marker(s) (TBD/TODO/PENDING)`
    );
    result.passed = false;
  }

  // Check for unverified success criteria (warning only, not blocking)
  result.unverifiedCriteria = findUnverifiedCriteria(result.projectRoot);
  // Note: Unverified criteria is a warning, blocking happens at task completion

  return result;
}

/**
 * Extract file path from Write/Edit tool input
 */
function extractFilePath(input: PreToolUseInput): string | null {
  const toolInput = input.tool_input;
  if (!toolInput || typeof toolInput !== 'object') return null;

  const filePath = toolInput['file_path'];
  return typeof filePath === 'string' ? filePath : null;
}

/**
 * Pre-Build Gate Hook Implementation
 */
export async function preBuildGateHook(input: PreToolUseInput): Promise<PreToolUseOutput> {
  const filePath = extractFilePath(input);

  if (!filePath) {
    // No file path - allow (other hooks will handle)
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  log(`[BUILD GATE] Checking: ${filePath}`);

  // Check if this is implementation code
  if (!isImplementationCode(filePath)) {
    logAllowed('Not implementation code - gate check skipped');
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  log('[BUILD GATE] Implementation code detected - performing gate check');

  // Perform gate check
  const gateResult = performGateCheck(filePath);

  if (gateResult.passed) {
    logAllowed('Gate check passed - BUILD phase allowed');
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  // Gate check failed - block
  log('');
  log('[BUILD GATE BLOCKED]');
  log('');

  if (!gateResult.hasProjectDirective && gateResult.projectRoot) {
    log('MISSING: PROJECT-DIRECTIVE.md');
    log(`  Required at: ${gateResult.projectRoot}/PROJECT-DIRECTIVE.md`);
    log('');
    log('  Create this file with:');
    log('    # PROJECT DIRECTIVE');
    log('    ## Purpose (Plain English)');
    log('    ## Success Criteria (Measurable)');
    log('    ## Constraints (Non-Negotiable)');
    log('    ## Out of Scope');
    log('');
  }

  if (gateResult.pendingAudits.length > 0) {
    log(`PENDING ENFORCER AUDITS: ${gateResult.pendingAudits.length}`);
    log('');
    for (const audit of gateResult.pendingAudits.slice(0, 5)) {
      const relPath = gateResult.projectRoot
        ? path.relative(gateResult.projectRoot, audit.file)
        : audit.file;
      log(`  ${relPath}:${audit.line}`);
      log(`    ${audit.content}`);
    }
    if (gateResult.pendingAudits.length > 5) {
      log(`  ... and ${gateResult.pendingAudits.length - 5} more`);
    }
    log('');
    log('  Complete enforcer audits using architect-reviewer subagent');
    log('  before proceeding to BUILD phase.');
  }

  if (gateResult.incompleteSpecs.length > 0) {
    log('');
    log(`INCOMPLETE SPEC MARKERS: ${gateResult.incompleteSpecs.length}`);
    log('');

    // Group by marker type
    const byMarker = new Map<string, IncompleteSpec[]>();
    for (const spec of gateResult.incompleteSpecs) {
      const existing = byMarker.get(spec.marker) || [];
      existing.push(spec);
      byMarker.set(spec.marker, existing);
    }

    for (const [marker, specs] of byMarker) {
      log(`  ${marker}: ${specs.length} occurrence(s)`);
      for (const spec of specs.slice(0, 3)) {
        const relPath = gateResult.projectRoot
          ? path.relative(gateResult.projectRoot, spec.file)
          : spec.file;
        log(`    ${relPath}:${spec.line}`);
        log(`      ${spec.content}`);
      }
      if (specs.length > 3) {
        log(`    ... and ${specs.length - 3} more`);
      }
    }
    log('');
    log('  Specs must be COMPLETE before implementation.');
    log('  Replace all TBD/TODO/PENDING/INCOMPLETE markers with actual content.');
  }

  if (gateResult.unverifiedCriteria.length > 0) {
    log('');
    log(`WARNING: UNVERIFIED SUCCESS CRITERIA: ${gateResult.unverifiedCriteria.length}`);
    log('');
    for (const criterion of gateResult.unverifiedCriteria.slice(0, 5)) {
      log(`  - [ ] ${criterion.substring(0, 80)}`);
    }
    if (gateResult.unverifiedCriteria.length > 5) {
      log(`  ... and ${gateResult.unverifiedCriteria.length - 5} more`);
    }
    log('');
    log('  These must be verified before task completion.');
  }

  logBlocked(
    'BUILD phase blocked - governance pre-requisites not met',
    'Before ANY spec is approved for blueprinting, a 3rd-party enforcer audit is required.'
  );

  const reasonParts: string[] = [];
  if (!gateResult.hasProjectDirective) {
    reasonParts.push('PROJECT-DIRECTIVE.md missing');
  }
  if (gateResult.pendingAudits.length > 0) {
    reasonParts.push(`${gateResult.pendingAudits.length} enforcer audit(s) PENDING`);
  }
  if (gateResult.incompleteSpecs.length > 0) {
    reasonParts.push(`${gateResult.incompleteSpecs.length} incomplete spec marker(s)`);
  }

  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'deny',
      permissionDecisionReason: `BUILD GATE BLOCKED: ${reasonParts.join(', ')}. Complete governance pre-requisites before implementing.`,
    },
  };
}

// Register the hook
registerHook('pre-build-gate', 'PreToolUse', preBuildGateHook);

export default preBuildGateHook;
