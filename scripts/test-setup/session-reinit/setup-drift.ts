/**
 * Setup: Documentation Drift Test
 *
 * Creates workflow JSON file with mismatched filename vs internal name
 * to trigger drift warning during session start.
 *
 * Usage: bun run setup-drift.ts [project-dir]
 */

import * as fs from "node:fs";
import * as path from "node:path";

const projectDir = process.argv[2] || process.cwd();

function log(message: string): void {
  console.log(`[setup-drift] ${message}`);
}

interface WorkflowDefinition {
  filename: string;
  internalName: string;
}

function createMismatchedWorkflow(
  tempDir: string,
  workflow: WorkflowDefinition,
): void {
  const filePath = path.join(tempDir, workflow.filename);
  const content = {
    name: workflow.internalName,
    id: `test-drift-${workflow.filename.replace(".json", "")}`,
    nodes: [],
    connections: {},
    active: false,
    settings: {},
  };

  fs.writeFileSync(filePath, JSON.stringify(content, null, 2));
  log(`Created: ${workflow.filename}`);
  log(`  Filename: ${workflow.filename}`);
  log(`  Internal name: "${workflow.internalName}"`);
}

function main(): void {
  log(`Project directory: ${projectDir}`);

  // Create temp directory for workflow files
  const tempDir = path.join(projectDir, "temp");
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  // Define workflows with mismatched names
  const workflows: WorkflowDefinition[] = [
    {
      filename: "customer_sync.json",
      internalName: "Customer Data Synchronization Pipeline",
    },
    {
      filename: "job_handler.json",
      internalName: "ServiceTitan Job Processing Workflow",
    },
  ];

  for (const workflow of workflows) {
    createMismatchedWorkflow(tempDir, workflow);
  }

  log("");
  log("Drift conditions created.");
  log("Start a new Claude Code session to test.");
  log("Expected: Warning about name mismatches");
  log("Cleanup: bun run cleanup-all.ts");
}

main();
