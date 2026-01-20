# Tasks: Global GitHub Framework

**Change ID:** `add-global-github-framework`

## Phase 1: Core Enforcement

- [x] Create OpenSpec proposal structure
- [ ] Implement `secret_scanner.ts` (STRICT - blocks)
- [ ] Implement `commit_message_validator.ts` (WARN)
- [ ] Implement `branch_naming_validator.ts` (WARN)
- [ ] Add hooks to settings.json

## Phase 2: Automation

- [ ] Create `release-registry.json` ledger schema
- [ ] Create `changelog-registry.json` ledger schema
- [ ] Implement `changelog_generator.ts`
- [ ] Implement `semantic_version_calculator.ts`
- [ ] Create `semantic-release.yml` GitHub Action

## Phase 3: Templates & CI

- [ ] Create `README.template.md`
- [ ] Create `CONTRIBUTING.template.md`
- [ ] Create `PR_TEMPLATE.md`
- [ ] Create `commitlint.config.js`
- [ ] Create `release.config.js`
- [ ] Create `security-scan.yml` GitHub Action
- [ ] Document in CLAUDE.md

## Verification

- [ ] Test commit convention warning
- [ ] Test secret scanner blocking
- [ ] Test release automation flow
- [ ] Run hooks tests: `cd ~/.claude/hooks && npm test`
