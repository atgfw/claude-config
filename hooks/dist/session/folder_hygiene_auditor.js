/**
 * Folder Hygiene Auditor
 *
 * Scans project root for organizational issues on session start:
 * - Garbage filenames (Windows defaults, empty files)
 * - Naming violations (spaces in filenames)
 * - Organization issues (too many files at root)
 * - Screenshots at project root
 *
 * Severity: WARN (logs issues but doesn't block)
 * Action: Suggests mv commands, tracks in hygiene-audit-registry.json
 *
 * CRITICAL: NO DELETION - only move to old/ directory per Spinal Cord rules.
 * All suggestions MUST use `mv` commands, never `rm`, `del`, or `delete`.
 *
 * @see https://github.com/atgfw/claude-config/issues/20
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import process from 'node:process';
import { log, getClaudeDir as getClaudeDirectory } from '../utils.js';
/**
 * Garbage filename patterns (case-insensitive)
 */
const garbagePatterns = [
    { pattern: /^new text document.*\.txt$/i, description: 'Windows default filename' },
    { pattern: /^untitled.*$/i, description: 'Default untitled file' },
    { pattern: /^copy of /i, description: 'Copy prefix' },
    { pattern: /^nul$/i, description: 'Windows NUL redirect artifact' },
    { pattern: /^\.ds_store$/i, description: 'macOS metadata' },
    { pattern: /^thumbs\.db$/i, description: 'Windows thumbnail cache' },
    { pattern: /^desktop\.ini$/i, description: 'Windows folder config' },
];
/**
 * Naming violation patterns
 */
const namingViolations = [
    { pattern: /\s/, description: 'Contains spaces' },
    { pattern: /[<>:"|?*]/, description: 'Contains invalid characters' },
];
/**
 * File extensions that indicate screenshots
 */
const screenshotExtensions = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.webp']);
/**
 * Organization thresholds
 */
const thresholds = {
    maxScriptsAtRoot: 2,
    maxMarkdownAtRoot: 5,
    maxImagesAtRoot: 0,
};
/**
 * Check if file is a garbage file
 */
function checkGarbageFile(filename) {
    for (const { pattern, description } of garbagePatterns) {
        if (pattern.test(filename)) {
            return { isGarbage: true, description };
        }
    }
    return { isGarbage: false };
}
/**
 * Check if file has naming violations
 */
function checkNamingViolations(filename) {
    for (const { pattern, description } of namingViolations) {
        if (pattern.test(filename)) {
            return { hasViolation: true, description };
        }
    }
    return { hasViolation: false };
}
/**
 * Get file category for organization check
 */
function getFileCategory(filename) {
    const extension = path.extname(filename).toLowerCase();
    if (['.py', '.js', '.ts', '.ps1', '.sh', '.bash'].includes(extension)) {
        return 'script';
    }
    if (extension === '.md') {
        return 'markdown';
    }
    if (screenshotExtensions.has(extension)) {
        return 'image';
    }
    return 'other';
}
/**
 * Forbidden command patterns - NEVER suggest deletion
 */
const forbiddenCommands = [/\brm\b/, /\bdel\b/, /\bdelete\b/, /\bremove\b/, /\bunlink\b/];
/**
 * Validate suggestion doesn't contain forbidden deletion commands
 */
function validateSuggestion(suggestion) {
    for (const pattern of forbiddenCommands) {
        if (pattern.test(suggestion.toLowerCase())) {
            // Replace with safe alternative
            return `mv "${suggestion}" old/misc/ # SAFETY: Original suggestion contained forbidden delete command`;
        }
    }
    return suggestion;
}
/**
 * Generate safe filename from garbage name
 */
function suggestSafeFilename(filename) {
    // Replace spaces with hyphens
    let safe = filename.replaceAll(/\s+/g, '-');
    // Remove invalid characters
    safe = safe.replaceAll(/[<>:"|?*]/g, '');
    // Lowercase
    safe = safe.toLowerCase();
    return safe;
}
/**
 * Scan project root for hygiene issues
 */
function scanRootDirectory(projectDirectory) {
    const issues = [];
    try {
        const entries = fs.readdirSync(projectDirectory, { withFileTypes: true });
        // Count files by category
        const counts = { script: 0, markdown: 0, image: 0, other: 0 };
        const filesByCategory = {
            script: [],
            markdown: [],
            image: [],
            other: [],
        };
        for (const entry of entries) {
            // Skip directories and hidden files (except specific garbage)
            if (entry.isDirectory())
                continue;
            if (entry.name.startsWith('.') && !garbagePatterns.some((p) => p.pattern.test(entry.name))) {
                continue;
            }
            const filename = entry.name;
            const fullPath = path.join(projectDirectory, filename);
            // Check for garbage files
            const garbage = checkGarbageFile(filename);
            if (garbage.isGarbage) {
                issues.push({
                    type: 'garbage_file',
                    path: fullPath,
                    filename,
                    suggestion: validateSuggestion(`mv "${filename}" old/misc/`),
                    severity: 'warn',
                });
                continue;
            }
            // Check for empty files (0 bytes)
            try {
                const stats = fs.statSync(fullPath);
                if (stats.size === 0) {
                    issues.push({
                        type: 'garbage_file',
                        path: fullPath,
                        filename,
                        suggestion: validateSuggestion(`mv "${filename}" old/misc/ # Empty file`),
                        severity: 'info',
                    });
                    continue;
                }
            }
            catch {
                // Skip files we can't stat
                continue;
            }
            // Check for naming violations
            const naming = checkNamingViolations(filename);
            if (naming.hasViolation) {
                const safeName = suggestSafeFilename(filename);
                issues.push({
                    type: 'naming_violation',
                    path: fullPath,
                    filename,
                    suggestion: validateSuggestion(`mv "${filename}" "${safeName}" # ${naming.description}`),
                    severity: 'warn',
                });
            }
            // Track file categories for organization check
            const category = getFileCategory(filename);
            counts[category]++;
            filesByCategory[category]?.push(filename);
        }
        // Check organization thresholds
        if (counts.script > thresholds.maxScriptsAtRoot) {
            issues.push({
                type: 'organization',
                path: projectDirectory,
                filename: `${counts.script} scripts`,
                suggestion: validateSuggestion(`mkdir -p scripts && mv *.py *.js *.ts *.ps1 *.sh scripts/`),
                severity: 'warn',
            });
        }
        if (counts.markdown > thresholds.maxMarkdownAtRoot) {
            // Exclude known root files
            const rootKeepers = new Set([
                'CLAUDE.md',
                'README.md',
                'PROJECT-DIRECTIVE.md',
                'LOOSE-ENDS.md',
                'CHANGELOG.md',
            ]);
            const movableMarkdown = filesByCategory.markdown?.filter((f) => !rootKeepers.has(f)) ?? [];
            if (movableMarkdown.length > 3) {
                issues.push({
                    type: 'organization',
                    path: projectDirectory,
                    filename: `${movableMarkdown.length} markdown files`,
                    suggestion: validateSuggestion(`mkdir -p docs && mv ${movableMarkdown.slice(0, 3).join(' ')} ... docs/`),
                    severity: 'info',
                });
            }
        }
        if (counts.image > thresholds.maxImagesAtRoot) {
            issues.push({
                type: 'screenshot_at_root',
                path: projectDirectory,
                filename: `${counts.image} images`,
                suggestion: validateSuggestion(`mkdir -p old/screenshots && mv *.png *.jpg *.jpeg old/screenshots/`),
                severity: 'warn',
            });
        }
    }
    catch (error) {
        log(`[ERROR] Failed to scan directory: ${error instanceof Error ? error.message : 'Unknown'}`);
    }
    return issues;
}
/**
 * Write audit results to ledger
 */
function writeToLedger(projectDirectory, issues) {
    const ledgerDirectory = path.join(getClaudeDirectory(), 'ledger');
    const ledgerPath = path.join(ledgerDirectory, 'hygiene-audit-registry.json');
    try {
        fs.mkdirSync(ledgerDirectory, { recursive: true });
        let registry = [];
        if (fs.existsSync(ledgerPath)) {
            const content = fs.readFileSync(ledgerPath, 'utf8');
            registry = JSON.parse(content);
        }
        // Add new entry (keep last 100 entries)
        registry.push({
            timestamp: new Date().toISOString(),
            project: projectDirectory,
            issueCount: issues.length,
            issues,
        });
        if (registry.length > 100) {
            registry = registry.slice(-100);
        }
        fs.writeFileSync(ledgerPath, JSON.stringify(registry, null, 2));
    }
    catch {
        // Silently fail ledger write
    }
}
/**
 * Run hygiene audit on project
 */
export function auditFolderHygiene(projectDirectory) {
    const directory = projectDirectory ?? process.cwd();
    log('[CHECK] Scanning for folder hygiene issues...');
    const issues = scanRootDirectory(directory);
    if (issues.length === 0) {
        log('[OK] No hygiene issues found');
        return {
            name: 'Folder Hygiene',
            passed: true,
            severity: 'info',
            message: 'Project root is clean',
            issues: [],
        };
    }
    // Log issues
    const warnings = issues.filter((issue) => issue.severity === 'warn');
    const infos = issues.filter((issue) => issue.severity === 'info');
    if (warnings.length > 0) {
        log(`[WARN] Found ${warnings.length} hygiene issue(s) requiring attention:`);
        for (const issue of warnings.slice(0, 5)) {
            log(`  - ${issue.type}: ${issue.filename}`);
            log(`    Fix: ${issue.suggestion}`);
        }
        if (warnings.length > 5) {
            log(`  ... and ${warnings.length - 5} more`);
        }
    }
    if (infos.length > 0) {
        log(`[INFO] Found ${infos.length} minor issue(s)`);
    }
    // Write to ledger
    writeToLedger(directory, issues);
    const details = issues.map((issue) => `${issue.type}: ${issue.filename} -> ${issue.suggestion}`);
    return {
        name: 'Folder Hygiene',
        passed: warnings.length === 0,
        severity: warnings.length > 0 ? 'warn' : 'info',
        message: `Found ${issues.length} hygiene issue(s)`,
        details,
        issues,
    };
}
export default auditFolderHygiene;
//# sourceMappingURL=folder_hygiene_auditor.js.map