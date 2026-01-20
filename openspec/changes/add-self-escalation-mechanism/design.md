# Design: Add Self-Escalation Mechanism

## System Architecture

Three-layer design:
1. **Utility Layer** - `escalate()` function for child projects/hooks
2. **Registry Layer** - Storage, indexing, pattern detection
3. **Output Layer** - Session-start reports, auto-proposals

## Data Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                      UTILITY LAYER                               │
│                                                                  │
│  Child Project          Hook                    Direct Call      │
│       │                  │                          │            │
│       ▼                  ▼                          ▼            │
│  escalate()       escalateFromHook()          escalate()         │
│       │                  │                          │            │
│       └──────────────────┼──────────────────────────┘            │
│                          │                                       │
│                          ▼                                       │
│               generateSymptomHash()                              │
│                          │                                       │
│                          ▼                                       │
│                  checkCooldown()                                 │
│                          │                                       │
└──────────────────────────┼───────────────────────────────────────┘
                           │
┌──────────────────────────▼───────────────────────────────────────┐
│                      REGISTRY LAYER                               │
│                                                                  │
│  ┌────────────────────────────────────────────────────────────┐ │
│  │                escalation-registry.json                     │ │
│  │  ┌─────────────┐  ┌──────────────┐  ┌─────────────────┐   │ │
│  │  │ escalations │  │ symptomIndex │  │  projectIndex   │   │ │
│  │  │ (entries)   │  │ (hash->ids)  │  │  (path->ids)    │   │ │
│  │  └─────────────┘  └──────────────┘  └─────────────────┘   │ │
│  └────────────────────────────────────────────────────────────┘ │
│                          │                                       │
│                          ▼                                       │
│              ┌─────────────────────┐                            │
│              │  Pattern Detector   │                            │
│              │  - detectPatterns() │                            │
│              │  - checkThreshold() │                            │
│              └──────────┬──────────┘                            │
│                         │                                        │
└─────────────────────────┼────────────────────────────────────────┘
                          │
┌─────────────────────────▼────────────────────────────────────────┐
│                      OUTPUT LAYER                                 │
│                                                                  │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ Session-Start   │  │ Auto-Proposal   │  │ Correction      │ │
│  │ Reporter        │  │ Generator       │  │ Linker          │ │
│  │ (Step 7)        │  │ (OpenSpec)      │  │ (Bidirectional) │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

## Symptom Hash Algorithm

The symptom hash enables deduplication across projects while being resilient to minor wording differences.

```typescript
function generateSymptomHash(symptom: string): string {
  // 1. Lowercase
  // 2. Remove punctuation
  // 3. Split into words
  // 4. Filter short words (<=2 chars)
  // 5. Sort alphabetically
  // 6. Join with spaces
  // 7. SHA-256 hash, take first 16 chars

  const normalized = symptom
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 2)
    .sort()
    .join(' ');

  return crypto.createHash('sha256')
    .update(normalized)
    .digest('hex')
    .substring(0, 16);
}
```

**Examples:**
```
"The file was not saved correctly" -> "correctly file saved" -> hash: "a1b2c3..."
"File was not saved correctly!"    -> "correctly file saved" -> hash: "a1b2c3..." (SAME)
"Saved file incorrectly"           -> "file incorrectly saved" -> hash: "d4e5f6..." (DIFFERENT)
```

## Pattern Detection Flow

1. New escalation recorded via `escalate()`
2. Symptom hash computed
3. Registry queried for matching hash
4. **If match found in SAME project:**
   - Check cooldown (30 min default)
   - If cooled down: increment `occurrenceCount`, update timestamp
   - If in cooldown AND severity < high: skip (deduplicate)
   - If in cooldown AND severity >= high: record anyway
5. **If match found in DIFFERENT project:**
   - Increment `crossProjectCount`
   - Add project to `relatedProjects` array
   - Update escalation entry
6. **If no match found:**
   - Create new entry with status `pending`
7. **Check thresholds:**
   - If `crossProjectCount >= crossProjectThreshold` (default: 2): pattern detected
   - OR if `occurrenceCount >= patternThreshold` (default: 3): pattern detected
8. **If pattern detected:**
   - Update status to `pattern-detected`
   - If `autoProposalEnabled`: trigger proposal generation

## Cooldown Enforcement

Prevents spam by rate-limiting repeated escalations:

```typescript
function checkCooldown(
  symptomHash: string,
  projectPath: string,
  severity: EscalationSeverity
): boolean {
  // High/critical severity always bypasses
  if (severity === 'high' || severity === 'critical') {
    return true; // Allow
  }

  const registry = loadEscalationRegistry();
  const existing = findBySymptomHashAndProject(registry, symptomHash, projectPath);

  if (!existing) return true; // First time, allow

  const now = new Date();
  const cooldownEnd = new Date(existing.cooldownUntil || 0);

  if (now < cooldownEnd) {
    return false; // Still in cooldown, block
  }

  return true; // Cooldown expired, allow
}
```

## Auto-Proposal Template

When threshold is met, generate at: `openspec/changes/auto-{slug}/`

**Directory structure:**
```
openspec/changes/auto-{slug}/
  proposal.md      # Auto-generated
  tasks.md         # Empty template
  design.md        # Empty (to be filled)
  specs/
    auto-{slug}/
      spec.md      # Generated requirements
```

**proposal.md content:**
```markdown
# Proposal: {Title from first escalation symptom}

**Change ID:** `auto-{slug}`
**Status:** Auto-Generated from Escalations
**Created:** {timestamp}
**Source Escalations:** {count}

## Summary

This proposal was automatically generated when escalation pattern threshold was met.

## Problem Statement

{Aggregated from escalation symptoms - deduplicated}

## Affected Projects

{List of projects from relatedProjects}

## Proposed Solutions

{Aggregated from escalation proposedSolution fields}

## Escalation Evidence

| ID | Project | Severity | Occurrences | First Reported |
|----|---------|----------|-------------|----------------|
{Table rows from source escalations}

## Next Steps

1. Review aggregated escalation data
2. Design hook to prevent recurrence
3. Implement with TDD
4. Mark source escalations as resolved
```

## Session-Start Integration

Add Step 7 to session-start hook:

```typescript
async function checkEscalations(): Promise<{
  issues: string[];
  successes: string[];
}> {
  const issues: string[] = [];
  const successes: string[] = [];

  log('Step 7: Escalation Status');
  log('-'.repeat(30));

  const registry = loadEscalationRegistry();
  const pending = getPendingEscalations(registry);
  const patterns = getPatternDetectedEscalations(registry);
  const highPriority = getHighPriorityEscalations(registry);

  log(`Total escalations: ${Object.keys(registry.escalations).length}`);
  log(`Pending review: ${pending.length}`);
  log(`Patterns detected: ${patterns.length}`);
  log(`High priority: ${highPriority.length}`);

  if (patterns.length > 0) {
    issues.push(`${patterns.length} escalation patterns need OpenSpec proposals`);
    log('[ACTION] Patterns detected - proposals needed:');
    for (const esc of patterns.slice(0, 3)) {
      log(`  - ${esc.symptom.substring(0, 60)}...`);
    }
  }

  if (highPriority.length > 0) {
    log('[WARN] High priority escalations:');
    for (const esc of highPriority.slice(0, 3)) {
      log(`  - [${esc.severity.toUpperCase()}] ${esc.symptom.substring(0, 50)}...`);
    }
  }

  if (pending.length === 0 && patterns.length === 0) {
    successes.push('No pending escalations');
  }

  return { issues, successes };
}
```

## Correction Ledger Bidirectional Link

When correction recorded:
1. Compute `symptomHash` of correction's symptom
2. Query escalation registry for matching hash
3. If found: add correction ID to `relatedCorrectionIds`
4. If `hookImplemented` is true: update escalation status to `hook-implemented`

When escalation created:
1. Query correction ledger for similar symptoms
2. If found: add correction IDs to `relatedCorrectionIds`
3. Use corrections as historical evidence

## Priority Calculation

Weighted severity scoring for escalation prioritization:

```typescript
function calculatePriority(
  escalation: EscalationEntry,
  config: EscalationConfig
): number {
  const severityWeight = config.severityWeights[escalation.severity] || 1;
  const occurrenceBonus = Math.min(escalation.occurrenceCount, 10);
  const projectBonus = escalation.crossProjectCount * 3;
  const ageBonus = getAgeDays(escalation.timestamp) > 7 ? 2 : 0;

  return severityWeight * 10 + occurrenceBonus + projectBonus + ageBonus;
}

// Default weights:
// critical: 10, high: 5, medium: 2, low: 1
```

## Error Handling

- Registry file missing: Create with defaults
- Registry parse error: Log warning, use empty registry
- Write failure: Log error, do not crash
- Hash collision: Extremely unlikely (16 chars of SHA-256), handled by comparing full symptom
