# Tasks: Block n8n Local Workflow Files

## Goal

Block n8n local workflow files - enforce cloud-only storage with node notes for documentation

## Phase 1: Hook Implementation

### 1.1 Upgrade stale_workflow_json_detector.ts
- [ ] Add test cases for BLOCK behavior on Write/Edit
- [ ] Modify hook to return BLOCK for Write/Edit operations (not just WARN)
- [ ] Keep WARN behavior for Read operations
- [ ] Update block message with actionable guidance
- [ ] Run tests, verify passing

### 1.2 Create n8n_download_blocker.ts
- [ ] Create test file `hooks/tests/governance/n8n_download_blocker.test.ts`
- [ ] Write tests for blocking `n8n_get_workflow` calls
- [ ] Implement hook in `hooks/src/governance/n8n_download_blocker.ts`
- [ ] Register hook in runner
- [ ] Add to settings.json PreToolUse hooks
- [ ] Run tests, verify passing

### 1.3 Create n8n_post_update_cleanup.ts
- [ ] Create test file `hooks/tests/governance/n8n_post_update_cleanup.test.ts`
- [ ] Write tests for temp/ cleanup after successful update
- [ ] Write tests for NO cleanup on failed update
- [ ] Implement hook in `hooks/src/governance/n8n_post_update_cleanup.ts`
- [ ] Register hook as PostToolUse
- [ ] Add to settings.json PostToolUse hooks
- [ ] Run tests, verify passing

## Phase 2: Configuration

### 2.1 Update settings.json
- [ ] Add `n8n_download_blocker` to PreToolUse hooks
- [ ] Add `n8n_post_update_cleanup` to PostToolUse hooks
- [ ] Verify hook loading on session start

### 2.2 Deprecate workflow-local-file-enforcer.yaml
- [ ] Move `hooks/specs/workflow-local-file-enforcer.yaml` to `hooks/specs/old/`
- [ ] Add deprecation note explaining it contradicts cloud-only direction

## Phase 3: Documentation

### 3.1 Update CLAUDE.md
- [ ] Update "Source of Truth: LIVE APIs" section with new enforcement details
- [ ] Add "n8n Project Folder Structure" section
- [ ] Document temp/ usage pattern
- [ ] Add to Critical Rules table

### 3.2 Close GitHub Issues
- [ ] Add implementation notes to #19
- [ ] Add implementation notes to #33
- [ ] Close both issues with reference to this change

## Verification

- [ ] Build hooks: `cd hooks && npm run build`
- [ ] Run all tests: `cd hooks && npm test`
- [ ] Lint: `cd hooks && npm run lint`
- [ ] Manual test: attempt to write workflow JSON outside temp/ (should BLOCK)
- [ ] Manual test: attempt `n8n_get_workflow` MCP call (should BLOCK)
- [ ] Validate change: `openspec validate block-n8n-local-workflow-files --strict`

## Dependencies

- Phase 1 tasks can run in parallel (1.1, 1.2, 1.3 are independent)
- Phase 2 depends on Phase 1 completion
- Phase 3 depends on Phase 2 completion
