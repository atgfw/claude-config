/**
 * Issue File Detector
 * Detects whether an issue's referenced file/entity already exists on disk.
 * Used by: issue_crud.ts (pre-creation gate), session_start.ts (reconciliation audit).
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { getClaudeDir } from '../utils.js';
// Patterns that indicate a file reference in an issue title
const FILE_EXT_REGEX = /\b([\w.-]+\.(?:ts|js|json|md|yaml|yml|sh))\b/;
const IMPLEMENT_REGEX = /\b(?:implement|add|create|build|write)\s+([\w_.-]+)/i;
const HOOK_NAME_REGEX = /\b([\w_]+(?:_gate|_validator|_enforcer|_detector|_hook|_auditor))\b/;
/**
 * Extract candidate filenames/entities from an issue title.
 * Returns an array of possible file stems to search for.
 */
export function extractCandidates(title) {
    const candidates = [];
    // 1. Explicit filename with extension
    const fileMatch = title.match(FILE_EXT_REGEX);
    if (fileMatch?.[1]) {
        candidates.push(fileMatch[1]);
        // Also add the stem without extension
        const stem = fileMatch[1].replace(/\.[^.]+$/, '');
        if (stem && stem !== fileMatch[1]) {
            candidates.push(stem);
        }
    }
    // 2. "implement X" / "add X" / "create X" pattern
    const implMatch = title.match(IMPLEMENT_REGEX);
    if (implMatch?.[1]) {
        const entity = implMatch[1];
        // Skip if it's a generic word
        if (entity.length > 3 && !['the', 'this', 'that', 'new'].includes(entity.toLowerCase())) {
            candidates.push(entity);
            // Add .ts variant if no extension
            if (!entity.includes('.')) {
                candidates.push(`${entity}.ts`);
            }
        }
    }
    // 3. Hook/gate/validator naming pattern
    const hookMatch = title.match(HOOK_NAME_REGEX);
    if (hookMatch?.[1]) {
        candidates.push(hookMatch[1]);
        candidates.push(`${hookMatch[1]}.ts`);
    }
    // Deduplicate
    return [...new Set(candidates)];
}
/**
 * Search common locations for a candidate file.
 * Returns the first matching absolute path, or null.
 */
export function findFile(candidate, cwd) {
    const claudeDir = cwd ?? getClaudeDir();
    const searchDirs = [
        path.join(claudeDir, 'hooks', 'src'),
        path.join(claudeDir, 'hooks', 'src', 'hooks'),
        path.join(claudeDir, 'hooks', 'src', 'governance'),
        path.join(claudeDir, 'hooks', 'src', 'github'),
        path.join(claudeDir, 'hooks', 'src', 'ledger'),
        path.join(claudeDir, 'hooks', 'src', 'escalation'),
        path.join(claudeDir, 'hooks', 'src', 'context'),
        path.join(claudeDir, 'hooks', 'src', 'browser'),
        path.join(claudeDir, 'hooks', 'src', 'research'),
        path.join(claudeDir, 'hooks', 'src', 'session'),
        path.join(claudeDir, 'hooks', 'src', 'utils'),
        path.join(claudeDir, 'hooks', 'dist'),
        path.join(claudeDir, 'hooks', 'dist', 'hooks'),
        path.join(claudeDir, 'hooks', 'dist', 'governance'),
        path.join(claudeDir, 'hooks', 'dist', 'github'),
    ];
    for (const dir of searchDirs) {
        const fullPath = path.join(dir, candidate);
        if (fs.existsSync(fullPath)) {
            return fullPath;
        }
    }
    return null;
}
/**
 * Detect whether an issue title references a file/entity that already exists on disk.
 * Returns the first matching file path, or null if nothing found.
 */
export function detectImplementedFile(issueTitle, cwd) {
    const candidates = extractCandidates(issueTitle);
    for (const candidate of candidates) {
        const found = findFile(candidate, cwd);
        if (found)
            return found;
    }
    return null;
}
//# sourceMappingURL=issue_file_detector.js.map