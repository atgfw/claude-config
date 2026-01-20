/**
 * Correction Debt Ledger
 *
 * Tracks every human corrective action as technical debt.
 * The goal is zero corrections - every manual intervention should
 * result in a hook that prevents recurrence.
 *
 * "Every human corrective action represents a failure: a missing hook,
 * an incomplete rule, or a flawed enforcement mechanism."
 */

import * as fs from 'node:fs';
import * as path from 'node:path';
import * as crypto from 'node:crypto';
import { getClaudeDir, log } from '../utils.js';
import type { CorrectionEntry, CorrectionLedger } from '../types.js';
import {
  loadRegistry as loadEscalationRegistry,
  saveRegistry as saveEscalationRegistry,
  generateSymptomHash,
  findBySymptomHash,
  updateStatus as updateEscalationStatus,
  linkToCorrection,
} from './escalation_registry.js';

const LEDGER_FILE = 'correction-ledger.json';

/**
 * Get the ledger file path
 */
export function getLedgerPath(): string {
  return path.join(getClaudeDir(), 'ledger', LEDGER_FILE);
}

/**
 * Load the correction ledger
 */
export function loadLedger(): CorrectionLedger {
  const ledgerPath = getLedgerPath();

  if (fs.existsSync(ledgerPath)) {
    try {
      const content = fs.readFileSync(ledgerPath, 'utf-8');
      return JSON.parse(content) as CorrectionLedger;
    } catch {
      log('[WARN] Could not parse correction ledger, creating fresh');
    }
  }

  return {
    entries: [],
    lastUpdated: new Date().toISOString(),
  };
}

/**
 * Save the correction ledger
 */
export function saveLedger(ledger: CorrectionLedger): void {
  const ledgerPath = getLedgerPath();
  const ledgerDir = path.dirname(ledgerPath);

  fs.mkdirSync(ledgerDir, { recursive: true });
  ledger.lastUpdated = new Date().toISOString();
  fs.writeFileSync(ledgerPath, JSON.stringify(ledger, null, 2));
}

/**
 * Generate a unique ID for a correction entry
 */
function generateId(): string {
  return crypto.randomBytes(8).toString('hex');
}

/**
 * Record a new correction (human intervention)
 */
export function recordCorrection(
  symptom: string,
  rootCause: string,
  hookToPrevent: string
): CorrectionEntry {
  const ledger = loadLedger();

  const entry: CorrectionEntry = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    symptom,
    rootCause,
    hookToPrevent,
    hookImplemented: false,
    recurrenceCount: 0,
  };

  ledger.entries.push(entry);
  saveLedger(ledger);

  log(`[LEDGER] Recorded correction: ${symptom}`);
  log(`  Root cause: ${rootCause}`);
  log(`  Hook needed: ${hookToPrevent}`);

  // Cross-reference with escalation registry
  try {
    crossReferenceEscalations(entry.id, symptom);
  } catch (error) {
    // Don't fail correction recording due to escalation linking errors
    log(`[LEDGER-WARN] Could not link to escalations: ${(error as Error).message}`);
  }

  return entry;
}

/**
 * Cross-reference a correction with matching escalations
 */
function crossReferenceEscalations(correctionId: string, symptom: string): void {
  const symptomHash = generateSymptomHash(symptom);
  const registry = loadEscalationRegistry();
  const matchingEscalations = findBySymptomHash(registry, symptomHash);

  if (matchingEscalations.length > 0) {
    log(`[LEDGER] Found ${matchingEscalations.length} matching escalation(s)`);

    for (const escalation of matchingEscalations) {
      // Link escalation to this correction
      linkToCorrection(registry, escalation.id, correctionId);
      log(`  Linked to escalation: ${escalation.id.substring(0, 8)}`);
    }

    saveEscalationRegistry(registry);
  }
}

/**
 * Mark a correction as having its hook implemented
 */
export function markHookImplemented(correctionId: string, hookName?: string): void {
  const ledger = loadLedger();
  const entry = ledger.entries.find((e) => e.id === correctionId);

  if (entry) {
    entry.hookImplemented = true;
    saveLedger(ledger);
    log(`[LEDGER] Marked hook implemented for: ${entry.symptom}`);

    // Update linked escalations to hook-implemented status
    try {
      updateLinkedEscalations(entry.symptom, hookName ?? entry.hookToPrevent);
    } catch (error) {
      // Don't fail due to escalation update errors
      log(`[LEDGER-WARN] Could not update escalations: ${(error as Error).message}`);
    }
  }
}

/**
 * Update escalations linked to a correction when hook is implemented
 */
function updateLinkedEscalations(symptom: string, hookName: string): void {
  const symptomHash = generateSymptomHash(symptom);
  const registry = loadEscalationRegistry();
  const matchingEscalations = findBySymptomHash(registry, symptomHash);

  if (matchingEscalations.length > 0) {
    log(`[LEDGER] Updating ${matchingEscalations.length} linked escalation(s) to hook-implemented`);

    for (const escalation of matchingEscalations) {
      updateEscalationStatus(registry, escalation.id, 'hook-implemented', {
        implementedHookName: hookName,
      });
      log(`  Updated escalation: ${escalation.id.substring(0, 8)}`);
    }

    saveEscalationRegistry(registry);
  }
}

/**
 * Record a recurrence of a previous correction
 */
export function recordRecurrence(correctionId: string): void {
  const ledger = loadLedger();
  const entry = ledger.entries.find((e) => e.id === correctionId);

  if (entry) {
    entry.recurrenceCount += 1;
    entry.lastRecurrence = new Date().toISOString();
    saveLedger(ledger);

    log(`[LEDGER] RECURRENCE DETECTED: ${entry.symptom}`);
    log(`  Recurrence count: ${entry.recurrenceCount}`);
    log(`  Hook implemented: ${entry.hookImplemented ? 'YES' : 'NO'}`);

    if (entry.hookImplemented) {
      log(`  [CRITICAL] Hook exists but did not prevent recurrence!`);
    } else {
      log(`  [ACTION REQUIRED] Implement hook: ${entry.hookToPrevent}`);
    }
  }
}

/**
 * Find similar corrections (potential recurrences)
 */
export function findSimilarCorrections(symptom: string): CorrectionEntry[] {
  const ledger = loadLedger();
  const lowerSymptom = symptom.toLowerCase();

  return ledger.entries.filter((entry) => {
    const lowerEntry = entry.symptom.toLowerCase();
    // Simple word overlap check
    const symptomWords = lowerSymptom.split(/\s+/);
    const entryWords = lowerEntry.split(/\s+/);
    const overlap = symptomWords.filter((w) => entryWords.includes(w));
    return overlap.length >= 2; // At least 2 words in common
  });
}

/**
 * Get unresolved corrections (no hook implemented)
 */
export function getUnresolvedCorrections(): CorrectionEntry[] {
  const ledger = loadLedger();
  return ledger.entries.filter((e) => !e.hookImplemented);
}

/**
 * Get corrections with recurrences
 */
export function getRecurringCorrections(): CorrectionEntry[] {
  const ledger = loadLedger();
  return ledger.entries.filter((e) => e.recurrenceCount > 0);
}

/**
 * Get correction statistics
 */
export function getStats(): {
  total: number;
  resolved: number;
  unresolved: number;
  recurring: number;
  totalRecurrences: number;
} {
  const ledger = loadLedger();
  const resolved = ledger.entries.filter((e) => e.hookImplemented).length;
  const recurring = ledger.entries.filter((e) => e.recurrenceCount > 0);
  const totalRecurrences = recurring.reduce((sum, e) => sum + e.recurrenceCount, 0);

  return {
    total: ledger.entries.length,
    resolved,
    unresolved: ledger.entries.length - resolved,
    recurring: recurring.length,
    totalRecurrences,
  };
}

/**
 * Generate a report of the correction ledger
 */
export function generateReport(): string {
  const stats = getStats();
  const unresolved = getUnresolvedCorrections();
  const recurring = getRecurringCorrections();

  let report = `CORRECTION DEBT LEDGER REPORT\n`;
  report += `${'='.repeat(50)}\n\n`;

  report += `STATISTICS\n`;
  report += `-----------\n`;
  report += `Total corrections recorded: ${stats.total}\n`;
  report += `Hooks implemented: ${stats.resolved}\n`;
  report += `Unresolved (no hook): ${stats.unresolved}\n`;
  report += `Corrections with recurrences: ${stats.recurring}\n`;
  report += `Total recurrence count: ${stats.totalRecurrences}\n\n`;

  if (unresolved.length > 0) {
    report += `UNRESOLVED CORRECTIONS (Action Required)\n`;
    report += `----------------------------------------\n`;
    for (const entry of unresolved) {
      report += `\n[${entry.id}] ${entry.symptom}\n`;
      report += `  Root cause: ${entry.rootCause}\n`;
      report += `  Hook needed: ${entry.hookToPrevent}\n`;
      report += `  Recorded: ${entry.timestamp}\n`;
      if (entry.recurrenceCount > 0) {
        report += `  RECURRENCES: ${entry.recurrenceCount}\n`;
      }
    }
    report += `\n`;
  }

  if (recurring.length > 0) {
    report += `RECURRING ISSUES (Priority Fix)\n`;
    report += `-------------------------------\n`;
    for (const entry of recurring.sort((a, b) => b.recurrenceCount - a.recurrenceCount)) {
      report += `\n[${entry.recurrenceCount}x] ${entry.symptom}\n`;
      report += `  Hook implemented: ${entry.hookImplemented ? 'YES' : 'NO'}\n`;
      report += `  Last recurrence: ${entry.lastRecurrence ?? 'N/A'}\n`;
    }
  }

  return report;
}

/**
 * CLI command to interact with the ledger
 */
export async function ledgerCommand(args: string[]): Promise<void> {
  const command = args[0];

  switch (command) {
    case 'report':
      console.log(generateReport());
      break;

    case 'add':
      if (args.length < 4) {
        console.log('Usage: ledger add "<symptom>" "<root_cause>" "<hook_to_prevent>"');
        break;
      }
      recordCorrection(args[1] ?? '', args[2] ?? '', args[3] ?? '');
      break;

    case 'resolve':
      if (args.length < 2) {
        console.log('Usage: ledger resolve <correction_id>');
        break;
      }
      markHookImplemented(args[1] ?? '');
      break;

    case 'recur':
      if (args.length < 2) {
        console.log('Usage: ledger recur <correction_id>');
        break;
      }
      recordRecurrence(args[1] ?? '');
      break;

    case 'stats':
      console.log(JSON.stringify(getStats(), null, 2));
      break;

    default:
      console.log('Correction Debt Ledger Commands:');
      console.log('  report  - Generate full report');
      console.log('  add     - Record a new correction');
      console.log('  resolve - Mark hook as implemented');
      console.log('  recur   - Record a recurrence');
      console.log('  stats   - Show statistics');
  }
}

export default {
  loadLedger,
  saveLedger,
  recordCorrection,
  markHookImplemented,
  recordRecurrence,
  findSimilarCorrections,
  getUnresolvedCorrections,
  getRecurringCorrections,
  getStats,
  generateReport,
  ledgerCommand,
};
