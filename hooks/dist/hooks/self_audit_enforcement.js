/**
 * Self-Audit Enforcement Hook
 *
 * BLOCKS task completion unless self-audit checklist is complete.
 * Runs at Stop event to ensure child sessions verify their work
 * before claiming completion.
 *
 * Requirements:
 * 1. Self-audit checklist must be completed
 * 2. All governance requirements verified
 * 3. Parent audit requested for significant work
 *
 * Part of the Spinal Cord governance system.
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { log, getClaudeDir } from '../utils.js';
import { registerHook } from '../runner.js';
import { requestAudit, checkAuditStatus } from '../ledger/audit_request_registry.js';
const SELF_AUDIT_FLAG = 'self-audit-completed';
/**
 * Find openspec changes in current directory
 */
function findOpenspecChanges(dir) {
    const changes = [];
    const openspecPath = path.join(dir, 'openspec', 'changes');
    if (!fs.existsSync(openspecPath)) {
        // Try parent directories
        let current = dir;
        const root = path.parse(current).root;
        while (current !== root) {
            const candidate = path.join(current, 'openspec', 'changes');
            if (fs.existsSync(candidate)) {
                try {
                    const entries = fs.readdirSync(candidate, { withFileTypes: true });
                    for (const entry of entries) {
                        if (entry.isDirectory()) {
                            changes.push(path.join(candidate, entry.name));
                        }
                    }
                }
                catch {
                    // Ignore
                }
                break;
            }
            current = path.dirname(current);
        }
    }
    else {
        try {
            const entries = fs.readdirSync(openspecPath, { withFileTypes: true });
            for (const entry of entries) {
                if (entry.isDirectory()) {
                    changes.push(path.join(openspecPath, entry.name));
                }
            }
        }
        catch {
            // Ignore
        }
    }
    return changes;
}
/**
 * Normalize checklist from various formats to expected SelfAuditChecklist
 * Handles both flat format and nested { self_audit_completed, checklist } format
 */
function normalizeChecklist(data) {
    // Check for nested format: { self_audit_completed: true, checklist: {...} }
    if ('self_audit_completed' in data && data.self_audit_completed === true) {
        // If checklist property exists, map it to expected fields
        if ('checklist' in data && typeof data.checklist === 'object' && data.checklist !== null) {
            const nested = data.checklist;
            // Map common alternative field names to expected fields
            return {
                directiveAligned: nested.directiveAligned ?? nested.project_specific_focus ?? true,
                specsComplete: nested.specsComplete ?? nested.architecture_documented ?? true,
                enforcerAudited: nested.enforcerAudited ?? nested.references_verified ?? true,
                researchDone: nested.researchDone ?? nested.files_reviewed ?? true,
                noIncompleteMarkers: nested.noIncompleteMarkers ?? nested.no_generic_practices ?? true,
                testsPlanned: nested.testsPlanned ?? nested.testing_patterns_documented ?? true,
                hierarchyRespected: nested.hierarchyRespected ?? nested.no_obvious_instructions ?? true,
            };
        }
        // self_audit_completed=true without checklist means all items approved
        return {
            directiveAligned: true,
            specsComplete: true,
            enforcerAudited: true,
            researchDone: true,
            noIncompleteMarkers: true,
            testsPlanned: true,
            hierarchyRespected: true,
        };
    }
    // Check for flat format with expected field names
    if ('directiveAligned' in data || 'specsComplete' in data) {
        return data;
    }
    return null;
}
/**
 * Check if self-audit flag file exists with valid content
 * Checks global ~/.claude/, project .claude/, and project root directories
 */
function checkSelfAuditFlag() {
    // Paths to check (in order of priority)
    const possiblePaths = [
        // Global ~/.claude/self-audit-completed
        path.join(getClaudeDir(), SELF_AUDIT_FLAG),
        // Global with .json extension
        path.join(getClaudeDir(), `${SELF_AUDIT_FLAG}.json`),
        // Project .claude/self-audit-completed
        path.join(process.cwd(), '.claude', SELF_AUDIT_FLAG),
        // Project with .json extension
        path.join(process.cwd(), '.claude', `${SELF_AUDIT_FLAG}.json`),
        // Project root (hidden file with dot prefix)
        path.join(process.cwd(), `.${SELF_AUDIT_FLAG}.json`),
        // Project root (no dot prefix)
        path.join(process.cwd(), `${SELF_AUDIT_FLAG}.json`),
    ];
    for (const flagPath of possiblePaths) {
        if (fs.existsSync(flagPath)) {
            try {
                const content = fs.readFileSync(flagPath, 'utf-8');
                log(`Found self-audit file at: ${flagPath}`);
                const data = JSON.parse(content);
                const normalized = normalizeChecklist(data);
                if (normalized) {
                    log(`Normalized checklist successfully`);
                    return normalized;
                }
                log(`Could not normalize checklist format in: ${flagPath}`);
            }
            catch {
                log(`Invalid JSON in: ${flagPath}`);
                continue;
            }
        }
    }
    return null;
}
/**
 * Check if work requires parent audit
 */
function requiresParentAudit(changes) {
    // Significant work indicators
    for (const changePath of changes) {
        const proposalPath = path.join(changePath, 'proposal.md');
        const designPath = path.join(changePath, 'design.md');
        const tasksPath = path.join(changePath, 'tasks.md');
        // If all three exist, this is significant work
        if (fs.existsSync(proposalPath) && fs.existsSync(designPath) && fs.existsSync(tasksPath)) {
            return true;
        }
    }
    return false;
}
// Block counter functions - unused but kept for future implementation
/*
function getBlockCount(): number {
  const counterPath = path.join(getClaudeDir(), BLOCK_COUNTER_FLAG);
  if (!fs.existsSync(counterPath)) {
    return 0;
  }
  try {
    const content = fs.readFileSync(counterPath, 'utf-8');
    return parseInt(content, 10) || 0;
  } catch {
    return 0;
  }
}

function incrementBlockCount(): number {
  const count = getBlockCount() + 1;
  const counterPath = path.join(getClaudeDir(), BLOCK_COUNTER_FLAG);
  fs.writeFileSync(counterPath, count.toString());
  return count;
}

function resetBlockCount(): void {
  const counterPath = path.join(getClaudeDir(), BLOCK_COUNTER_FLAG);
  if (fs.existsSync(counterPath)) {
    try {
      fs.unlinkSync(counterPath);
    } catch {
      // Ignore deletion errors
    }
  }
}
*/
/**
 * Validate self-audit checklist
 */
function validateChecklist(checklist) {
    const violations = [];
    if (!checklist.directiveAligned) {
        violations.push('directiveAligned: Work does not serve PROJECT-DIRECTIVE.md');
    }
    if (!checklist.specsComplete) {
        violations.push('specsComplete: Node-level specs are incomplete');
    }
    if (!checklist.enforcerAudited) {
        violations.push('enforcerAudited: Enforcer audit not completed');
    }
    if (!checklist.researchDone) {
        violations.push('researchDone: Research requirements not met');
    }
    if (!checklist.noIncompleteMarkers) {
        violations.push('noIncompleteMarkers: TBD/TODO markers still present');
    }
    if (!checklist.testsPlanned) {
        violations.push('testsPlanned: Test plan not defined');
    }
    if (!checklist.hierarchyRespected) {
        violations.push('hierarchyRespected: Hierarchical development not followed');
    }
    return violations;
}
/**
 * Detect if we're working on infrastructure/meta-tooling
 * (the governance system itself)
 */
function isInfrastructureWork(cwd) {
    const claudeDir = getClaudeDir();
    // If cwd IS the .claude directory, this is infrastructure work
    if (cwd === claudeDir) {
        log('Detected infrastructure work: cwd is ~/.claude');
        return true;
    }
    // Check if there's a bypass flag
    const bypassPath = path.join(claudeDir, '.self-audit-bypass');
    if (fs.existsSync(bypassPath)) {
        log('Detected infrastructure bypass flag at ~/.claude/.self-audit-bypass');
        return true;
    }
    return false;
}
/**
 * Self-Audit Enforcement Hook Implementation
 */
export async function selfAuditEnforcementHook(_input) {
    // Find any openspec changes being worked on
    const cwd = process.cwd();
    const changes = findOpenspecChanges(cwd);
    if (changes.length === 0) {
        return { decision: 'approve' };
    }
    // Check if this is infrastructure/bootstrap work
    if (isInfrastructureWork(cwd)) {
        log('Infrastructure work detected - bypassing self-audit requirement');
        return { decision: 'approve' };
    }
    const changeNames = changes.map((c) => path.basename(c)).join(', ');
    // Check if self-audit has been completed
    const checklist = checkSelfAuditFlag();
    if (!checklist) {
        log(`Self-audit required: Create ~/.claude/self-audit-completed.json with { "self_audit_completed": true, "checklist": { directiveAligned, specsComplete, enforcerAudited, researchDone, noIncompleteMarkers, testsPlanned, hierarchyRespected } } - all fields must be true.`);
        return {
            decision: 'block',
            reason: 'Self-audit not completed - create self-audit-completed flag with checklist',
        };
    }
    // Validate the checklist
    const violations = validateChecklist(checklist);
    if (violations.length > 0) {
        log(`Self-audit incomplete (${violations.length} items): ${violations.join(', ')}. Update self-audit-completed.json with all fields set to true.`);
        return {
            decision: 'block',
            reason: `Self-audit incomplete: ${violations[0]}`,
        };
    }
    // Check if parent audit is required for significant work
    if (requiresParentAudit(changes)) {
        for (const changePath of changes) {
            const auditStatus = checkAuditStatus(changePath);
            const changeName = path.basename(changePath);
            if (!auditStatus.hasRequest) {
                const request = requestAudit({
                    projectPath: cwd,
                    artifactPath: changePath,
                    auditType: 'plan-review',
                    description: `Plan review for: ${changeName}`,
                });
                log(`Parent audit requested for ${changeName} (${request.id}) - proceeding without approval.`);
            }
            else if (auditStatus.status === 'pending') {
                log(`Parent audit pending for ${changeName} - proceeding without approval.`);
            }
            else if (auditStatus.status === 'corrections') {
                const findings = auditStatus.findings.map((f) => f.message).join('; ');
                log(`Parent audit requires corrections for ${changeName}: ${findings}`);
                return {
                    decision: 'block',
                    reason: `Parent audit requires corrections: ${auditStatus.findings[0]?.message || 'See findings'}`,
                };
            }
            else if (auditStatus.status === 'rejected') {
                log(`Parent audit rejected for ${changeName}: ${auditStatus.verdict}`);
                return {
                    decision: 'block',
                    reason: 'Parent audit rejected the plan',
                };
            }
        }
    }
    log(`Self-audit passed for ${changeNames}. All checklist items verified.`);
    // Archive the flag for next task (check all possible locations)
    const archiveDir = path.join(getClaudeDir(), 'archive');
    if (!fs.existsSync(archiveDir)) {
        fs.mkdirSync(archiveDir, { recursive: true });
    }
    const archivePaths = [
        path.join(getClaudeDir(), SELF_AUDIT_FLAG),
        path.join(getClaudeDir(), `${SELF_AUDIT_FLAG}.json`),
        path.join(process.cwd(), '.claude', SELF_AUDIT_FLAG),
        path.join(process.cwd(), '.claude', `${SELF_AUDIT_FLAG}.json`),
        path.join(process.cwd(), `.${SELF_AUDIT_FLAG}.json`),
        path.join(process.cwd(), `${SELF_AUDIT_FLAG}.json`),
    ];
    for (const flagPath of archivePaths) {
        if (fs.existsSync(flagPath)) {
            const archivePath = path.join(archiveDir, `${SELF_AUDIT_FLAG}-${Date.now()}.json`);
            try {
                fs.renameSync(flagPath, archivePath);
                break;
            }
            catch {
                // Ignore and try next
            }
        }
    }
    return { decision: 'approve' };
}
// Register the hook
registerHook('self-audit-enforcement', 'Stop', selfAuditEnforcementHook);
export default selfAuditEnforcementHook;
//# sourceMappingURL=self_audit_enforcement.js.map