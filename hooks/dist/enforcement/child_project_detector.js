/**
 * Child Project Override Detection
 *
 * Detects and prevents local overrides in child projects.
 * Child projects MUST NOT contain project-specific configurations
 * that override or conflict with the global .claude project.
 *
 * Prohibited in child projects:
 * - .mcp.json or MCP server configurations
 * - Custom hooks or settings.json
 * - .env files with API credentials
 * - Tool preference overrides
 * - Any configuration that shadows global behavior
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getClaudeDir, log } from '../utils.js';
import { recordCorrection } from '../ledger/correction_ledger.js';
/**
 * Files that should NOT exist in child projects
 */
const PROHIBITED_FILES = ['.mcp.json', '.claude/settings.json', '.claude/hooks', '.claude/.env'];
/**
 * Patterns that indicate override attempts
 */
const PROHIBITED_PATTERNS = [
    /\.claude\/hooks\/.*\.ts$/,
    /\.claude\/hooks\/.*\.js$/,
    /\.claude\/hooks\/.*\.sh$/,
    /\.claude\/settings\.json$/,
    /\.claude\/\.env$/,
];
/**
 * Scan a directory for prohibited override files
 */
export function scanForOverrides(projectDir) {
    const violations = [];
    const claudeDir = getClaudeDir();
    // Don't scan the global .claude directory
    if (projectDir === claudeDir || projectDir.startsWith(claudeDir)) {
        return violations;
    }
    // Check for prohibited files
    for (const file of PROHIBITED_FILES) {
        const filePath = path.join(projectDir, file);
        if (fs.existsSync(filePath)) {
            violations.push({
                type: 'file',
                path: filePath,
                description: `Prohibited override file: ${file}`,
                severity: 'error',
            });
        }
    }
    // Check for .claude directory with custom content
    const localClaudeDir = path.join(projectDir, '.claude');
    if (fs.existsSync(localClaudeDir)) {
        const localFiles = fs.readdirSync(localClaudeDir, { withFileTypes: true });
        for (const entry of localFiles) {
            const fullPath = path.join(localClaudeDir, entry.name);
            // Check against prohibited patterns
            for (const pattern of PROHIBITED_PATTERNS) {
                if (pattern.test(fullPath)) {
                    violations.push({
                        type: 'pattern',
                        path: fullPath,
                        description: `Prohibited pattern match: ${pattern.toString()}`,
                        severity: 'error',
                    });
                }
            }
            // Check for hooks directory
            if (entry.isDirectory() && entry.name === 'hooks') {
                const hookFiles = fs.readdirSync(fullPath);
                if (hookFiles.length > 0) {
                    violations.push({
                        type: 'file',
                        path: fullPath,
                        description: 'Local hooks directory - hooks must be global only',
                        severity: 'error',
                    });
                }
            }
        }
    }
    // Check for .mcp.json that differs from template
    const mcpJsonPath = path.join(projectDir, '.mcp.json');
    if (fs.existsSync(mcpJsonPath)) {
        // This is only a violation if it contains custom servers
        // that aren't in the global config
        try {
            const content = JSON.parse(fs.readFileSync(mcpJsonPath, 'utf-8'));
            const mcpServers = content['mcpServers'];
            if (mcpServers && Object.keys(mcpServers).length > 0) {
                violations.push({
                    type: 'file',
                    path: mcpJsonPath,
                    description: 'Local MCP configuration - should use global config',
                    severity: 'warning',
                });
            }
        }
        catch {
            // Invalid JSON is fine to flag
            violations.push({
                type: 'file',
                path: mcpJsonPath,
                description: 'Invalid .mcp.json file',
                severity: 'warning',
            });
        }
    }
    return violations;
}
/**
 * Check the current working directory for violations
 */
export function checkCurrentProject() {
    return scanForOverrides(process.cwd());
}
/**
 * Report violations and optionally record to correction ledger
 */
export function reportViolations(violations, recordToLedger = false) {
    if (violations.length === 0) {
        return '[OK] No child project override violations detected';
    }
    let report = 'CHILD PROJECT OVERRIDE VIOLATIONS\n';
    report += '='.repeat(50) + '\n\n';
    const errors = violations.filter((v) => v.severity === 'error');
    const warnings = violations.filter((v) => v.severity === 'warning');
    if (errors.length > 0) {
        report += `ERRORS (${errors.length}):\n`;
        for (const v of errors) {
            report += `  [ERROR] ${v.description}\n`;
            report += `          ${v.path}\n`;
        }
        report += '\n';
    }
    if (warnings.length > 0) {
        report += `WARNINGS (${warnings.length}):\n`;
        for (const v of warnings) {
            report += `  [WARN] ${v.description}\n`;
            report += `         ${v.path}\n`;
        }
        report += '\n';
    }
    report += 'RESOLUTION:\n';
    report += '  1. Remove the prohibited files from the child project\n';
    report += '  2. Use global configuration from ~/.claude/\n';
    report += '  3. Child projects inherit, never override\n';
    // Record to correction ledger if requested
    if (recordToLedger && errors.length > 0) {
        for (const v of errors) {
            recordCorrection(`Child project override detected: ${v.description}`, 'Local configuration created in child project instead of using global', 'pre-task-start hook should detect and block child project overrides');
        }
    }
    return report;
}
/**
 * Enforce no overrides - returns true if clean, false if violations found
 */
export function enforceNoOverrides() {
    const violations = checkCurrentProject();
    if (violations.length === 0) {
        log('[OK] Child project compliance verified');
        return true;
    }
    const errors = violations.filter((v) => v.severity === 'error');
    log(reportViolations(violations));
    if (errors.length > 0) {
        log('\n[BLOCKED] Child project contains prohibited overrides');
        log('Remove the files listed above and use global configuration.');
        return false;
    }
    // Only warnings - allow but log
    log('\n[WARN] Child project has configuration warnings');
    return true;
}
/**
 * Auto-cleanup option - move violations to old/
 * USE WITH CAUTION - this modifies the filesystem
 */
export function cleanupViolations(projectDir) {
    const violations = scanForOverrides(projectDir);
    const claudeDir = getClaudeDir();
    const oldDir = path.join(claudeDir, 'old', 'child-project-cleanups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const result = {
        cleaned: [],
        failed: [],
    };
    for (const v of violations) {
        if (v.severity !== 'error')
            continue;
        try {
            const archivePath = path.join(oldDir, timestamp, path.relative(projectDir, v.path));
            const archiveDir = path.dirname(archivePath);
            fs.mkdirSync(archiveDir, { recursive: true });
            fs.renameSync(v.path, archivePath);
            result.cleaned.push(v.path);
            log(`[CLEANED] Moved ${v.path} to ${archivePath}`);
        }
        catch (error) {
            result.failed.push(v.path);
            log(`[FAILED] Could not move ${v.path}: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    return result;
}
export default {
    scanForOverrides,
    checkCurrentProject,
    reportViolations,
    enforceNoOverrides,
    cleanupViolations,
};
//# sourceMappingURL=child_project_detector.js.map