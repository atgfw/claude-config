/**
 * Setup: Dirty Tree Detection Test
 *
 * Creates uncommitted changes in the working tree and fetches remote
 * to establish conditions for dirty tree detection test.
 *
 * Usage: bun run setup-dirty-tree.ts [project-dir]
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { execSync } from "node:child_process";

const projectDir = process.argv[2] || process.cwd();

function log(message: string): void {
  console.log(`[setup-dirty-tree] ${message}`);
}

function executeGit(command: string): { success: boolean; output: string } {
  try {
    const output = execSync(`git ${command}`, {
      cwd: projectDir,
      encoding: "utf8",
      stdio: "pipe",
    });
    return { success: true, output: output.trim() };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return { success: false, output: message };
  }
}

function main(): void {
  log(`Project directory: ${projectDir}`);

  // Verify git repository
  const gitDir = path.join(projectDir, ".git");
  if (!fs.existsSync(gitDir)) {
    console.error("[ERROR] Not a git repository");
    process.exit(1);
  }

  // Fetch remote to get latest state
  log("Fetching remote...");
  const fetchResult = executeGit("fetch origin");
  if (!fetchResult.success) {
    log("Warning: Could not fetch remote (may be offline)");
  }

  // Create a test modification
  const testFile = path.join(projectDir, "dirty-tree-test-file.txt");
  const timestamp = new Date().toISOString();
  fs.writeFileSync(
    testFile,
    `Test file created at ${timestamp}\nThis file creates a dirty tree condition.\n`,
  );
  log(`Created test file: ${testFile}`);

  // Check current status
  const statusResult = executeGit("status --porcelain");
  log(`Working tree status:\n${statusResult.output}`);

  // Check if behind remote
  const behindResult = executeGit("rev-list HEAD..origin/main --count");
  if (behindResult.success && parseInt(behindResult.output, 10) > 0) {
    log(`Behind remote by ${behindResult.output} commit(s)`);
  } else {
    log("Local is up to date with remote (or remote not available)");
    log("For full test, push commits from another machine first");
  }

  log("Setup complete. Start a new Claude Code session to test.");
  log("Cleanup: bun run cleanup-all.ts");
}

main();
