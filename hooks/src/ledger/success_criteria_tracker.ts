/**
 * Success Criteria Tracker
 *
 * Parses PROJECT-DIRECTIVE.md success criteria and tracks their verification status.
 * This ledger ensures that all measurable success criteria are verified before
 * a project phase can be considered complete.
 *
 * Part of the Spinal Cord governance system.
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

export interface SuccessCriterion {
  id: string;
  text: string;
  verified: boolean;
  verifiedAt?: string;
  verifiedBy?: string; // test name, manual verification, etc.
  evidence?: string; // link to test result, screenshot, etc.
}

export interface SuccessCriteriaStatus {
  projectRoot: string;
  lastParsed: string;
  criteria: SuccessCriterion[];
  totalCount: number;
  verifiedCount: number;
  percentComplete: number;
}

/**
 * Generate a stable ID for a criterion based on its text
 */
function generateCriterionId(text: string): string {
  // Simple hash based on text
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    const char = text.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return `criterion-${Math.abs(hash).toString(16).substring(0, 8)}`;
}

/**
 * Parse PROJECT-DIRECTIVE.md and extract success criteria
 */
export function parseSuccessCriteria(projectRoot: string): SuccessCriterion[] {
  const criteria: SuccessCriterion[] = [];
  const directivePath = path.join(projectRoot, 'PROJECT-DIRECTIVE.md');

  if (!fs.existsSync(directivePath)) {
    return criteria;
  }

  try {
    const content = fs.readFileSync(directivePath, 'utf-8');
    const lines = content.split('\n');

    let inSuccessCriteria = false;

    for (const line of lines) {
      // Detect success criteria section
      if (/^##\s*Success Criteria/i.test(line)) {
        inSuccessCriteria = true;
        continue;
      }

      // End of section
      if (inSuccessCriteria && /^##\s/.test(line)) {
        inSuccessCriteria = false;
        continue;
      }

      // Extract criteria with checkboxes
      if (inSuccessCriteria) {
        const checkedMatch = line.match(/^\s*-\s*\[x\]\s*(.+)/i);
        const uncheckedMatch = line.match(/^\s*-\s*\[\s*\]\s*(.+)/);

        if (checkedMatch && checkedMatch[1]) {
          const text = checkedMatch[1].trim();
          criteria.push({
            id: generateCriterionId(text),
            text,
            verified: true,
            verifiedAt: 'from PROJECT-DIRECTIVE.md',
          });
        } else if (uncheckedMatch && uncheckedMatch[1]) {
          const text = uncheckedMatch[1].trim();
          criteria.push({
            id: generateCriterionId(text),
            text,
            verified: false,
          });
        }
      }
    }
  } catch (e) {
    // Ignore parse errors
  }

  return criteria;
}

/**
 * Load success criteria status from ledger
 */
export function loadCriteriaStatus(projectRoot: string): SuccessCriteriaStatus | null {
  const ledgerPath = path.join(projectRoot, '.claude', 'ledger', 'success-criteria.json');

  if (!fs.existsSync(ledgerPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(ledgerPath, 'utf-8');
    return JSON.parse(content) as SuccessCriteriaStatus;
  } catch (e) {
    return null;
  }
}

/**
 * Save success criteria status to ledger
 */
export function saveCriteriaStatus(status: SuccessCriteriaStatus): void {
  const ledgerDir = path.join(status.projectRoot, '.claude', 'ledger');

  if (!fs.existsSync(ledgerDir)) {
    fs.mkdirSync(ledgerDir, { recursive: true });
  }

  const ledgerPath = path.join(ledgerDir, 'success-criteria.json');
  fs.writeFileSync(ledgerPath, JSON.stringify(status, null, 2));
}

/**
 * Update or create success criteria status for a project
 */
export function updateCriteriaStatus(projectRoot: string): SuccessCriteriaStatus {
  const criteria = parseSuccessCriteria(projectRoot);
  const existing = loadCriteriaStatus(projectRoot);

  // Merge with existing status (preserve verification info)
  if (existing) {
    for (const criterion of criteria) {
      const existingCriterion = existing.criteria.find((c) => c.id === criterion.id);
      if (existingCriterion && existingCriterion.verified) {
        criterion.verified = true;
        criterion.verifiedAt = existingCriterion.verifiedAt;
        criterion.verifiedBy = existingCriterion.verifiedBy;
        criterion.evidence = existingCriterion.evidence;
      }
    }
  }

  const verifiedCount = criteria.filter((c) => c.verified).length;

  const status: SuccessCriteriaStatus = {
    projectRoot,
    lastParsed: new Date().toISOString(),
    criteria,
    totalCount: criteria.length,
    verifiedCount,
    percentComplete:
      criteria.length > 0 ? Math.round((verifiedCount / criteria.length) * 100) : 100,
  };

  saveCriteriaStatus(status);
  return status;
}

/**
 * Mark a criterion as verified
 */
export function verifyCriterion(
  projectRoot: string,
  criterionIdOrText: string,
  verifiedBy: string,
  evidence?: string
): boolean {
  const status = updateCriteriaStatus(projectRoot);

  const criterion = status.criteria.find(
    (c) =>
      c.id === criterionIdOrText || c.text.toLowerCase().includes(criterionIdOrText.toLowerCase())
  );

  if (!criterion) {
    return false;
  }

  criterion.verified = true;
  criterion.verifiedAt = new Date().toISOString();
  criterion.verifiedBy = verifiedBy;
  criterion.evidence = evidence;

  status.verifiedCount = status.criteria.filter((c) => c.verified).length;
  status.percentComplete = Math.round((status.verifiedCount / status.totalCount) * 100);

  saveCriteriaStatus(status);
  return true;
}

/**
 * Get summary of unverified criteria for a project
 */
export function getUnverifiedCriteria(projectRoot: string): SuccessCriterion[] {
  const status = updateCriteriaStatus(projectRoot);
  return status.criteria.filter((c) => !c.verified);
}

/**
 * Check if all criteria are verified
 */
export function areAllCriteriaVerified(projectRoot: string): boolean {
  const status = updateCriteriaStatus(projectRoot);
  return status.percentComplete === 100;
}

/**
 * Format criteria status for logging
 */
export function formatCriteriaStatus(status: SuccessCriteriaStatus): string {
  const lines: string[] = [];

  lines.push(
    `Success Criteria: ${status.verifiedCount}/${status.totalCount} (${status.percentComplete}%)`
  );
  lines.push('');

  for (const criterion of status.criteria) {
    const checkbox = criterion.verified ? '[x]' : '[ ]';
    const text = criterion.text.substring(0, 70);
    lines.push(`  ${checkbox} ${text}${criterion.text.length > 70 ? '...' : ''}`);

    if (criterion.verified && criterion.verifiedBy) {
      lines.push(`      Verified by: ${criterion.verifiedBy}`);
    }
  }

  return lines.join('\n');
}
