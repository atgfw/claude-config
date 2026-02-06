# Tasks: Tool Research Gate

**Change ID:** `add-tool-research-gate`

## Phase 1: Core Infrastructure

- [ ] Create `tool-research-registry.json` ledger schema
- [ ] Create `TOOL-RESEARCH.template.md` template
- [ ] Implement `github_searcher.ts` (gh CLI wrapper)
- [ ] Implement `npm_searcher.ts` (npm search wrapper)
- [ ] Write tests for searcher modules

## Phase 2: Gate Implementation

- [ ] Implement `tool_research_gate.ts` hook
- [ ] Add path pattern detection (wrappers/, integrations/, etc.)
- [ ] Add content pattern detection (imports analysis)
- [ ] Implement research document validation
- [ ] Add star threshold warning logic
- [ ] Write comprehensive tests for gate

## Phase 3: Integration

- [ ] Register hook in settings.json
- [ ] Add correction ledger integration
- [x] Document in hooks/docs/tool-routing.md (migrated from CLAUDE.md via slim-claudemd-to-governance-index)
- [ ] Add to AGENTS.md subagent guidance

## Phase 4: Verification

- [ ] Test: Create wrapper without research -> BLOCKED
- [ ] Test: Create valid research doc -> ALLOWED
- [ ] Test: Reject high-star tool -> Warning logged
- [ ] Test: Registry tracks all decisions
- [ ] Run full test suite: `cd ~/.claude/hooks && bun test`

## Dependencies

- Requires `gh` CLI installed and authenticated
- Requires npm CLI available
- Depends on existing hook infrastructure (runner.ts, types.ts)
