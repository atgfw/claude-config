# Capability: Self-Documenting Hooks

Hook error messages must contain sufficient context for the LLM to understand and fix violations without relying on pre-loaded CLAUDE.md documentation.

## ADDED Requirements

### Requirement: Rich Block Messages

All hooks that block actions MUST include actionable guidance in their error output: the specific violation, a concrete wrong/correct example, and a fix suggestion.

#### Scenario: Webhook path validator blocks snake_case path

**Given** a workflow update with webhook path `customer_sync`
**When** `n8n_webhook_path_validator` blocks the action
**Then** the error message includes:
- The invalid value: `customer_sync`
- The rule violated: "must be kebab-case"
- A corrected example: `customer-sync`

#### Scenario: Naming validator blocks PascalCase node name

**Given** a workflow update with node named `GetCustomerData`
**When** `n8n_naming_validator` blocks the action
**Then** the error message includes:
- The invalid value: `GetCustomerData`
- The rule violated: "must be snake_case"
- A corrected example: `get_customer_data`

#### Scenario: Commit message validator warns on non-conventional format

**Given** a git commit with message `fixed the bug`
**When** `commit_message_validator` warns
**Then** the warning includes:
- The expected format: `<type>(<scope>): <description>`
- An example fix: `fix(auth): resolve login redirect loop`

### Requirement: Verbosity-Aware Output

Rich examples MUST respect the verbosity system. Terse mode shows a single-line summary. Normal/verbose modes show full examples.

#### Scenario: Terse mode suppresses examples

**Given** `HOOK_VERBOSITY=terse`
**When** any hook blocks with a rich message
**Then** output is a single line like `[X] Path 'customer_sync' not kebab-case`
**And** valid/invalid example tables are suppressed

#### Scenario: Normal mode shows examples

**Given** `HOOK_VERBOSITY=normal` (or unset)
**When** any hook blocks with a rich message
**Then** output includes the violation, rule, and corrected example

## MODIFIED Requirements

### Requirement: JSDoc Headers Reference docs, Not CLAUDE.md

Hook JSDoc headers that currently say `see CLAUDE.md "Section Name"` MUST be updated to reference the corresponding `hooks/docs/*.md` file instead.

#### Scenario: Webhook path validator header updated

**Given** `n8n_webhook_path_validator.ts` JSDoc header
**When** inspected
**Then** it references `hooks/docs/n8n-governance.md` not `CLAUDE.md "Webhook Path Naming"`
