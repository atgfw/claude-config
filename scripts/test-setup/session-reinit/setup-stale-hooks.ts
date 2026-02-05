/**
 * Setup: Stale Hooks Test
 *
 * Makes hook source files newer than compiled output to trigger
 * self-healing rebuild during session start.
 *
 * Usage: bun run setup-stale-hooks.ts
 */

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

const homeDir = os.homedir();
const hooksDir = path.join(homeDir, ".claude", "hooks");

function log(message: string): void {
  console.log(`[setup-stale-hooks] ${message}`);
}

function main(): void {
  log(`Hooks directory: ${hooksDir}`);

  const srcDir = path.join(hooksDir, "src");
  const distDir = path.join(hooksDir, "dist");

  // Verify directories exist
  if (!fs.existsSync(srcDir)) {
    console.error("[ERROR] hooks/src/ directory not found");
    process.exit(1);
  }

  // Option 1: Delete dist/ entirely (more aggressive test)
  const deleteMode = process.argv.includes("--delete-dist");

  if (deleteMode) {
    if (fs.existsSync(distDir)) {
      fs.rmSync(distDir, { recursive: true });
      log("Deleted hooks/dist/ directory");
    }
    log("Self-heal should recreate dist/ on next session start");
  } else {
    // Option 2: Touch source files to make them newer
    const srcFiles = fs.readdirSync(srcDir).filter((f) => f.endsWith(".ts"));
    const futureTime = new Date(Date.now() + 60000); // 1 minute in future

    for (const file of srcFiles.slice(0, 3)) {
      // Touch first 3 files
      const filePath = path.join(srcDir, file);
      fs.utimesSync(filePath, futureTime, futureTime);
      log(`Touched: ${file}`);
    }
    log("Source files now newer than compiled output");
  }

  log("");
  log("Start a new Claude Code session to test.");
  log("Expected: [SELF-HEAL] Hook compilation message");
  log("");
  log("Cleanup: cd ~/.claude/hooks && bun run build");
}

main();
