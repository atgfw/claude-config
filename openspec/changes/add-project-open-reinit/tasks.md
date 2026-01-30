## 1. Git Synchronization Module

- [ ] 1.1 Create `hooks/src/git/git_sync.ts` with GitSyncResult interface
- [ ] 1.2 Implement `fetchRemote()` function with timeout handling
- [ ] 1.3 Implement `detectConflicts()` function comparing local vs remote
- [ ] 1.4 Implement `getOverwriteWarning()` to generate detailed conflict report
- [ ] 1.5 Implement `autoPull()` for clean working tree scenarios
- [ ] 1.6 Write tests in `hooks/tests/git-sync.test.ts`

## 2. Project Cleanup Module

- [ ] 2.1 Create `hooks/src/cleanup/project_cleaner.ts`
- [ ] 2.2 Define cleanup patterns with age thresholds
- [ ] 2.3 Implement `identifyStaleFiles()` function
- [ ] 2.4 Implement `moveToOld()` function (never delete)
- [ ] 2.5 Implement audit logging for moved files
- [ ] 2.6 Write tests in `hooks/tests/project-cleaner.test.ts`

## 3. Documentation Drift Detection

- [ ] 3.1 Create `hooks/src/governance/doc_drift_detector.ts`
- [ ] 3.2 Define key documentation rules to validate
- [ ] 3.3 Implement CLAUDE.md validation against hook implementations
- [ ] 3.4 Implement README structure validation
- [ ] 3.5 Write tests in `hooks/tests/doc-drift-detector.test.ts`

## 4. Child Project Governance

- [ ] 4.1 Create `hooks/src/governance/child_project_validator.ts`
- [ ] 4.2 Implement detection for prohibited files (.mcp.json, hooks/, settings.json, .env)
- [ ] 4.3 Implement clear error messages with remediation steps
- [ ] 4.4 Write tests in `hooks/tests/child-project-validator.test.ts`

## 5. Hook Compilation Validator

- [ ] 5.1 Create `hooks/src/governance/hook_compilation_validator.ts`
- [ ] 5.2 Implement timestamp comparison (source vs dist)
- [ ] 5.3 Implement self-heal via `bun run build`
- [ ] 5.4 Write tests in `hooks/tests/hook-compilation-validator.test.ts`

## 6. Integration into Session Start

- [ ] 6.1 Import new modules into `session_start.ts`
- [ ] 6.2 Add Step: Git Synchronization (after environment setup)
- [ ] 6.3 Add Step: Project Cleanup (after git sync)
- [ ] 6.4 Add Step: Documentation Drift Check (after cleanup)
- [ ] 6.5 Add Step: Child Project Governance (early, can block)
- [ ] 6.6 Add Step: Hook Compilation Check (early, can self-heal)
- [ ] 6.7 Update session_start.test.ts with new test cases

## 7. Configuration

- [ ] 7.1 Add configuration options to settings.json
- [ ] 7.2 Support enabling/disabling individual checks
- [ ] 7.3 Support customizing cleanup patterns
- [ ] 7.4 Document configuration in CLAUDE.md

## 8. Validation

- [ ] 8.1 Run full test suite
- [ ] 8.2 Test on real project with dirty working tree
- [ ] 8.3 Test governance blocking behavior
- [ ] 8.4 Test self-heal scenarios
- [ ] 8.5 Update CLAUDE.md with new hook documentation
