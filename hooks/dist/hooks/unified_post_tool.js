/**
 * Unified Post Tool - Consolidates PostToolUse hooks into 1
 *
 * Includes:
 * - API key leak detection
 * - Throttled auto-commit (max once per 5 minutes)
 */
import * as fs from 'node:fs';
import * as path from 'node:path';
import { execSync } from 'node:child_process';
import { log, getClaudeDir } from '../utils.js';
import { registerHook } from '../runner.js';
const API_KEY_PATTERNS = [
    /sk-[a-zA-Z0-9]{20,}/,
    /sk_live_[a-zA-Z0-9]{20,}/,
    /AKIA[A-Z0-9]{16}/,
    /ghp_[a-zA-Z0-9]{36}/,
];
const AUTOCOMMIT_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes
/**
 * Check if enough time has passed since the last auto-commit.
 * Uses a timestamp file for cross-process persistence.
 */
function shouldAutoCommit() {
    const claudeDir = getClaudeDir();
    const stampFile = path.join(claudeDir, 'cache', 'last-autocommit.txt');
    try {
        if (fs.existsSync(stampFile)) {
            const lastTime = Number.parseInt(fs.readFileSync(stampFile, 'utf-8').trim(), 10);
            if (Date.now() - lastTime < AUTOCOMMIT_INTERVAL_MS) {
                return false;
            }
        }
    }
    catch {
        // Stamp file missing or unreadable - proceed with commit
    }
    return true;
}
/** Record the current time as the last auto-commit timestamp. */
function markAutoCommitted() {
    const claudeDir = getClaudeDir();
    const cacheDir = path.join(claudeDir, 'cache');
    const stampFile = path.join(cacheDir, 'last-autocommit.txt');
    try {
        if (!fs.existsSync(cacheDir)) {
            fs.mkdirSync(cacheDir, { recursive: true });
        }
        fs.writeFileSync(stampFile, String(Date.now()));
    }
    catch {
        // Non-critical
    }
}
/** Run git add/commit/push in ~/.claude (non-blocking, best-effort). */
function runAutoCommit() {
    const claudeDir = getClaudeDir();
    try {
        const status = execSync('git status --porcelain', {
            cwd: claudeDir,
            encoding: 'utf-8',
            timeout: 10_000,
        }).trim();
        if (!status) {
            return; // Nothing to commit
        }
        execSync('git add -A -- ":!nul"', {
            cwd: claudeDir,
            encoding: 'utf-8',
            timeout: 10_000,
        });
        const commitResult = execSync('git commit -m "chore(sync): session state sync" --no-verify', {
            cwd: claudeDir,
            encoding: 'utf-8',
            timeout: 10_000,
        }).trim();
        if (!commitResult) {
            return;
        }
        execSync('git push origin main --no-verify', {
            cwd: claudeDir,
            encoding: 'utf-8',
            timeout: 15_000,
        });
        log('[+] auto-commit pushed (throttled)');
    }
    catch {
        // Non-blocking - push failures are expected when offline
    }
}
async function unifiedPostTool(input) {
    const content = String(input.tool_input?.content || '');
    const output = String(input.tool_output || '');
    const combined = content + output;
    for (const pattern of API_KEY_PATTERNS) {
        if (pattern.test(combined)) {
            log('WARNING: Potential API key detected');
            break;
        }
    }
    // Throttled auto-commit: max once per 5 minutes
    if (shouldAutoCommit()) {
        runAutoCommit();
        markAutoCommitted();
    }
    return { hookSpecificOutput: { hookEventName: 'PostToolUse' } };
}
registerHook('unified-post-tool', 'PostToolUse', unifiedPostTool);
export default unifiedPostTool;
//# sourceMappingURL=unified_post_tool.js.map