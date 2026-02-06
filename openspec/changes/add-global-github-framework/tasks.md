# Tasks: Global GitHub Framework

**Change ID:** `add-global-github-framework`

## Phase 1: Core Enforcement

- [x] Create OpenSpec proposal structure
- [x] Implement `secret_scanner.ts` (STRICT - blocks)
- [x] Implement `commit_message_validator.ts` (WARN)
- [x] Implement `branch_naming_validator.ts` (WARN)
- [x] Add hooks to settings.json

## Phase 2: Automation

- [x] Create `release-registry.json` ledger schema
- [x] Create `changelog-registry.json` ledger schema
- [x] Implement `changelog_generator.ts`
- [x] Implement `semantic_version_calculator.ts`
- [x] Create `semantic-release.yml` GitHub Action

## Phase 3: Templates & CI

- [x] Create `README.template.md`
- [x] Create `CONTRIBUTING.template.md`
- [x] Create `PR_TEMPLATE.md`
- [x] Create `commitlint.config.js`
- [x] Create `release.config.js`
- [x] Create `security-scan.yml` GitHub Action
- [x] Document in hooks/docs/github-framework.md (migrated from CLAUDE.md via slim-claudemd-to-governance-index)

## Verification

- [x] Test commit convention warning
- [x] Test secret scanner blocking
- [ ] Test release automation flow (deferred - requires live push to main)
- [x] Run hooks tests: `cd ~/.claude/hooks && bun test`
