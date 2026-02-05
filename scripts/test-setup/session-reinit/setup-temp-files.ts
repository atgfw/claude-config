/**
 * Setup: Temp Files Cleanup Test
 *
 * Creates temporary files with old timestamps to trigger
 * cleanup archival during session start.
 *
 * Usage: bun run setup-temp-files.ts [project-dir]
 */

import * as fs from "node:fs";
import * as path from "node:path";

const projectDir = process.argv[2] || process.cwd();

function log(message: string): void {
  console.log(`[setup-temp-files] ${message}`);
}

function createStaleFile(filePath: string, hoursOld: number): void {
  const content = `Test file created for cleanup testing\nAge: ${hoursOld} hours`;
  fs.writeFileSync(filePath, content);

  // Set modification time to hoursOld hours ago
  const pastTime = new Date(Date.now() - hoursOld * 60 * 60 * 1000);
  fs.utimesSync(filePath, pastTime, pastTime);

  log(`Created: ${path.basename(filePath)} (${hoursOld} hours old)`);
}

function main(): void {
  log(`Project directory: ${projectDir}`);

  // Create various temp files with different ages
  const testFiles = [
    { name: "stale-test.tmp", hoursOld: 48 }, // Should be archived (>24h)
    { name: "recent-test.tmp", hoursOld: 12 }, // Should NOT be archived (<24h)
    { name: "old-backup.bak", hoursOld: 200 }, // Should be archived (>168h)
    { name: "recent-backup.bak", hoursOld: 100 }, // Should NOT be archived (<168h)
    { name: "old-log.log", hoursOld: 100 }, // Should be archived (>72h)
    { name: "editor-backup.txt~", hoursOld: 48 }, // Should be archived (>24h)
  ];

  for (const file of testFiles) {
    const filePath = path.join(projectDir, file.name);
    createStaleFile(filePath, file.hoursOld);
  }

  log("");
  log("Files that SHOULD be archived:");
  log("  - stale-test.tmp (48h > 24h threshold)");
  log("  - old-backup.bak (200h > 168h threshold)");
  log("  - old-log.log (100h > 72h threshold)");
  log("  - editor-backup.txt~ (48h > 24h threshold)");
  log("");
  log("Files that should NOT be archived:");
  log("  - recent-test.tmp (12h < 24h threshold)");
  log("  - recent-backup.bak (100h < 168h threshold)");
  log("");
  log("Start a new Claude Code session to test.");
  log("Cleanup: bun run cleanup-all.ts");
}

main();
