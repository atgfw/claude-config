# Tasks: slim-claudemd-to-governance-index

## Phase 1: Audit Existing State (prerequisite for all other phases)

- [ ] 1.1 Audit `enforce-n8n-object-governance` task 6.2 output: read each n8n governance hook's current error messages and catalog which already have rich examples vs. which are still terse
- [ ] 1.2 Audit `tool-router/README.md` (187 lines): determine what CLAUDE.md "Dynamic Tool Router" and "Tool Selection Protocol" content is ALREADY covered vs. what needs merging
- [ ] 1.3 Audit git hook error messages (`secret_scanner.ts`, `commit_message_validator.ts`, `branch_naming_validator.ts`): catalog which already show format examples on block/warn
- [ ] 1.4 Audit JSDoc headers in n8n governance hooks: which reference `CLAUDE.md` sections that will be removed?

## Phase 2: Enrich Hook Error Messages (only hooks that audit finds still terse)

- [ ] 2.1 Enrich terse-only hooks identified in 1.1/1.3 with valid/invalid examples in block messages
- [ ] 2.2 Verify all enriched messages respect terse/normal/verbose verbosity levels via utils.ts
- [ ] 2.3 Run existing tests for all modified hooks - all must pass

## Phase 3: Create/Consolidate Reference Docs

- [ ] 3.1 Create `hooks/docs/n8n-governance.md` consolidating: webhook paths, naming conventions, node notes, code node linting rules (content from CLAUDE.md sections + existing JSDoc headers)
- [ ] 3.2 Create `hooks/docs/github-framework.md` consolidating: commit conventions, branch naming, secret scanning patterns, semver, release automation (content from CLAUDE.md "GitHub Framework" section)
- [ ] 3.3 **MOVE** `tool-router/README.md` to `hooks/docs/tool-routing.md`, merge in CLAUDE.md "Tool Selection Protocol" content (detection patterns, research doc requirements). Leave a pointer file at `tool-router/README.md` referencing new location.
- [ ] 3.4 Create `hooks/docs/verbosity-system.md` consolidating: output levels, prefix meanings ([+]/[X]/[!]/[ERR]), anti-patterns, hook output functions (content from CLAUDE.md "Context-Optimized Output Strategy" section)
- [ ] 3.5 Verify `hooks/docs/vitest-migration.md` already covers CLAUDE.md "Test Framework: Vitest" content (if not, merge missing bits)

## Phase 4: Update Hook JSDoc References

- [ ] 4.1 Update n8n governance hook headers: replace `see CLAUDE.md "..."` with `see hooks/docs/n8n-governance.md`
- [ ] 4.2 Update git hook headers: replace CLAUDE.md references with `see hooks/docs/github-framework.md`
- [ ] 4.3 Update `tool-router/README.md` reference in `tool_research_gate.ts` to point to new location
- [ ] 4.4 Update utils.ts verbosity docs to reference `hooks/docs/verbosity-system.md`

## Phase 5: Slim CLAUDE.md

- [ ] 5.1 Trim Architecture section from 42 to ~20 lines (keep directory tree, remove file-level detail)
- [ ] 5.2 Remove "Context-Optimized Output Strategy" section (54 lines) - now in hooks/docs/verbosity-system.md
- [ ] 5.3 Trim "Source of Truth: LIVE APIs" to rule statement + hook refs only (~8 lines)
- [ ] 5.4 Remove "n8n Naming Conventions" section (50 lines) - enforced by hook, now in hooks/docs/n8n-governance.md
- [ ] 5.5 Remove "n8n Node Documentation" section (23 lines) - enforced by hook, now in hooks/docs/n8n-governance.md
- [ ] 5.6 Remove "n8n Code Node Governance" section (42 lines) - enforced by hook, now in hooks/docs/n8n-governance.md
- [ ] 5.7 Remove "n8n Webhook Path Naming" section (97 lines) - enforced by hook, now in hooks/docs/n8n-governance.md
- [ ] 5.8 Trim "n8n Workflow Requirements" to 5-line summary with hook refs
- [ ] 5.9 Remove "Hook System" 6 tables (93 lines) - settings.json is authoritative, source files are self-documenting
- [ ] 5.10 Remove "Hook Implementation Status" table (36 lines) - stale maintenance burden
- [ ] 5.11 Remove "Tool Selection Protocol" section (67 lines) - enforced by hook, now in hooks/docs/tool-routing.md
- [ ] 5.12 Remove "Dynamic Tool Router" section (68 lines) - now in hooks/docs/tool-routing.md + tool-router.json
- [ ] 5.13 Remove "GitHub Framework" section (118 lines) - enforced by git hooks, now in hooks/docs/github-framework.md
- [ ] 5.14 Update References section to point to new hooks/docs/*.md files
- [ ] 5.15 Verify final CLAUDE.md is ~280-300 lines

## Phase 6: Validation

- [ ] 6.1 Build hooks: `cd hooks && bun run build` - must succeed
- [ ] 6.2 Run full test suite: `cd hooks && bun test` - all tests must pass
- [ ] 6.3 Verify no broken cross-references (grep CLAUDE.md for removed section names, grep hooks for old CLAUDE.md references)
- [ ] 6.4 Spot-check 3 hooks: trigger a block and verify the error message is actionable with examples

## Phase 7: Update Stale Sibling Proposals (housekeeping)

- [ ] 7.1 Update `add-global-github-framework/tasks.md` to check off tasks that are already done (code exists, templates exist, CLAUDE.md was updated)
- [ ] 7.2 Update `enforce-n8n-object-governance/tasks.md` task 6.1 note: JSDoc references now point to hooks/docs/ not CLAUDE.md
- [ ] 7.3 Update `tool-router/README.md` line 184 ("CLAUDE.md Dynamic Tool Router section") to reference hooks/docs/tool-routing.md

## Dependencies

- Phase 1 (audit) has no dependencies - do first
- Phase 2 depends on Phase 1 (only enrich what audit finds terse)
- Phase 3 depends on Phase 1 (audit determines what content to merge vs. create fresh)
- Phase 4 depends on Phase 3 (new docs must exist before updating references)
- Phase 5 depends on Phases 2, 3, 4 (hooks must be self-documenting + reference docs must exist BEFORE removing CLAUDE.md content)
- Phase 6 depends on Phase 5
- Phase 7 can run in parallel with Phase 6
