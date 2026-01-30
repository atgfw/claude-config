# Spec Delta: issue-conventions

**Capability:** `issue-conventions`
**Change ID:** `add-github-issue-tracking-system`

## ADDED Requirements

### Requirement: Issue titles follow system-type-scope-description format

All GitHub issues created via `gh issue create` MUST follow the title format: `[<system>] <type>(<scope>): <description>`.

- `system`: One of `hooks`, `n8n`, `elevenlabs`, `servicetitan`, `mcp`, `governance`, `infra`
- `type`: Conventional Commits type (`feat`, `fix`, `chore`, `docs`, `refactor`, `perf`, `test`)
- `scope`: Optional, kebab-case subsystem
- `description`: Imperative, lowercase, no trailing period, max 72 chars total

**Enforcement:** WARN (log violation, allow creation)

#### Scenario: Valid issue title

Given the command `gh issue create --title "[hooks] feat(session-start): add auto-push on startup"`
When the `issue_convention_validator` hook runs
Then the hook allows the command

#### Scenario: Missing system prefix

Given the command `gh issue create --title "feat: add auto-push"`
When the `issue_convention_validator` hook runs
Then the hook logs `[!] Issue title missing [system] prefix`
And the command is allowed (WARN)

### Requirement: Issue bodies follow structured template

Issue bodies MUST contain at minimum: `## Problem`, `## Solution`, `## Acceptance Criteria` (with checkboxes), and `## Source` sections.

**Enforcement:** WARN

#### Scenario: Body with all sections

Given an issue body containing `## Problem`, `## Solution`, `## Acceptance Criteria`, and `## Source`
When validated
Then no warning is emitted

#### Scenario: Body missing acceptance criteria

Given an issue body without `## Acceptance Criteria`
When validated
Then the hook logs `[!] Issue body missing Acceptance Criteria section`

### Requirement: Duplicate detection before creation

Before creating an issue, the system MUST search existing open issues. If an existing open issue title has >80% keyword overlap, log a warning with the duplicate issue number.

**Enforcement:** WARN

#### Scenario: No duplicate found

Given no open issue with similar title exists
When creating a new issue
Then creation proceeds normally

#### Scenario: Duplicate detected

Given open issue #24 has title `[governance] feat: add LLM model validator hook`
When creating issue with title `[governance] feat: implement LLM model validator`
Then the hook logs `[!] Possible duplicate: #24`
And creation is allowed (user decides)
