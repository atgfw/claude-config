# Capability: Lean CLAUDE.md Index

CLAUDE.md must be a lean governance index (~280-300 lines) containing only LLM behavioral directives and rule-to-hook pointers. Detailed rule documentation lives in hook source files and hooks/docs/*.md reference guides.

## ADDED Requirements

### Requirement: Reference Docs Exist for Migrated Content

Every section removed from CLAUDE.md MUST have its content preserved in a corresponding `hooks/docs/*.md` reference file.

#### Scenario: n8n governance content migrated

**Given** the "n8n Naming Conventions", "n8n Node Documentation", "n8n Code Node Governance", and "n8n Webhook Path Naming" sections are removed from CLAUDE.md
**When** a developer needs detailed n8n governance rules
**Then** `hooks/docs/n8n-governance.md` contains all removed content organized by topic

#### Scenario: GitHub framework content migrated

**Given** the "GitHub Framework" section is removed from CLAUDE.md
**When** a developer needs commit convention details or secret scanning patterns
**Then** `hooks/docs/github-framework.md` contains all removed content

#### Scenario: Tool routing content migrated

**Given** the "Dynamic Tool Router" and "Tool Selection Protocol" sections are removed from CLAUDE.md
**When** a developer needs tool priority hierarchies
**Then** `hooks/docs/tool-routing.md` contains all removed content

#### Scenario: Verbosity system content migrated

**Given** the "Context-Optimized Output Strategy" section is removed from CLAUDE.md
**When** a developer needs verbosity level details or output prefix meanings
**Then** `hooks/docs/verbosity-system.md` contains all removed content

## MODIFIED Requirements

### Requirement: CLAUDE.md Line Budget

CLAUDE.md MUST NOT exceed 300 lines. Content that exceeds this budget must be migrated to hooks/docs/ or hook source files.

#### Scenario: CLAUDE.md after migration

**Given** all phases of slim-claudemd-to-governance-index are complete
**When** CLAUDE.md line count is measured
**Then** it is between 250 and 300 lines

### Requirement: Critical Rules Table Remains Authoritative

The Critical Rules table in CLAUDE.md MUST remain as the single index of all enforced rules, with one row per rule mapping to its enforcing hook.

#### Scenario: Rule index completeness

**Given** the slimmed CLAUDE.md
**When** the Critical Rules table is inspected
**Then** every hook that blocks or warns has a corresponding row
**And** no row contains more than a one-line description

## REMOVED Requirements

### Requirement: Inline Rule Documentation in CLAUDE.md

CLAUDE.md MUST NOT contain detailed rule documentation (valid/invalid example tables, JSON templates, code snippets, multi-row specification tables) for rules that are programmatically enforced by hooks.

#### Scenario: No webhook JSON template in CLAUDE.md

**Given** the slimmed CLAUDE.md
**When** searched for webhook JSON configuration examples
**Then** no results are found (this content lives in hooks/docs/n8n-governance.md)

#### Scenario: No commit type version bump table in CLAUDE.md

**Given** the slimmed CLAUDE.md
**When** searched for commit type to version bump mapping tables
**Then** no results are found (this content lives in hooks/docs/github-framework.md)
