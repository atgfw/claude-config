const fs = require("fs");
const path = "C:\\Users\\codya\\.claude\\ledger\\issue-sync-registry.json";
const data = JSON.parse(fs.readFileSync(path, "utf8"));

// Group entries by github_issue
const byIssue = {};
data.entries.forEach((entry, idx) => {
  const issue = entry.github_issue;
  if (!byIssue[issue]) byIssue[issue] = [];
  byIssue[issue].push({ idx, entry });
});

// Find duplicates
const duplicates = Object.entries(byIssue).filter(
  ([_, entries]) => entries.length > 1,
);

console.log("Duplicates found by issue number:");
duplicates.forEach(([issue, entries]) => {
  console.log(`Issue ${issue}: ${entries.length} entries`);
  entries.forEach(({ idx, entry }) => {
    console.log(`  [idx ${idx}] ${entry.last_synced}`);
  });
});

console.log(`\nTotal duplicate issue numbers: ${duplicates.length}`);

// Mark which ones to keep (most recent)
const toRemoveIndices = new Set();
duplicates.forEach(([issue, entries]) => {
  // Sort by last_synced descending
  const sorted = entries.sort(
    (a, b) => new Date(b.entry.last_synced) - new Date(a.entry.last_synced),
  );
  // Keep first, remove rest
  for (let i = 1; i < sorted.length; i++) {
    toRemoveIndices.add(sorted[i].idx);
  }
});

console.log(`Entries to remove: ${toRemoveIndices.size}`);
console.log(
  "Indices:",
  Array.from(toRemoveIndices).sort((a, b) => a - b),
);

// Filter and write back
const cleanedEntries = data.entries.filter(
  (_, idx) => !toRemoveIndices.has(idx),
);
const result = {
  version: data.version,
  entries: cleanedEntries,
};

fs.writeFileSync(path, JSON.stringify(result, null, 2));
console.log(
  `\nDone. Wrote ${cleanedEntries.length} entries (removed ${toRemoveIndices.size}).`,
);
