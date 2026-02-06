# Tasks: slim-claudemd-to-governance-index

## Phase 1: Enrich Hook Error Messages (prerequisite - must complete before trimming CLAUDE.md)

- [ ] 1.1 Enrich `n8n_webhook_path_validator.ts` block messages with valid/invalid examples (e.g., "Path 'customer_sync' not kebab-case. Use 'customer-sync'")
- [ ] 1.2 Enrich `n8n_naming_validator.ts` block messages with wrong/correct examples (e.g., "Node 'GetCustomerData' not snake_case. Use 'get_customer_data'")
- [ ] 1.3 Enrich `n8n_node_note_validator.ts` block messages with good/bad note examples
- [ ] 1.4 Enrich `code_node_linting_gate.ts` block messages with n8n-specific exception guidance
- [ ] 1.5 Enrich `tool_research_gate.ts` block messages with required TOOL-RESEARCH.md sections
- [ ] 1.6 Enrich `branch_naming_validator.ts` block messages with allowed prefix examples
- [ ] 1.7 Enrich `commit_message_validator.ts` block messages with conventional commit format example
- [ ] 1.8 Enrich `secret_scanner.ts` block messages with pattern-specific guidance
- [ ] 1.9 Enrich `vitest_migration_enforcer.ts` block messages with migration pointer
- [ ] 1.10 Enrich `inline_script_validator.ts` block messages (already good - verify, extend if needed)
- [ ] 1.11 Verify all enriched messages respect terse/normal/verbose verbosity levels via utils.ts
- [ ] 1.12 Run existing tests for all modified hooks - all must pass

## Phase 2: Create Reference Docs in hooks/docs/

- [ ] 2.1 Create `hooks/docs/n8n-governance.md` consolidating webhook paths, naming, notes, linting, code node rules
- [ ] 2.2 Create `hooks/docs/github-framework.md` consolidating commit conventions, branch naming, secret scanning, semver, release automation
- [ ] 2.3 Create `hooks/docs/tool-routing.md` consolidating tool priority hierarchies, framework exceptions, legacy routes
- [ ] 2.4 Create `hooks/docs/verbosity-system.md` consolidating output levels, prefix meanings, anti-patterns, hook output functions
- [ ] 2.5 Update existing `hooks/docs/vitest-migration.md` if any content from CLAUDE.md is missing from it

## Phase 3: Slim CLAUDE.md

- [ ] 3.1 Trim Architecture section from 42 to ~20 lines (remove file-level detail, keep directory tree)
- [ ] 3.2 Remove "Context-Optimized Output Strategy" section (54 lines) - replaced by hooks/docs/verbosity-system.md
- [ ] 3.3 Trim "Source of Truth: LIVE APIs" to rule statement + hook refs only (~8 lines)
- [ ] 3.4 Remove "n8n Naming Conventions" section (50 lines) - enforced by hook, documented in hooks/docs/n8n-governance.md
- [ ] 3.5 Remove "n8n Node Documentation" section (23 lines) - enforced by hook, documented in hooks/docs/n8n-governance.md
- [ ] 3.6 Remove "n8n Code Node Governance" section (42 lines) - enforced by hook, documented in hooks/docs/n8n-governance.md
- [ ] 3.7 Remove "n8n Webhook Path Naming" section (97 lines) - enforced by hook, documented in hooks/docs/n8n-governance.md
- [ ] 3.8 Trim "n8n Workflow Requirements" to 5-line summary with hook refs
- [ ] 3.9 Remove "Hook System" 6 tables section (93 lines) - settings.json is authoritative, source files are self-documenting
- [ ] 3.10 Remove "Hook Implementation Status" table (36 lines) - stale maintenance burden
- [ ] 3.11 Remove "Tool Selection Protocol" section (67 lines) - enforced by hook, documented in hooks/docs/tool-routing.md (keep 1-line in Critical Rules)
- [ ] 3.12 Remove "Dynamic Tool Router" section (68 lines) - replaced by hooks/docs/tool-routing.md + tool-router.json
- [ ] 3.13 Remove "GitHub Framework" section (118 lines) - enforced by git hooks, documented in hooks/docs/github-framework.md
- [ ] 3.14 Update References section to point to new hooks/docs/*.md files
- [ ] 3.15 Verify final CLAUDE.md is ~280-300 lines

## Phase 4: Validation

- [ ] 4.1 Build hooks: `cd hooks && bun run build` - must succeed
- [ ] 4.2 Run full test suite: `cd hooks && bun test` - all tests must pass
- [ ] 4.3 Verify no broken cross-references between CLAUDE.md and hook source comments
- [ ] 4.4 Spot-check 3 hooks: trigger a block and verify the error message is actionable with examples

## Dependencies

- Phase 2 and Phase 1 can run in parallel
- Phase 3 depends on Phase 1 (hooks must be self-documenting BEFORE removing CLAUDE.md content)
- Phase 3 depends on Phase 2 (reference docs must exist BEFORE removing CLAUDE.md content)
- Phase 4 depends on all previous phases
