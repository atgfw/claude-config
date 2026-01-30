/**
 * Auto-commit and push hook.
 * Fires on PostToolUse for write/edit/bash operations.
 * Stages all changes, commits with sync message, and pushes to origin.
 */
import { execSync } from 'child_process';
import { logTerse } from '../utils.js';

const REPO_DIR = process.env.HOME
  ? `${process.env.HOME}/.claude`
  : `${process.env.USERPROFILE}\\.claude`;

function run(cmd: string): string {
  try {
    return execSync(cmd, { cwd: REPO_DIR, timeout: 30_000, encoding: 'utf8' }).trim();
  } catch {
    return '';
  }
}

function main() {
  // Check if there are any changes to commit
  const status = run('git status --porcelain');
  if (!status) {
    // Nothing to commit
    process.stdout.write(JSON.stringify({ decision: undefined }));
    return;
  }

  // Stage all changes (exclude Windows reserved names)
  run('git add -A -- ":!nul"');

  // Commit
  const result = run('git commit -m "chore(sync): session state sync" --no-verify');
  if (!result) {
    process.stdout.write(JSON.stringify({ decision: undefined }));
    return;
  }

  // Push (non-blocking, don't fail if offline)
  run('git push origin main --no-verify');

  logTerse('[+] auto-commit pushed');
  process.stdout.write(JSON.stringify({ decision: undefined }));
}

main();
