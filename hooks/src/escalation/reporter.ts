/**
 * Escalation Reporter
 *
 * Generates reports for session-start and other contexts.
 * Formats escalation data for LLM visibility.
 */

import { log } from '../utils.js';
import {
  loadRegistry,
  getPendingEscalations,
  getPatternDetectedEscalations,
  getHighPriorityEscalations,
  getStats,
  getByPriority,
} from '../ledger/escalation_registry.js';
import type { EscalationRegistry, EscalationEntry } from '../types.js';

// ============================================================================
// Report Generation
// ============================================================================

export interface EscalationReport {
  totalEscalations: number;
  pendingCount: number;
  patternsDetectedCount: number;
  highPriorityCount: number;
  actionNeeded: boolean;
  issues: string[];
  successes: string[];
  topItems: EscalationEntry[];
}

/**
 * Generate a full escalation report for session-start
 */
export function generateEscalationReport(registry?: EscalationRegistry): EscalationReport {
  const reg = registry ?? loadRegistry();
  const stats = getStats(reg);
  const pending = getPendingEscalations(reg);
  const patterns = getPatternDetectedEscalations(reg);
  const highPriority = getHighPriorityEscalations(reg);
  const topItems = getByPriority(reg).slice(0, 5);

  const issues: string[] = [];
  const successes: string[] = [];

  if (patterns.length > 0) {
    issues.push(`${patterns.length} escalation pattern(s) need OpenSpec proposals`);
  }

  if (highPriority.length > 0) {
    issues.push(`${highPriority.length} high/critical priority escalation(s)`);
  }

  if (pending.length === 0 && patterns.length === 0 && highPriority.length === 0) {
    successes.push('No pending escalations');
  }

  return {
    totalEscalations: stats.total,
    pendingCount: stats.pending,
    patternsDetectedCount: stats.patternDetected,
    highPriorityCount: stats.highPriority,
    actionNeeded: patterns.length > 0 || highPriority.length > 0,
    issues,
    successes,
    topItems,
  };
}

/**
 * Format escalation report for session-start output
 */
export function formatForSessionStart(registry?: EscalationRegistry): {
  issues: string[];
  successes: string[];
} {
  const report = generateEscalationReport(registry);

  log('Step 7: Escalation Status');
  log('-'.repeat(30));
  log(`Total escalations: ${report.totalEscalations}`);
  log(`Pending review: ${report.pendingCount}`);
  log(`Patterns detected: ${report.patternsDetectedCount}`);
  log(`High priority: ${report.highPriorityCount}`);

  if (report.patternsDetectedCount > 0) {
    log('');
    log('[ACTION] Patterns detected - OpenSpec proposals needed:');
    for (const item of report.topItems.filter((e) => e.status === 'pattern-detected').slice(0, 3)) {
      log(`  - ${item.symptom.substring(0, 60)}...`);
    }
  }

  if (report.highPriorityCount > 0) {
    log('');
    log('[WARN] High priority escalations:');
    for (const item of report.topItems
      .filter((e) => e.severity === 'high' || e.severity === 'critical')
      .slice(0, 3)) {
      log(`  - [${item.severity.toUpperCase()}] ${item.symptom.substring(0, 50)}...`);
    }
  }

  log('');

  return {
    issues: report.issues,
    successes: report.successes,
  };
}

/**
 * Get actionable escalations for display
 */
export function getActionableForDisplay(
  limit: number = 5,
  registry?: EscalationRegistry
): EscalationEntry[] {
  const reg = registry ?? loadRegistry();
  return getByPriority(reg).slice(0, limit);
}

// ============================================================================
// Exports
// ============================================================================

export default {
  generateEscalationReport,
  formatForSessionStart,
  getActionableForDisplay,
};
