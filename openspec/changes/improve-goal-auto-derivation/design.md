# Design: Smart Goal Field Extraction

## Current State

`extractFieldsFromDescription()` in `goal_auto_derivation.ts` uses simple regex:
```typescript
const patterns: Array<[keyof GoalFields, RegExp]> = [
  ['who', /\*{0,2}WHO\*{0,2}:\*{0,2}\s*(.+)$/im],
  // ... etc
];
```

This only works if the issue body explicitly contains `WHO:`, `WHAT:`, etc. Most GitHub issues don't follow this format.

## Proposed Extraction Strategy

### Layer 1: Explicit Field Markers (existing)
Keep current regex for issues that explicitly define fields.

### Layer 2: Semantic Section Parsing (new)
Map common markdown sections to goal fields:

| Markdown Section | Goal Field |
|------------------|------------|
| `## Problem`, `## Issue`, `## Bug` | what |
| `## Solution`, `## Fix`, `## Approach` | how |
| `## Files`, `## Location`, `## Affected` | where, which |
| `## Testing`, `## Validation`, `## Acceptance` | measuredBy |
| `## Risks`, `## Constraints`, `## Don't` | lest |
| `## Dependencies`, `## Requirements`, `## Stack` | with |

### Layer 3: Pattern Detection (new)
Scan full text for patterns:

| Pattern | Goal Field | Example |
|---------|------------|---------|
| File paths (`.ts`, `.js`, etc.) | which | `hooks/src/hooks/foo.ts` |
| URLs | where | `https://github.com/...` |
| "must not", "should not", "never" | lest | "must not break existing..." |
| Tool names | with | "using vitest", "with TypeScript" |
| Test-related words | measuredBy | "tests pass", "coverage", "validates" |

### Layer 4: Git Context Inference (new)
When issue body is sparse, infer from git:

```typescript
async function inferFromGitContext(sessionId: string): Promise<Partial<GoalFields>> {
  const branch = await getBranchName();
  const diff = await getGitDiff();
  const recentFiles = await getRecentlyModifiedFiles();

  return {
    which: recentFiles.slice(0, 3).join('; '),
    where: extractDirectories(recentFiles),
    measuredBy: hasTestFiles(recentFiles) ? 'Tests passing' : undefined,
    with: detectToolsFromFiles(recentFiles), // package.json, tsconfig, etc.
  };
}
```

### Layer 5: Pre-Push Validation (new)
Before pushing to goal stack, validate compliance:

```typescript
function pushGoalIfCompliant(sessionId: string, goal: GoalLevel): boolean {
  const result = validateGoalCompliance(goal);

  if (!result.compliant) {
    // Attempt to fill remaining gaps
    const enriched = enrichFromContext(goal, result.missing_required);
    const revalidate = validateGoalCompliance(enriched);

    if (!revalidate.compliant) {
      logWarn(`Goal derived with gaps: ${revalidate.missing_required.join(', ')}`);
    }
    pushGoal(sessionId, enriched);
    return revalidate.compliant;
  }

  pushGoal(sessionId, goal);
  return true;
}
```

## Files to Modify

| File | Changes |
|------|---------|
| `hooks/src/hooks/goal_auto_derivation.ts` | Add layers 2-5 |
| `hooks/src/session/goal_stack.ts` | Export `pushGoalIfCompliant()` wrapper |
| `hooks/tests/hooks/goal_auto_derivation.test.ts` | Add extraction test cases |

## Trade-offs

| Approach | Pro | Con |
|----------|-----|-----|
| Parse markdown sections | Works with common issue formats | May misparse unusual structures |
| Git context inference | Always available | May be stale if branch is old |
| Pre-push validation | Guarantees compliance | Adds latency to session start |

## Decision: Implement all layers with graceful degradation

Each layer fills gaps left by previous layers. If all fail, goal still pushed but with warning logged.
