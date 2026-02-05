# Tasks: Block n8n Local Workflow Files

## Goal

Block n8n local workflow files - enforce cloud-only storage with node notes for documentation

## Phase 1: Hook Implementation

### 1.1 Upgrade stale_workflow_json_detector.ts
- [x] Add test cases for BLOCK behavior on Write/Edit
- [x] Modify hook to return BLOCK for Write/Edit operations (not just WARN)
- [x] Keep WARN behavior for Read operations
- [x] Update block message with actionable guidance
- [x] Run tests, verify passing

### 1.2 Create n8n_download_blocker.ts
- [x] Create test file `hooks/tests/governance/n8n_download_blocker.test.ts`
- [x] Write tests for blocking `n8n_get_workflow` calls
- [x] Implement hook in `hooks/src/governance/n8n_download_blocker.ts`
- [x] Register hook in runner
- [x] Add to settings.json PreToolUse hooks
- [x] Run tests, verify passing

### 1.3 Create n8n_post_update_cleanup.ts
- [x] Create test file `hooks/tests/hooks/n8n_post_update_cleanup.test.ts`
- [x] Write tests for temp/ cleanup after successful update
- [x] Write tests for NO cleanup on failed update
- [x] Implement hook in `hooks/src/hooks/n8n_post_update_cleanup.ts`
- [x] Register hook as PostToolUse
- [x] Add to settings.json PostToolUse hooks
- [x] Run tests, verify passing

## Phase 2: Configuration

### 2.1 Update settings.json
- [x] Add `n8n_download_blocker` to PreToolUse hooks
- [x] Add `n8n_post_update_cleanup` to PostToolUse hooks
- [x] Verify hook loading on session start

### 2.2 Deprecate workflow-local-file-enforcer.yaml
- [x] Move `hooks/specs/workflow-local-file-enforcer.yaml` to `hooks/specs/old/`
- [x] Add deprecation note explaining it contradicts cloud-only direction

## Phase 3: Documentation

### 3.1 Update CLAUDE.md
- [x] Update "Source of Truth: LIVE APIs" section with new enforcement details
- [x] Add "n8n Workflow Storage (Cloud-Only)" section
- [x] Document temp/ usage pattern
- [x] Add to Critical Rules table

### 3.2 Close GitHub Issues
- [x] Add implementation notes to #19
- [x] Add implementation notes to #33
- [x] Close both issues with reference to this change

## Verification

- [x] Build hooks: `cd hooks && bun run build`
- [x] Run all tests: `cd hooks && bun run test` (1533 passed)
- [x] Validate change: `openspec validate block-n8n-local-workflow-files --strict`

## Dependencies

- Phase 1 tasks can run in parallel (1.1, 1.2, 1.3 are independent)
- Phase 2 depends on Phase 1 completion
- Phase 3 depends on Phase 2 completion

## Completion

**Status:** COMPLETE
**Date:** 2026-02-05
**Issues Closed:** #19, #33
