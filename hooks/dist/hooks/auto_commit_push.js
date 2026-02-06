/**
 * Auto-commit and push hook.
 * Fires on Stop event and also used by session_start.
 * Stages specific directories, commits with sync message, and pushes to origin.
 *
 * IMPORTANT: Does NOT use --no-verify, respects pre-commit hooks (secret scanner).
 */
import { execSync } from 'node:child_process';
import { logTerse } from '../utils.js';
const REPO_DIR = process.env.HOME
    ? `${process.env.HOME}/.claude`
    : `${process.env.USERPROFILE}\\.claude`;
/** Directories to stage for auto-commit (not `git add -A`) */
const STAGE_DIRS = ['ledger/', 'openspec/', 'sessions/', 'hooks/src/', 'hooks/tests/'];
function run(cmd, cwd) {
    try {
        return execSync(cmd, { cwd: cwd ?? REPO_DIR, timeout: 30_000, encoding: 'utf8' }).trim();
    }
    catch {
        return '';
    }
}
/**
 * Reusable auto-commit and push for ~/.claude repo.
 * Returns true if a commit was made.
 */
export function autoCommitAndPush(repoDir) {
    const dir = repoDir ?? REPO_DIR;
    // Check if there are any changes in tracked directories
    const statusArgs = STAGE_DIRS.join(' ');
    const status = run(`git status --porcelain ${statusArgs}`, dir);
    if (!status) {
        return false;
    }
    // Stage specific directories only (avoid staging secrets, temp files, etc.)
    for (const stageDir of STAGE_DIRS) {
        run(`git add ${stageDir}`, dir);
    }
    // Also stage CLAUDE.md and settings.json if changed
    run('git add CLAUDE.md settings.json', dir);
    // Check if there are staged changes (use --stat since run() swallows exit codes)
    const stagedStat = run('git diff --cached --stat', dir);
    if (!stagedStat) {
        return false;
    }
    // Commit (respects pre-commit hooks - no --no-verify)
    const commitResult = run('git commit -m "chore(sync): session state sync"', dir);
    if (!commitResult) {
        return false;
    }
    // Pull with rebase before push (handle divergence)
    run('git pull --rebase origin main', dir);
    // Push (non-blocking, don't fail if offline)
    run('git push origin main', dir);
    logTerse('[+] auto-commit pushed');
    return true;
}
// When run as main entry point (Stop hook via `bun run auto_commit_push.js`)
// Guard: only run main() when this is the entry point, not when imported
const isMainModule = typeof process !== 'undefined' &&
    process.argv[1] &&
    (process.argv[1].endsWith('auto_commit_push.js') ||
        process.argv[1].endsWith('auto_commit_push.ts'));
if (isMainModule) {
    autoCommitAndPush();
    process.stdout.write(JSON.stringify({ decision: undefined }));
}
//# sourceMappingURL=auto_commit_push.js.map