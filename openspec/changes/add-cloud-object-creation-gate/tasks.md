# Tasks: Add Cloud Object Creation Gate

## Implementation Order

- [ ] 1. Write test file `hooks/tests/governance/cloud_object_creation_gate.test.ts` with tests covering all 7 requirements (TDD - tests first)
- [ ] 2. Implement `hooks/src/governance/cloud_object_creation_gate.ts` with entity name extraction, PROJECT-DIRECTIVE walk-up, spec file check, test-run-registry check, local file check, and bypass mechanism
- [ ] 3. Register hook in `hooks/src/index.ts` (import and register)
- [ ] 4. Build hooks (`cd hooks && npm run build`)
- [ ] 5. Add PreToolUse entry to `settings.json` with matcher `mcp__n8n-mcp__n8n_create_workflow|mcp__n8n-mcp__n8n_update_workflow|mcp__elevenlabs__.*|mcp__servicetitan__.*` -- positioned BEFORE existing content-validation hooks
- [ ] 6. Run full test suite (`cd hooks && npm test`) and verify all pass
- [ ] 7. Manual smoke test: attempt `n8n_create_workflow` without PROJECT-DIRECTIVE.md and confirm block

## Dependencies

- Task 1 must complete before Task 2 (TDD)
- Tasks 3-5 can run in parallel after Task 2
- Task 6 depends on Tasks 3-5
- Task 7 depends on Task 6

## Parallelizable

- Tasks 3, 4, 5 are independent of each other
