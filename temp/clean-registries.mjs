/**
 * Registry cleanup script
 * 1. hygiene-audit-registry.json - Truncate to last 10 UNIQUE entries
 * 2. issue-sync-registry.json - Backfill github_repo, remove stale closed entries
 */
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

const LEDGER_DIR = resolve('C:/Users/codya/.claude/ledger');

// =============================================
// 1. Clean hygiene-audit-registry.json
// =============================================
function cleanHygieneAudit() {
  const filePath = resolve(LEDGER_DIR, 'hygiene-audit-registry.json');
  const raw = readFileSync(filePath, 'utf-8');
  const entries = JSON.parse(raw);

  console.log(`[hygiene-audit] Total entries before: ${entries.length}`);

  // Deduplicate by project + issue fingerprint
  // Keep the MOST RECENT entry per unique fingerprint
  const seen = new Map();

  for (const entry of entries) {
    const issueFingerprint = entry.issues
      .map(i => `${i.type}:${i.path}`)
      .sort()
      .join('|');
    const key = `${entry.project}::${issueFingerprint}`;

    const existing = seen.get(key);
    if (!existing || new Date(entry.timestamp) > new Date(existing.timestamp)) {
      seen.set(key, entry);
    }
  }

  // Get all unique entries, sort by timestamp descending, take last 10
  const unique = Array.from(seen.values())
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .slice(0, 10);

  // Sort back by timestamp ascending for the output
  unique.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  console.log(`[hygiene-audit] Unique fingerprints: ${seen.size}`);
  console.log(`[hygiene-audit] Entries after (last 10 unique): ${unique.length}`);

  writeFileSync(filePath, JSON.stringify(unique, null, 2) + '\n', 'utf-8');
  console.log(`[hygiene-audit] Written to ${filePath}`);
}

// =============================================
// 2. Clean issue-sync-registry.json
// =============================================
function cleanIssueSync() {
  const filePath = resolve(LEDGER_DIR, 'issue-sync-registry.json');
  const raw = readFileSync(filePath, 'utf-8');
  const data = JSON.parse(raw);

  console.log(`[issue-sync] Version: ${data.version}`);
  console.log(`[issue-sync] Total entries before: ${data.entries.length}`);

  const now = new Date(2026, 1, 6); // Feb 6, 2026
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;

  let backfilledCount = 0;
  let removedCount = 0;

  const cleaned = [];

  for (const entry of data.entries) {
    // Backfill github_repo with null if missing
    if (!('github_repo' in entry)) {
      entry.github_repo = null;
      backfilledCount++;
    }

    // Check removal criteria for closed entries
    if (entry.status === 'closed') {
      const lastSynced = new Date(entry.last_synced);
      const ageMs = now - lastSynced;
      const olderThanThreshold = ageMs > thirtyDaysMs;

      if (olderThanThreshold) {
        // Check if it has any valuable data worth keeping
        const hasClaude = entry.claude_task_id != null;
        const hasOpenspec = entry.openspec_change_id != null;
        const hasPlan = entry.plan_file != null;
        const hasChecklist = Array.isArray(entry.checklist_items) && entry.checklist_items.length > 0;

        if (!hasClaude && !hasOpenspec && !hasPlan && !hasChecklist) {
          removedCount++;
          continue; // Skip this entry
        }
      }
    }

    cleaned.push(entry);
  }

  console.log(`[issue-sync] Backfilled github_repo: ${backfilledCount}`);
  console.log(`[issue-sync] Removed stale closed: ${removedCount}`);
  console.log(`[issue-sync] Entries after: ${cleaned.length}`);

  const output = {
    version: data.version,
    entries: cleaned
  };

  writeFileSync(filePath, JSON.stringify(output, null, 2) + '\n', 'utf-8');
  console.log(`[issue-sync] Written to ${filePath}`);
}

// Run both
cleanHygieneAudit();
cleanIssueSync();
console.log('\nDone.');
