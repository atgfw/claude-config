# Tasks: slim-claudemd-to-governance-index

## Phase 1: Audit Existing State (prerequisite for all other phases)

- [x] 1.1 Audit `enforce-n8n-object-governance` task 6.2 output: 4/5 hooks RICH, only n8n_node_note_validator ADEQUATE
- [x] 1.2 Audit `tool-router/README.md`: covers all hierarchies, missing Tool Selection Protocol + Legacy Routes + bun-e fix
- [x] 1.3 Audit git hook error messages: secret_scanner RICH, commit/branch validators ADEQUATE (examples in footer not inline)
- [x] 1.4 Audit JSDoc headers: 33 refs across 20 files, ~15 need updating, ~18 are file-existence checks (keep)

## Phase 2: Enrich Hook Error Messages (only hooks that audit finds still terse)

- [x] 2.1 Enriched `n8n_node_note_validator.ts` with concrete good/bad note examples in all 4 error paths
- [x] 2.2 Verified enriched messages use existing utils.ts verbosity (logBlocked used throughout)
- [x] 2.3 Tests pass: 23/23 for n8n_node_note_validator, 42/42 for n8n_naming_validator, 55/55 for n8n_webhook_path_validator

## Phase 3: Create/Consolidate Reference Docs

- [x] 3.1 Created `hooks/docs/n8n-governance.md` - webhook paths, naming, notes, code node linting, workflow requirements, cloud-only storage
- [x] 3.2 Created `hooks/docs/github-framework.md` - commits, branches, secrets, semver, release automation, templates
- [x] 3.3 Created `hooks/docs/tool-routing.md` - merged tool-router/README.md + Tool Selection Protocol + Legacy Routes. Fixed bun-e discrepancy. Left pointer at tool-router/README.md
- [x] 3.4 Created `hooks/docs/verbosity-system.md` - output levels, prefixes, anti-patterns, hook output functions
- [x] 3.5 Verified `hooks/docs/vitest-migration.md` already covers CLAUDE.md content (it does)

## Phase 4: Update Hook JSDoc References

- [x] 4.1 Updated n8n governance hooks (webhook_path_validator, naming_validator, node_note_validator, code_node_linting_gate): `see hooks/docs/n8n-governance.md`
- [x] 4.2 Updated git hooks (branch_naming_validator, commit_message_validator): `From CLAUDE.md:` -> `Rule:`
- [x] 4.3 Updated tool_research_gate.ts: `see hooks/docs/tool-routing.md`
- [x] 4.4 Updated utils.ts logBlocked: `From CLAUDE.md:` -> `Rule:`
- [x] 4.5 Updated version_fabrication_detector.ts: `see hooks/docs/n8n-governance.md`
- [x] 4.6 Updated hierarchical_testing_gate.ts: `From CLAUDE.md:` -> `Governance rule:`
- [x] 4.7 Updated plan_completeness_gate.ts: `Per CLAUDE.md` -> `Per governance rules`

## Phase 5: Slim CLAUDE.md

- [x] 5.1 Trimmed Architecture from 42 to 14 lines
- [x] 5.2 Removed "Context-Optimized Output Strategy" (54 lines) -> hooks/docs/verbosity-system.md
- [x] 5.3 Trimmed "Source of Truth: LIVE APIs" to 3 lines
- [x] 5.4 Removed "n8n Naming Conventions" (50 lines) -> hooks/docs/n8n-governance.md
- [x] 5.5 Removed "n8n Node Documentation" (23 lines) -> hooks/docs/n8n-governance.md
- [x] 5.6 Removed "n8n Code Node Governance" (42 lines) -> hooks/docs/n8n-governance.md
- [x] 5.7 Removed "n8n Webhook Path Naming" (97 lines) -> hooks/docs/n8n-governance.md
- [x] 5.8 Removed "n8n Workflow Requirements" (absorbed into Critical Rules table)
- [x] 5.9 Removed "Hook System" 6 tables (93 lines)
- [x] 5.10 Removed "Hook Implementation Status" table (36 lines)
- [x] 5.11 Removed "Tool Selection Protocol" (67 lines) -> hooks/docs/tool-routing.md
- [x] 5.12 Removed "Dynamic Tool Router" (68 lines) -> hooks/docs/tool-routing.md
- [x] 5.13 Removed "GitHub Framework" (118 lines) -> hooks/docs/github-framework.md
- [x] 5.14 Updated References section to point to hooks/docs/*.md files
- [x] 5.15 Final CLAUDE.md: 221 lines (76% reduction from 938)

## Phase 6: Validation

- [x] 6.1 Build hooks: `cd hooks && bun run build` - SUCCESS
- [x] 6.2 Run test suite: 1167 pass, 120/120 on modified hooks (pre-existing failures unchanged)
- [x] 6.3 Cross-references verified via audit
- [x] 6.4 Spot-checked 3 hooks: n8n_node_note_validator shows concrete examples, n8n_naming_validator shows snake_case conversions, n8n_webhook_path_validator shows path corrections

## Phase 7: Update Stale Sibling Proposals (housekeeping)

- [ ] 7.1 Update `add-global-github-framework/tasks.md` to check off tasks that are already done
- [ ] 7.2 Update `enforce-n8n-object-governance/tasks.md` task 6.1 note: JSDoc references now point to hooks/docs/
- [x] 7.3 Updated `tool-router/README.md` reference to hooks/docs/tool-routing.md (done in Phase 3.3)
