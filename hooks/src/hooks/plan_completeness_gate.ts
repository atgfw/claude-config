/**
 * Plan Completeness Gate Hook
 *
 * BLOCKS plan completion when governance requirements not met:
 * 1. PROJECT-DIRECTIVE.md alignment not verified
 * 2. Node-level specs missing for code nodes
 * 3. Enforcer audit not completed
 * 4. Research source quota not met
 * 5. TBD/TODO/INCOMPLETE markers present
 *
 * Runs on Write/Edit to openspec markdown files and ExitPlanMode.
 *
 * Part of the Spinal Cord governance system.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import type { PreToolUseInput, PreToolUseOutput } from '../types.js';
import { log, logBlocked, logAllowed, getClaudeDir } from '../utils.js';
import { registerHook } from '../runner.js';

interface PlanAuditResult {
  projectRoot: string | null;
  planPath: string | null;

  // Checks
  hasProjectDirective: boolean;
  directiveAlignmentVerified: boolean;

  nodeSpecsRequired: string[];
  nodeSpecsFound: string[];
  nodeSpecsMissing: string[];

  enforcerAuditRequired: boolean;
  enforcerAuditCompleted: boolean;

  researchSourcesRequired: number;
  researchSourcesFound: number;

  incompleteMarkers: Array<{ file: string; line: number; marker: string; content: string }>;

  // Verdict
  isComplete: boolean;
  violations: string[];
}

/**
 * Find project root from a file path
 */
function findProjectRoot(filePath: string): string | null {
  const indicators = ['package.json', '.git', 'PROJECT-DIRECTIVE.md', 'CLAUDE.md', 'openspec'];

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
 * Find openspec change directory from file path
 */
function findOpenspecChangePath(filePath: string): string | null {
  // Look for openspec/changes/change-id pattern
  const match = filePath.match(/openspec[\/\\]changes[\/\\]([^\/\\]+)/);
  if (match && match[1]) {
    const projectRoot = findProjectRoot(filePath);
    if (projectRoot) {
      return path.join(projectRoot, 'openspec', 'changes', match[1]);
    }
  }
  return null;
}

/**
 * Check for incomplete markers in a file
 */
function findIncompleteMarkers(
  filePath: string
): Array<{ file: string; line: number; marker: string; content: string }> {
  const markers: Array<{ file: string; line: number; marker: string; content: string }> = [];

  if (!fs.existsSync(filePath)) return markers;

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split('\n');

    const patterns = [
      /\bTBD\b/i,
      /\bTODO\b/i,
      /\bPENDING\b/i,
      /\bINCOMPLETE\b/i,
      /\bFIXME\b/i,
      /\bPLACEHOLDER\b/i,
    ];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      for (const pattern of patterns) {
        const match = line.match(pattern);
        if (match && match[0]) {
          markers.push({
            file: filePath,
            line: i + 1,
            marker: match[0].toUpperCase(),
            content: line.trim().substring(0, 100),
          });
          break; // Only one marker per line
        }
      }
    }
  } catch {
    // Ignore read errors
  }

  return markers;
}

/**
 * Scan openspec directory for incomplete markers
 */
function scanForIncompleteMarkers(
  openspecPath: string
): Array<{ file: string; line: number; marker: string; content: string }> {
  const allMarkers: Array<{ file: string; line: number; marker: string; content: string }> = [];

  if (!fs.existsSync(openspecPath)) return allMarkers;

  function scanDir(dir: string): void {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory() && !entry.name.startsWith('.')) {
          scanDir(fullPath);
        } else if (entry.name.endsWith('.md')) {
          allMarkers.push(...findIncompleteMarkers(fullPath));
        }
      }
    } catch {
      // Ignore
    }
  }

  scanDir(openspecPath);
  return allMarkers;
}

/**
 * Check if enforcer audit has been completed
 */
function checkEnforcerAudit(openspecPath: string): boolean {
  // Look for audit completion evidence
  const auditPatterns = [
    'ENFORCER AUDIT',
    'VERDICT: APPROVED',
    '## ENFORCER AUDIT',
    'architect-reviewer',
  ];

  const files = ['design.md', 'PLAN.md', 'proposal.md'];

  for (const file of files) {
    const filePath = path.join(openspecPath, file);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');
        for (const pattern of auditPatterns) {
          if (content.includes(pattern)) {
            return true;
          }
        }
      } catch {
        // Ignore
      }
    }
  }

  return false;
}

/**
 * Check research sources in proposal
 */
function countResearchSources(openspecPath: string): number {
  const proposalPath = path.join(openspecPath, 'proposal.md');

  if (!fs.existsSync(proposalPath)) return 0;

  try {
    const content = fs.readFileSync(proposalPath, 'utf-8');

    // Count source entries (numbered list items like "| 1 |", "| 2 |", etc.)
    const sourceMatches = content.match(/\|\s*\d+\s*\|/g);
    if (sourceMatches) {
      return sourceMatches.length;
    }

    // Alternative: count YouTube, Discord, etc. mentions
    const sourceTypes = ['YouTube', 'Discord', 'n8n MCP', 'WebSearch', 'WebFetch', 'Community'];
    let count = 0;
    for (const type of sourceTypes) {
      const regex = new RegExp(type, 'gi');
      const matches = content.match(regex);
      if (matches) count += matches.length;
    }

    return Math.min(count, 50); // Cap at reasonable number
  } catch {
    return 0;
  }
}

/**
 * Check for node-level specs
 */
function checkNodeSpecs(openspecPath: string): { required: string[]; found: string[] } {
  const required: string[] = [];
  const found: string[] = [];

  // Look for code nodes mentioned in tasks.md or design.md
  const files = ['tasks.md', 'design.md', 'proposal.md'];

  for (const file of files) {
    const filePath = path.join(openspecPath, file);
    if (fs.existsSync(filePath)) {
      try {
        const content = fs.readFileSync(filePath, 'utf-8');

        // Find Code node mentions
        const codeNodeMatches = content.match(/Code\s*[Nn]ode[:\s]+([^\n,]+)/g);
        if (codeNodeMatches) {
          for (const match of codeNodeMatches) {
            const name = match.replace(/Code\s*[Nn]ode[:\s]+/, '').trim();
            if (name && !required.includes(name)) {
              required.push(name);
            }
          }
        }
      } catch {
        // Ignore
      }
    }
  }

  // Check for spec files in specs/ subdirectory
  const specsDir = path.join(openspecPath, 'specs');
  if (fs.existsSync(specsDir)) {
    try {
      const entries = fs.readdirSync(specsDir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isDirectory()) {
          const specFile = path.join(specsDir, entry.name, 'spec.md');
          if (fs.existsSync(specFile)) {
            found.push(entry.name);
          }
        }
      }
    } catch {
      // Ignore
    }
  }

  return { required, found };
}

/**
 * Check PROJECT-DIRECTIVE.md alignment
 */
function checkDirectiveAlignment(projectRoot: string, openspecPath: string): boolean {
  const directivePath = path.join(projectRoot, 'PROJECT-DIRECTIVE.md');

  if (!fs.existsSync(directivePath)) return false;

  // Look for evidence that directive was referenced in proposal
  const proposalPath = path.join(openspecPath, 'proposal.md');
  const designPath = path.join(openspecPath, 'design.md');

  const searchTerms = ['PROJECT-DIRECTIVE', 'project directive', 'Purpose', 'Success Criteria'];

  for (const file of [proposalPath, designPath]) {
    if (fs.existsSync(file)) {
      try {
        const content = fs.readFileSync(file, 'utf-8');
        for (const term of searchTerms) {
          if (content.toLowerCase().includes(term.toLowerCase())) {
            return true;
          }
        }
      } catch {
        // Ignore
      }
    }
  }

  return false;
}

/**
 * Perform full plan audit
 */
function auditPlan(filePath: string): PlanAuditResult {
  const projectRoot = findProjectRoot(filePath);
  const openspecPath = findOpenspecChangePath(filePath);

  const result: PlanAuditResult = {
    projectRoot,
    planPath: openspecPath,
    hasProjectDirective: false,
    directiveAlignmentVerified: false,
    nodeSpecsRequired: [],
    nodeSpecsFound: [],
    nodeSpecsMissing: [],
    enforcerAuditRequired: true,
    enforcerAuditCompleted: false,
    researchSourcesRequired: 25,
    researchSourcesFound: 0,
    incompleteMarkers: [],
    isComplete: false,
    violations: [],
  };

  if (!projectRoot || !openspecPath) {
    result.violations.push('Could not determine project root or openspec path');
    return result;
  }

  // Check PROJECT-DIRECTIVE.md
  result.hasProjectDirective = fs.existsSync(path.join(projectRoot, 'PROJECT-DIRECTIVE.md'));
  if (!result.hasProjectDirective) {
    result.violations.push('PROJECT-DIRECTIVE.md not found at project root');
  }

  // Check directive alignment
  result.directiveAlignmentVerified = checkDirectiveAlignment(projectRoot, openspecPath);
  if (!result.directiveAlignmentVerified && result.hasProjectDirective) {
    result.violations.push('Plan does not reference PROJECT-DIRECTIVE.md - alignment not verified');
  }

  // Check node specs
  const nodeSpecs = checkNodeSpecs(openspecPath);
  result.nodeSpecsRequired = nodeSpecs.required;
  result.nodeSpecsFound = nodeSpecs.found;
  result.nodeSpecsMissing = nodeSpecs.required.filter((r) => !nodeSpecs.found.includes(r));
  if (result.nodeSpecsMissing.length > 0) {
    result.violations.push(`Node-level specs missing for: ${result.nodeSpecsMissing.join(', ')}`);
  }

  // Check enforcer audit
  result.enforcerAuditCompleted = checkEnforcerAudit(openspecPath);
  if (!result.enforcerAuditCompleted) {
    result.violations.push('Enforcer audit not completed - use architect-reviewer subagent');
  }

  // Check research sources
  result.researchSourcesFound = countResearchSources(openspecPath);
  if (result.researchSourcesFound < result.researchSourcesRequired) {
    result.violations.push(
      `Research sources: ${result.researchSourcesFound}/${result.researchSourcesRequired} minimum`
    );
  }

  // Check for incomplete markers
  result.incompleteMarkers = scanForIncompleteMarkers(openspecPath);
  if (result.incompleteMarkers.length > 0) {
    result.violations.push(
      `${result.incompleteMarkers.length} incomplete marker(s) (TBD/TODO/PENDING) found`
    );
  }

  result.isComplete = result.violations.length === 0;

  return result;
}

/**
 * Plan Completeness Gate Hook Implementation
 */
export async function planCompletenessGateHook(input: PreToolUseInput): Promise<PreToolUseOutput> {
  const toolName = input.tool_name || '';
  const toolInput = input.tool_input || {};

  // Check if this is ExitPlanMode or writing to openspec files
  const isExitPlanMode = toolName === 'ExitPlanMode';
  const filePath = (toolInput.file_path as string) || '';
  const isOpenspecWrite = filePath.includes('openspec') && filePath.endsWith('.md');

  if (!isExitPlanMode && !isOpenspecWrite) {
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  log('Plan Completeness Gate');
  log('======================');
  log('');

  // Get file path to audit
  let auditPath = filePath;
  if (isExitPlanMode) {
    // For ExitPlanMode, we need to find the current plan being worked on
    // Check for plan file in tool input or use CWD
    auditPath = process.cwd();
    log('Auditing plan at current directory...');
  } else {
    log(`Auditing plan for: ${path.basename(filePath)}`);
  }

  // Check if this is infrastructure/meta-tooling work
  const claudeDir = getClaudeDir();
  const cwd = process.cwd();

  // If working in the .claude directory itself, this is infrastructure work
  if (cwd === claudeDir) {
    log('Infrastructure work detected: cwd is ~/.claude - bypassing governance requirements');
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  // Check for bypass flag
  const bypassPath = path.join(claudeDir, '.self-audit-bypass');
  if (fs.existsSync(bypassPath)) {
    log('Infrastructure bypass flag detected at ~/.claude/.self-audit-bypass');
    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'allow',
      },
    };
  }

  // Perform audit
  const audit = auditPlan(auditPath);

  log(`Project Root: ${audit.projectRoot || 'UNKNOWN'}`);
  log(`Plan Path: ${audit.planPath || 'UNKNOWN'}`);
  log('');

  // Report findings
  log('GOVERNANCE CHECKLIST:');
  log(`  [${audit.hasProjectDirective ? 'x' : ' '}] PROJECT-DIRECTIVE.md exists`);
  log(`  [${audit.directiveAlignmentVerified ? 'x' : ' '}] Directive alignment verified in plan`);
  log(`  [${audit.enforcerAuditCompleted ? 'x' : ' '}] Enforcer audit completed`);
  log(
    `  [${audit.researchSourcesFound >= audit.researchSourcesRequired ? 'x' : ' '}] Research sources: ${audit.researchSourcesFound}/${audit.researchSourcesRequired}`
  );
  log(`  [${audit.nodeSpecsMissing.length === 0 ? 'x' : ' '}] Node-level specs complete`);
  log(`  [${audit.incompleteMarkers.length === 0 ? 'x' : ' '}] No incomplete markers`);
  log('');

  if (!audit.isComplete) {
    logBlocked(
      `Plan incomplete - ${audit.violations.length} issue(s)`,
      'Plans must meet all governance requirements before approval'
    );
    log('');
    log('VIOLATIONS:');
    for (const violation of audit.violations) {
      log(`  - ${violation}`);
    }
    log('');

    if (audit.incompleteMarkers.length > 0) {
      log('INCOMPLETE MARKERS:');
      for (const marker of audit.incompleteMarkers.slice(0, 5)) {
        const relPath = audit.projectRoot
          ? path.relative(audit.projectRoot, marker.file)
          : marker.file;
        log(`  ${relPath}:${marker.line} [${marker.marker}]`);
        log(`    ${marker.content}`);
      }
      if (audit.incompleteMarkers.length > 5) {
        log(`  ... and ${audit.incompleteMarkers.length - 5} more`);
      }
      log('');
    }

    if (audit.nodeSpecsMissing.length > 0) {
      log('MISSING NODE SPECS:');
      for (const node of audit.nodeSpecsMissing) {
        log(`  - ${node}`);
      }
      log('');
      log('  Per governance rules, every Code node needs:');
      log('    inputs: exhaustive list with types/sources');
      log('    logic: step-by-step, no ambiguity');
      log('    outputs: exhaustive list with schemas');
      log('    routes: all possible paths');
      log('    test_cases: comprehensive coverage');
      log('');
    }

    log('REQUIRED ACTIONS:');
    log('  1. Address all violations above');
    if (!audit.enforcerAuditCompleted) {
      log('  2. Request enforcer audit via architect-reviewer subagent');
    }
    if (!audit.directiveAlignmentVerified) {
      log('  3. Verify plan serves PROJECT-DIRECTIVE.md purpose');
    }
    log('');

    return {
      hookSpecificOutput: {
        hookEventName: 'PreToolUse',
        permissionDecision: 'deny',
        permissionDecisionReason: `Plan incomplete: ${audit.violations[0]}`,
      },
    };
  }

  logAllowed('Plan meets all governance requirements');
  return {
    hookSpecificOutput: {
      hookEventName: 'PreToolUse',
      permissionDecision: 'allow',
    },
  };
}

// Register the hook
registerHook('plan-completeness-gate', 'PreToolUse', planCompletenessGateHook);

export default planCompletenessGateHook;
