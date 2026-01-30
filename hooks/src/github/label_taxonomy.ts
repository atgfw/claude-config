/**
 * GitHub Label Taxonomy Provisioner
 * Reads label-taxonomy.json and idempotently provisions labels via gh CLI.
 */

import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { logTerse, logWarn, logBatch, getClaudeDir } from '../utils.js';

// ============================================================================
// Types
// ============================================================================

export interface LabelDefinition {
  name: string;
  color: string;
  description: string;
}

export interface LabelTaxonomy {
  labels: LabelDefinition[];
  remove_defaults: string[];
}

// ============================================================================
// Taxonomy Loading
// ============================================================================

/**
 * Load label taxonomy from github/label-taxonomy.json
 */
export function loadTaxonomy(): LabelTaxonomy {
  const taxonomyPath = path.join(getClaudeDir(), 'github', 'label-taxonomy.json');
  const raw = fs.readFileSync(taxonomyPath, 'utf-8');
  return JSON.parse(raw) as LabelTaxonomy;
}

// ============================================================================
// Label Provisioning
// ============================================================================

interface ExistingLabel {
  name: string;
  color: string;
  description: string;
}

/**
 * Idempotently provision labels from taxonomy.
 * Creates/updates labels and removes default labels listed in remove_defaults.
 */
export function provisionLabels(): void {
  const taxonomy = loadTaxonomy();

  // Fetch existing labels
  let existing: ExistingLabel[] = [];
  try {
    const output = execSync('gh label list --json name,color,description --limit 200', {
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    });
    existing = JSON.parse(output) as ExistingLabel[];
  } catch (err) {
    logWarn('Failed to list existing labels', (err as Error).message);
    return;
  }

  const existingNames = new Set(existing.map((l) => l.name));

  // Remove default labels
  const removed: string[] = [];
  for (const name of taxonomy.remove_defaults) {
    if (existingNames.has(name)) {
      try {
        execSync(`gh label delete ${JSON.stringify(name)} --yes`, {
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        });
        removed.push(name);
      } catch (err) {
        logWarn(`Failed to remove default label "${name}"`, (err as Error).message);
      }
    }
  }

  // Create/update labels (--force upserts)
  const created: string[] = [];
  for (const label of taxonomy.labels) {
    try {
      const args = [
        'gh label create',
        JSON.stringify(label.name),
        '--color',
        JSON.stringify(label.color),
        '--description',
        JSON.stringify(label.description),
        '--force',
      ].join(' ');
      execSync(args, {
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      created.push(label.name);
    } catch (err) {
      logWarn(`Failed to create label "${label.name}"`, (err as Error).message);
    }
  }

  if (created.length > 0) {
    logBatch('Labels provisioned', created);
  }
  if (removed.length > 0) {
    logBatch('Defaults removed', removed);
  }
  if (created.length === 0 && removed.length === 0) {
    logTerse('[+] Labels up to date');
  }
}

// ============================================================================
// Label Resolution
// ============================================================================

/**
 * Parse an issue title and return matching label names.
 *
 * Title format: `[system] type(scope): description`
 * - `[hooks]` -> `system/hooks`
 * - `feat(session-start):` -> `type/feat`
 * - Always includes `lifecycle/triage`
 */
export function getLabelsForTitle(title: string): string[] {
  const labels: string[] = [];

  // Extract [system] prefix
  const systemMatch = title.match(/^\[([^\]]+)\]/);
  if (systemMatch) {
    labels.push(`system/${systemMatch[1]}`);
  }

  // Extract type from conventional commit pattern
  const typeMatch = title.match(/(?:^\[.*?\]\s*)?(\w+)\(/);
  if (typeMatch) {
    labels.push(`type/${typeMatch[1]}`);
  }

  // Always add triage
  labels.push('lifecycle/triage');

  return labels;
}

/**
 * Return the source label for a given issue origin.
 */
export function getLabelsForSource(
  source: 'correction-ledger' | 'escalation' | 'openspec' | 'manual'
): string {
  return `source/${source}`;
}
