# Spec Delta: label-taxonomy

**Capability:** `label-taxonomy`
**Change ID:** `add-github-issue-tracking-system`

## ADDED Requirements

### Requirement: Labels use group/value naming convention

All labels MUST follow `group/value` format. Groups: `priority`, `system`, `type`, `lifecycle`, `source`. Each group has a distinct color family.

#### Scenario: Label provisioning

Given `github/label-taxonomy.json` defines 25+ labels
When `label_taxonomy.ts` runs on session start (first run only)
Then all labels exist on the GitHub repo via `gh label create`

#### Scenario: Idempotent provisioning

Given labels already exist on the repo
When `label_taxonomy.ts` runs again
Then no duplicate labels are created (upsert behavior)

### Requirement: Auto-assignment from issue title

When an issue is created with a conforming title, labels MUST be automatically assigned:
- `[system]` prefix maps to `system/*`
- `type(scope):` maps to `type/*`
- New issues default to `lifecycle/triage`

#### Scenario: Auto-assign from title

Given issue title `[hooks] feat(session-start): add auto-push`
When the issue is created
Then labels `system/hooks`, `type/feat`, `lifecycle/triage` are assigned

### Requirement: Source labels for automated issues

Issues created by automation MUST include a `source/*` label identifying the origin.

#### Scenario: Correction-sourced issue

Given a correction ledger entry triggers issue creation
When the issue is created
Then label `source/correction-ledger` is assigned

### Requirement: Remove default GitHub labels

On first label provisioning, the system MUST remove default GitHub labels (`bug`, `enhancement`, `good first issue`, etc.) to enforce the taxonomy exclusively.

#### Scenario: Default labels removed

Given the repo has default GitHub labels
When label provisioning runs
Then default labels are removed and replaced with taxonomy labels
