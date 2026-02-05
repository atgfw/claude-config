/**
 * Cleanup: Reset All Test Conditions
 *
 * Removes all test files and conditions created by setup scripts.
 *
 * Usage: bun run cleanup-all.ts [project-dir]
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { execSync } from "node:child_process";

const projectDir = process.argv[2] || process.cwd();

function log(message: string): void {
  console.log(`[cleanup-all] ${message}`);
}

function safeDelete(filePath: string): boolean {
  try {
    if (fs.existsSync(filePath)) {
      const stat = fs.statSync(filePath);
      if (stat.isDirectory()) {
        fs.rmSync(filePath, { recursive: true });
      } else {
        fs.unlinkSync(filePath);
      }
      log(`Removed: ${filePath}`);
      return true;
    }
    return false;
  } catch {
    log(`Warning: Could not remove ${filePath}`);
    return false;
  }
}

function main(): void {
  log(`Project directory: ${projectDir}`);
  log("Cleaning up test conditions...");
  log("");

  // Dirty tree test cleanup
  safeDelete(path.join(projectDir, "dirty-tree-test-file.txt"));

  // Governance violation cleanup
  safeDelete(path.join(projectDir, ".mcp.json"));
  safeDelete(path.join(projectDir, ".claude", "settings.json"));
  // Only remove .claude if it's empty and was created by us
  const claudeDir = path.join(projectDir, ".claude");
  if (fs.existsSync(claudeDir)) {
    const contents = fs.readdirSync(claudeDir);
    if (contents.length === 0) {
      safeDelete(claudeDir);
    }
  }

  // Temp files cleanup
  const tempFiles = [
    "stale-test.tmp",
    "recent-test.tmp",
    "old-backup.bak",
    "recent-backup.bak",
    "old-log.log",
    "editor-backup.txt~",
  ];
  for (const file of tempFiles) {
    safeDelete(path.join(projectDir, file));
  }

  // Drift test cleanup
  const tempDir = path.join(projectDir, "temp");
  if (fs.existsSync(tempDir)) {
    safeDelete(path.join(tempDir, "customer_sync.json"));
    safeDelete(path.join(tempDir, "job_handler.json"));
    // Remove temp if empty
    const contents = fs.readdirSync(tempDir);
    if (contents.length === 0) {
      safeDelete(tempDir);
    }
  }

  // Stale hooks cleanup - rebuild
  const homeDir = os.homedir();
  const hooksDir = path.join(homeDir, ".claude", "hooks");
  if (fs.existsSync(hooksDir)) {
    log("Rebuilding hooks...");
    try {
      execSync("bun run build", { cwd: hooksDir, stdio: "inherit" });
      log("Hooks rebuilt successfully");
    } catch {
      log("Warning: Could not rebuild hooks automatically");
    }
  }

  // Remove old/ directory created by cleanup tests
  const oldDir = path.join(projectDir, "old");
  if (fs.existsSync(oldDir)) {
    safeDelete(oldDir);
  }

  log("");
  log("Cleanup complete.");
}

main();
