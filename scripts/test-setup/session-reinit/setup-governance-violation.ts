/**
 * Setup: Governance Violation Test
 *
 * Creates prohibited files (.mcp.json) in test project to trigger
 * governance block during session start.
 *
 * Usage: bun run setup-governance-violation.ts [project-dir]
 */

import * as fs from "node:fs";
import * as path from "node:path";

const projectDir = process.argv[2] || process.cwd();

function log(message: string): void {
  console.log(`[setup-governance-violation] ${message}`);
}

function main(): void {
  log(`Project directory: ${projectDir}`);

  // Safety check: don't run in ~/.claude itself
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  const claudeDir = path.join(homeDir, ".claude");
  if (path.resolve(projectDir) === path.resolve(claudeDir)) {
    console.error(
      "[ERROR] Cannot create governance violation in ~/.claude itself",
    );
    console.error("Use a test project directory instead");
    process.exit(1);
  }

  // Create .mcp.json (prohibited file)
  const mcpJsonPath = path.join(projectDir, ".mcp.json");
  const mcpContent = {
    mcpServers: {
      "test-server": {
        command: "echo",
        args: ["test"],
      },
    },
  };

  fs.writeFileSync(mcpJsonPath, JSON.stringify(mcpContent, null, 2));
  log(`Created prohibited file: ${mcpJsonPath}`);

  // Optionally create other violations
  const settingsDir = path.join(projectDir, ".claude");
  if (!fs.existsSync(settingsDir)) {
    fs.mkdirSync(settingsDir, { recursive: true });
  }

  const settingsPath = path.join(settingsDir, "settings.json");
  fs.writeFileSync(settingsPath, JSON.stringify({ hooks: {} }, null, 2));
  log(`Created prohibited file: ${settingsPath}`);

  log("Governance violations created:");
  log("  - .mcp.json (MCP configuration)");
  log("  - .claude/settings.json (settings override)");
  log("");
  log("Start a new Claude Code session to test.");
  log("Expected: Session should be BLOCKED with governance error.");
  log("Cleanup: bun run cleanup-all.ts");
}

main();
