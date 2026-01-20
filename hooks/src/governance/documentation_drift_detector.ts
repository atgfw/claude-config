/**
 * Documentation Drift Detector
 *
 * Detects inconsistencies between:
 * 1. Local workflow JSON files and cloud workflow names
 * 2. Local registry files and actual cloud state
 * 3. AUDIT documents and current workflow IDs
 *
 * This is a utility module that can be invoked by hooks or manually.
 * Part of the Spinal Cord governance system.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface DriftIssue {
  type: 'name_mismatch' | 'id_mismatch' | 'missing_local' | 'missing_cloud' | 'stale_reference';
  severity: 'error' | 'warning' | 'info';
  file: string;
  message: string;
  localValue?: string;
  cloudValue?: string;
  recommendation: string;
}

export interface DriftReport {
  projectRoot: string;
  timestamp: string;
  issues: DriftIssue[];
  totalIssues: number;
  errorCount: number;
  warningCount: number;
}

/**
 * Parse workflow JSON file to extract name and ID
 */
export function parseWorkflowJson(filePath: string): { name: string; id?: string } | null {
  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const workflow = JSON.parse(content);
    return {
      name: workflow.name || path.basename(filePath, '.json'),
      id: workflow.id,
    };
  } catch {
    return null;
  }
}

/**
 * Parse workflow-ids.json registry
 */
export function parseWorkflowRegistry(
  projectRoot: string
): Map<string, { name: string; id: string }> {
  const registry = new Map<string, { name: string; id: string }>();

  // Common locations for workflow ID registries
  const registryPaths = [
    path.join(projectRoot, 'workflow-ids.json'),
    path.join(projectRoot, 'workflows', 'workflow-ids.json'),
    path.join(projectRoot, 'workflows', 'documentation_automation', 'workflow-ids.json'),
  ];

  for (const registryPath of registryPaths) {
    if (fs.existsSync(registryPath)) {
      try {
        const content = fs.readFileSync(registryPath, 'utf-8');
        const data = JSON.parse(content);

        // Handle different registry formats
        if (Array.isArray(data)) {
          for (const item of data) {
            if (item.name && item.id) {
              registry.set(item.id, { name: item.name, id: item.id });
            }
          }
        } else if (typeof data === 'object') {
          for (const [key, value] of Object.entries(data)) {
            if (typeof value === 'object' && value !== null) {
              const v = value as { name?: string; id?: string };
              if (v.name && v.id) {
                registry.set(v.id, { name: v.name, id: v.id });
              }
            } else if (typeof value === 'string') {
              registry.set(value, { name: key, id: value });
            }
          }
        }
      } catch {
        // Skip malformed registries
      }
    }
  }

  return registry;
}

/**
 * Find all local workflow JSON files
 */
export function findLocalWorkflows(projectRoot: string): Map<string, string> {
  const workflows = new Map<string, string>(); // name -> path

  // Look in common workflow directories
  const searchDirs = [
    path.join(projectRoot, 'workflows'),
    path.join(projectRoot, 'n8n'),
    path.join(projectRoot, 'exports'),
  ];

  for (const dir of searchDirs) {
    if (fs.existsSync(dir)) {
      const files = findJsonFilesRecursive(dir);
      for (const file of files) {
        const parsed = parseWorkflowJson(file);
        if (parsed) {
          workflows.set(parsed.name, file);
        }
      }
    }
  }

  return workflows;
}

/**
 * Find JSON files recursively
 */
function findJsonFilesRecursive(dir: string): string[] {
  const results: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          results.push(...findJsonFilesRecursive(fullPath));
        }
      } else if (entry.name.endsWith('.json') && !entry.name.includes('package')) {
        results.push(fullPath);
      }
    }
  } catch {
    // Skip inaccessible directories
  }

  return results;
}

/**
 * Scan markdown files for workflow ID references and check for staleness
 */
export function findStaleReferences(projectRoot: string, validIds: Set<string>): DriftIssue[] {
  const issues: DriftIssue[] = [];

  // Files to scan for workflow references
  const scanPatterns = ['AUDIT-GAPS.md', '**/AUDIT*.md', '**/README.md', 'openspec/**/design.md'];

  // Find audit and documentation files
  const filesToScan: string[] = [];

  // Direct files
  for (const pattern of scanPatterns) {
    if (!pattern.includes('*')) {
      const fullPath = path.join(projectRoot, pattern);
      if (fs.existsSync(fullPath)) {
        filesToScan.push(fullPath);
      }
    }
  }

  // Recursive search for pattern files
  const searchDirs = [projectRoot, path.join(projectRoot, 'openspec')];
  for (const dir of searchDirs) {
    if (fs.existsSync(dir)) {
      const mdFiles = findMdFilesRecursive(dir);
      filesToScan.push(
        ...mdFiles.filter(
          (f) => f.includes('AUDIT') || f.includes('design.md') || f.includes('README')
        )
      );
    }
  }

  // Scan files for workflow ID patterns (16-char alphanumeric)
  const idPattern = /[A-Za-z0-9]{16}/g;

  for (const file of filesToScan) {
    try {
      const content = fs.readFileSync(file, 'utf-8');
      const matches = content.match(idPattern) || [];

      for (const match of matches) {
        // Check if this looks like a workflow ID (mixed case, not all same char)
        const uniqueChars = new Set(match).size;
        if (uniqueChars >= 4 && !validIds.has(match)) {
          // Potential stale ID reference
          issues.push({
            type: 'stale_reference',
            severity: 'warning',
            file,
            message: `Potential stale workflow ID reference: ${match}`,
            localValue: match,
            recommendation: 'Verify this ID exists in cloud or update documentation',
          });
        }
      }
    } catch {
      // Skip unreadable files
    }
  }

  return issues;
}

/**
 * Find markdown files recursively
 */
function findMdFilesRecursive(dir: string): string[] {
  const results: string[] = [];

  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        if (entry.name !== 'node_modules' && !entry.name.startsWith('.')) {
          results.push(...findMdFilesRecursive(fullPath));
        }
      } else if (entry.name.endsWith('.md')) {
        results.push(fullPath);
      }
    }
  } catch {
    // Skip inaccessible directories
  }

  return results;
}

/**
 * Compare local workflows against cloud workflows
 * cloudWorkflows should be a map of ID -> name from n8n API
 */
export function detectDrift(
  projectRoot: string,
  cloudWorkflows: Map<string, string> // id -> name
): DriftReport {
  const issues: DriftIssue[] = [];

  // Load local registry
  const registry = parseWorkflowRegistry(projectRoot);

  // Load local workflow files
  const localWorkflows = findLocalWorkflows(projectRoot);

  // Check registry against cloud
  for (const [id, local] of registry) {
    const cloudName = cloudWorkflows.get(id);

    if (!cloudName) {
      issues.push({
        type: 'missing_cloud',
        severity: 'error',
        file: 'workflow-ids.json',
        message: `Workflow "${local.name}" (${id}) exists in registry but not in cloud`,
        localValue: local.name,
        recommendation: 'Remove from registry or recreate in cloud',
      });
    } else if (cloudName !== local.name) {
      issues.push({
        type: 'name_mismatch',
        severity: 'warning',
        file: 'workflow-ids.json',
        message: `Workflow name mismatch: registry says "${local.name}" but cloud says "${cloudName}"`,
        localValue: local.name,
        cloudValue: cloudName,
        recommendation: 'Update registry or rename workflow in cloud',
      });
    }
  }

  // Check cloud against local
  for (const [id, cloudName] of cloudWorkflows) {
    if (!registry.has(id)) {
      issues.push({
        type: 'missing_local',
        severity: 'info',
        file: 'workflow-ids.json',
        message: `Workflow "${cloudName}" (${id}) exists in cloud but not in local registry`,
        cloudValue: cloudName,
        recommendation: 'Add to registry if this workflow should be tracked',
      });
    }
  }

  // Check for file name vs workflow name drift
  for (const [name, filePath] of localWorkflows) {
    const fileName = path.basename(filePath, '.json');
    if (fileName !== name && !fileName.includes(name) && !name.includes(fileName)) {
      issues.push({
        type: 'name_mismatch',
        severity: 'warning',
        file: filePath,
        message: `File name "${fileName}.json" doesn't match workflow name "${name}"`,
        localValue: fileName,
        cloudValue: name,
        recommendation: 'Rename file to match workflow name',
      });
    }
  }

  // Check for stale ID references in documentation
  const validIds = new Set([...cloudWorkflows.keys(), ...registry.keys()]);
  const staleRefs = findStaleReferences(projectRoot, validIds);
  issues.push(...staleRefs);

  return {
    projectRoot,
    timestamp: new Date().toISOString(),
    issues,
    totalIssues: issues.length,
    errorCount: issues.filter((i) => i.severity === 'error').length,
    warningCount: issues.filter((i) => i.severity === 'warning').length,
  };
}

/**
 * Format drift report for logging
 */
export function formatDriftReport(report: DriftReport): string {
  const lines: string[] = [];

  lines.push('Documentation Drift Report');
  lines.push('==========================');
  lines.push(`Project: ${report.projectRoot}`);
  lines.push(`Timestamp: ${report.timestamp}`);
  lines.push('');
  lines.push(`Total Issues: ${report.totalIssues}`);
  lines.push(`  Errors: ${report.errorCount}`);
  lines.push(`  Warnings: ${report.warningCount}`);
  lines.push('');

  if (report.issues.length === 0) {
    lines.push('No drift detected - local documentation matches cloud state.');
  } else {
    const byType = new Map<string, DriftIssue[]>();
    for (const issue of report.issues) {
      const existing = byType.get(issue.type) || [];
      existing.push(issue);
      byType.set(issue.type, existing);
    }

    for (const [type, issues] of byType) {
      lines.push(`${type.toUpperCase().replace('_', ' ')}: ${issues.length}`);
      for (const issue of issues.slice(0, 5)) {
        const relPath = path.relative(report.projectRoot, issue.file);
        lines.push(`  [${issue.severity.toUpperCase()}] ${relPath}`);
        lines.push(`    ${issue.message}`);
        lines.push(`    Recommendation: ${issue.recommendation}`);
      }
      if (issues.length > 5) {
        lines.push(`  ... and ${issues.length - 5} more`);
      }
      lines.push('');
    }
  }

  return lines.join('\n');
}

/**
 * Save drift report to ledger
 */
export function saveDriftReport(report: DriftReport): void {
  const ledgerDir = path.join(report.projectRoot, '.claude', 'ledger');

  if (!fs.existsSync(ledgerDir)) {
    fs.mkdirSync(ledgerDir, { recursive: true });
  }

  const reportPath = path.join(ledgerDir, 'drift-report.json');
  fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
}
