# Tasks: Add Self-Escalation Mechanism

## Phase 1: Foundation

- [ ] Add `EscalationEntry`, `EscalationRegistry`, and related types to `types.ts`
- [ ] Create `escalation_registry.ts` with CRUD operations
- [ ] Create empty `ledger/escalation-registry.json` with default config
- [ ] Write Vitest tests for `escalation_registry.ts`
- [ ] Verify tests pass

## Phase 2: Escalation Utility

- [ ] Create `escalate.ts` with `escalate()` and `escalateFromHook()`
- [ ] Implement `generateSymptomHash()` (normalize + SHA-256)
- [ ] Implement `checkCooldown()` (30-min default)
- [ ] Implement `getProjectPath()` auto-detection
- [ ] Write Vitest tests for utility functions
- [ ] Verify tests pass

## Phase 3: Pattern Detection

- [ ] Create `pattern_detector.ts`
- [ ] Implement `detectPatterns()` - find recurring symptoms
- [ ] Implement `shouldTriggerProposal()` - threshold checking
- [ ] Implement `calculatePriority()` - weighted severity
- [ ] Implement `groupBySimilarity()` - cluster related escalations
- [ ] Write Vitest tests
- [ ] Verify tests pass

## Phase 4: Auto-Proposal Generator

- [ ] Create `proposal_generator.ts`
- [ ] Implement `scaffoldOpenSpecChange()` - create directory structure
- [ ] Implement `populateProposalMd()` - generate content from escalations
- [ ] Implement `generateSlug()` - create URL-safe slug from symptom
- [ ] Write Vitest tests
- [ ] Verify tests pass

## Phase 5: Hook Integration

- [ ] Create `escalation_trigger.ts` PostToolUse hook
- [ ] Create `prompt_escalation_detector.ts` UserPromptSubmit hook
- [ ] Register new hooks in `settings.json`
- [ ] Update `hooks/src/index.ts` exports
- [ ] Write hook tests
- [ ] Verify tests pass

## Phase 6: Session-Start Integration

- [ ] Create `src/escalation/reporter.ts`
- [ ] Implement `generateEscalationReport()` - format for session-start
- [ ] Implement `getActionableEscalations()` - filter by priority
- [ ] Modify `session_start.ts` to call escalation reporter (Step 7)
- [ ] Test session-start output

## Phase 7: Correction Ledger Integration

- [ ] Modify `correction_ledger.ts` to import escalation registry
- [ ] Add `linkToEscalation()` function
- [ ] Add cross-referencing in `recordCorrection()`
- [ ] Auto-update escalation status when hook implemented
- [ ] Write integration tests
- [ ] Verify tests pass

## Final Validation

- [ ] Run full test suite: `npm test`
- [ ] Manual test: Create escalation from child project
- [ ] Manual test: Verify pattern detection triggers
- [ ] Manual test: Verify OpenSpec proposal generated
- [ ] Manual test: Verify session-start reports escalations
