## 1. Analyze Current Extraction Gaps

- [ ] 1.1 Document which fields consistently fail compliance (Focus, Which, With, Lest, MeasuredBy)
- [ ] 1.2 Review `extractFieldsFromDescription()` regex patterns for weakness
- [ ] 1.3 Collect sample GitHub issue bodies to test extraction against

## 2. Enhance Field Extraction from GitHub Issues

- [ ] 2.1 Parse markdown headers (## Problem, ## Solution) into what/how fields
- [ ] 2.2 Extract file paths from code blocks and inline backticks into which/where fields
- [ ] 2.3 Extract "must not" / "should not" phrases into lest field
- [ ] 2.4 Extract acceptance criteria / success conditions into measuredBy field
- [ ] 2.5 Detect tool/framework mentions (TypeScript, vitest, bun) into with field

## 3. Infer Fields from Git Context

- [ ] 3.1 Parse branch name for semantic hints (feature/, bugfix/, chore/)
- [ ] 3.2 Scan git diff for modified file paths to populate which/where
- [ ] 3.3 Detect test file changes to infer measuredBy ("tests passing")
- [ ] 3.4 Use commit messages for additional context

## 4. Pre-Push Compliance Validation

- [ ] 4.1 Import `validateGoalCompliance()` from goal_compliance_gate
- [ ] 4.2 Before `pushGoal()`, validate derived goal
- [ ] 4.3 If non-compliant, attempt to fill remaining gaps from context
- [ ] 4.4 Log warning if goal pushed with < 100% compliance

## 5. Testing

- [ ] 5.1 Create test fixtures with sample GitHub issue bodies
- [ ] 5.2 Test extraction produces compliant goals (100% score)
- [ ] 5.3 Test git context inference fills which/where fields
- [ ] 5.4 Test pre-push validation catches placeholders

## 6. Validation

- [ ] 6.1 Run `bun test` for all hook tests
- [ ] 6.2 Manual test: checkout branch with issue reference, verify compliant goal
- [ ] 6.3 Verify `goal_compliance_gate` approves auto-derived goals
