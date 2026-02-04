# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

This is the **Spinal Cord** - a centralized nervous system that superintends the operation of ALL projects through deterministic, authoritative control. Every human corrective action represents a failure: a missing hook, an incomplete rule, or a flawed enforcement mechanism.

## Active Goal Display (MANDATORY)

**EVERY response MUST end with the active goal from `~/.claude/ledger/active-goal.json`.**

Format (append to end of every message):

```
---
**ACTIVE GOAL:** {summary}
- **WHO:** {fields.who}
- **WHAT:** {fields.what}
- **WHEN:** {fields.when}
- **WHERE:** {fields.where}
- **WHY:** {fields.why}
- **HOW:** {fields.how}
- **WHICH:** {fields.which}
- **LEST:** {fields.lest}
- **WITH:** {fields.with}
- **MEASURED BY:** {fields.measuredBy}
```

If no goal is set (goal is null), append instead:

```
---
**NO ACTIVE GOAL SET.** Define one before proceeding with work.
```

This is non-negotiable. No exceptions. Every single response.

## Setup

```bash
cd ~/.claude
bash setup.sh
```

Setup will:
1. Create directory structure
2. Install npm dependencies for hooks
3. Compile TypeScript hooks
4. Run session validation

## Architecture

```
~/.claude/ (SPINAL CORD)
    |
    +-- hooks/
    |   +-- src/           # TypeScript source files
    |   +-- tests/         # Vitest tests (TDD)
    |   +-- dist/          # Compiled JavaScript
    |   +-- specs/         # Specification documents
    |   +-- package.json   # Dependencies
    |
    +-- mcp/               # Self-managing MCP system
    |   +-- mcp-registry.json
    |
    +-- tool-router/       # Dynamic preference engine
    |   +-- tool-router.json
    |
    +-- ledger/            # Tracking systems
    |   +-- test-run-registry.json
    |   +-- correction-ledger.json
    |   +-- escalation-registry.json
    |   +-- release-registry.json
    |   +-- changelog-registry.json
    |   +-- tool-research-registry.json
    |
    +-- templates/         # Document templates
    |   +-- TOOL-RESEARCH.template.md
    |
    +-- github/            # GitHub framework
    |   +-- templates/     # Repo templates (README, CONTRIBUTING, PR)
    |   +-- configs/       # Tool configs (commitlint, semantic-release)
    |
    +-- .github/workflows/ # GitHub Actions
    |   +-- semantic-release.yml
    |   +-- security-scan.yml
    |
    +-- agents/            # 70+ specialized subagents
    +-- settings.json      # Global hook configuration
    +-- .env               # API keys (gitignored)
```

## Critical Rules

| Rule | Enforcing Hook | Description |
|------|---------------|-------------|
| **Child projects MUST NOT override** | `child_project_override_detector` | No local .mcp.json, hooks, settings.json, or .env |
| **Deletion is banned** | `pre_bash` | Move files to old/ directory instead |
| **Never use emojis** | `pre_bash`, `pre_write` | Blocks emoji in code and output |
| **Tool filtering** | `tool_filter` | Configurable MCP tool blocklist/allowlist via tool-filter-config.json |
| **Tool research required** | `tool_research_gate` | TOOL-RESEARCH.md required before creating wrappers/integrations |
| **Every correction becomes a hook** | `escalation_trigger` | Tracks in Correction Debt Ledger |
| **Never use complex inline scripts** | `inline_script_validator` | Enforces temp file pattern for complex scripts |
| **LIVE APIs are source of truth** | `ghost_file_detector` | Never trust local files for cloud object state |
| **Vitest only** | `vitest_migration_enforcer` | Migrate Jest to Vitest, no other frameworks |
| **Hierarchical testing** | `hierarchical_testing_gate` | Untested work is unsuitable to build upon |
| **Node-level specs** | `spec_completeness_validator` | Every node needs inputs/logic/outputs/routes before build |
| **Project directive** | `pre_build_gate` | Every project needs PROJECT-DIRECTIVE.md at root |
| **Dual trigger subworkflows** | `n8n_dual_trigger_validator` | n8n subworkflows MUST have executeWorkflowTrigger AND webhook |
| **Primordial Pipeline (3 Novel Runs)** | `primordial_pipeline_gate` | Every entity requires 3 unique test runs before building upon |
| **n8n Evaluations Exit Gate** | `evaluation_gate` | [DEV] workflows require 98%+ success before tag removal |
| **Workflow Publishing** | `workflow_publishing_gate` | Workflows with webhooks MUST be published |
| **Code Node Local Testing** | `code_node_test_validator` | JavaScript/Python nodes tested locally first |
| **n8n Naming Conventions** | `n8n_naming_validator` | snake_case nodes, no version numbers, full system prefixes |
| **n8n Node Documentation** | `n8n_node_note_validator` | All nodes require 20+ char notes with Display Note enabled |
| **Code Node Linting** | `code_node_linting_gate` | Standard JS linting for n8n code node content |
| **Version Numbers Banned** | `n8n_naming_validator` | No v1, v2, r1, _1 in any object names (global rule) |
| **Never fabricate versioning** | `version_fabrication_detector` | No _v2, _new, _backup suffixes unless project uses versioning |
| **Integers Banned in Names** | `n8n_naming_validator` | No arbitrary integers unless canonical (base64, oauth2) |
| **Webhook Path Naming** | `n8n_webhook_path_validator` | kebab-case, no nesting, no "test", must authenticate |
| **Secret Scanning** | `secret_scanner` | STRICT: Blocks commits containing API keys/secrets |
| **Commit Conventions** | `commit_message_validator` | WARN: Conventional Commits format recommended |
| **Default Branch** | `branch_naming_validator` | STRICT: Blocks `master`, enforces `main` only |
| **Branch Naming** | `branch_naming_validator` | WARN: prefix/description format recommended |
| **Context-optimized output** | `utils.ts` verbosity system | Terse logging to minimize context consumption |
| **Full file paths required** | `full_path_validator` | STRICT: All file paths must be absolute, not relative |
| **Evidence required for completions** | `evidence_requirement_gate` | STRICT: Task completions require verbatim code evidence (file:line + quote) |
| **Credential context awareness** | `credential_context_injector` | Injects credential location context when API keys/secrets are discussed |

## Context-Optimized Output Strategy

**Problem:** Claude Code outputs consume context window space. Every character counts toward the limit, accelerating summarization and reducing session length.

**Solution:** Systematic output optimization with configurable verbosity levels.

### Verbosity Levels

| Level | Env Var | Behavior |
|-------|---------|----------|
| `silent` | `HOOK_VERBOSITY=silent` | No output except critical errors |
| `terse` | `HOOK_VERBOSITY=terse` | Single-line, minimal output (default) |
| `normal` | `HOOK_VERBOSITY=normal` | Standard output with context |
| `verbose` | `HOOK_VERBOSITY=verbose` | Detailed output for debugging |

### Output Principles

1. **Density over verbosity** - Maximum information in minimum characters
2. **Batch, don't enumerate** - Show counts, not lists (in terse mode)
3. **Skip obvious successes** - Only log notable/unexpected results
4. **No redundancy** - Never restate what's already in context
5. **Structured brevity** - Tables > prose, bullets > paragraphs

### Terse Output Format

| Prefix | Meaning | Example |
|--------|---------|---------|
| `[+]` | Success with info | `[+] 3 files updated` |
| `[X]` | Blocked | `[X] Missing PROJECT-DIRECTIVE.md` |
| `[!]` | Warning | `[!] Webhook missing auth` |
| `[ERR]` | Error | `[ERR] Build failed: syntax error` |

### Hook Output Functions

```typescript
import { logTerse, logBlocked, logAllowed, logWarn, logBatch } from '../utils.js';

// Terse mode examples:
logTerse('[+] Hook passed');           // Always shows (except silent)
logBlocked('Missing spec');            // Shows as [X] in terse
logAllowed('Tests pass');              // Skipped if obvious success
logWarn('Deprecated pattern');         // Shows as [!]
logBatch('Files checked', files, 3);   // Shows count in terse, list in normal
```

### Anti-Patterns (AVOID)

| Bad | Better |
|-----|--------|
| `log('Starting to check files...')` | (skip entirely) |
| `log('File 1: OK\nFile 2: OK\nFile 3: OK')` | `logBatch('Checked', files)` |
| `log('[OK] Action allowed')` | (skip success confirmations) |
| `log('From CLAUDE.md:\n> Rule text here')` | (skip in terse, show in verbose) |

## Hierarchical Development Governance

**Philosophy:** UNTESTED WORK IS UNSUITABLE TO BUILD UPON. All development follows a strict hierarchical, sequential, test-driven pipeline enforced by hooks.

**The 5-Phase Sequential Pipeline:**
1. **SPEC** - Complete specification with inputs/outputs/routes (enforced by `spec_completeness_validator`)
2. **BUILD** - Implementation (blocked until spec approved by `pre_build_gate`)
3. **MOCK TESTING** - Synthetic data validation (tracked by `test_run_registry`)
4. **REAL TESTING** - Live environment validation (tracked by `test_run_registry`)
5. **GATE CHECK** - Perfection verification (enforced by `hierarchical_testing_gate`)

**Node-by-Node Perfection:** Within workflows, nodes are tested sequentially. Building Node 3 while Node 2 is untested is BLOCKED by `hierarchical_testing_gate`.

**Primordial Pipeline (3 Novel Runs):** Every entity (code node, subworkflow, workflow) requires 3 complete test runs with NOVEL input data (unique SHA-256 hash) before building upon. Enforced by `primordial_pipeline_gate`, tracked in `~/.claude/ledger/test-run-registry.json`.

**For complete specification templates, checklists, and examples:** See `~/.claude/hooks/specs/`

## Source of Truth: LIVE APIs

**Rule:** Local files are documentation/cache only. Cloud APIs are authoritative. The `ghost_file_detector` governance hook prevents creating cloud objects that already exist by querying LIVE APIs first.

**Before creating ANY cloud object:**
1. Query the LIVE API to fetch existing objects
2. Check for duplicates/similar objects
3. Only proceed if no conflict found

**Enforced for:** n8n workflows (`n8n_workflow_governance`), ElevenLabs agents (`elevenlabs_agent_governance`), ServiceTitan objects (`servicetitan_governance`).

## Testing Context Interpretation

When user requests "tests" or "evaluations", interpret as operations on LIVE cloud objects:

| Request | Meaning | Hook/Tool |
|---------|---------|-----------|
| "Run tests on workflows" | Execute/validate LIVE n8n workflows | `n8n_trigger_webhook_workflow` |
| "Test the agents" | Run simulations against LIVE ElevenLabs agents | `elevenlabs-mcp` tools |
| "2000 tests" | 2000 evaluation runs against cloud objects | Batch API calls with rate limiting |
| "Validate everything" | Health check all LIVE cloud objects | Governance hooks |

## n8n Workflow Requirements

**Dual Trigger Pattern:** All n8n subworkflows MUST have both `executeWorkflowTrigger` (for parent orchestration) AND `webhook` trigger (for API testing). Enforced by `n8n_dual_trigger_validator`.

**Webhook Path Convention:** (SUPERSEDED - see "n8n Webhook Path Naming" section)
- Paths must be flat kebab-case (no nesting)
- Example: `customer-sync`, not `api/customer-sync`
- Must authenticate with header secret key

**Publishing Requirement:** Workflows with webhook triggers MUST be published before production use. Enforced by `workflow_publishing_gate`.

**Webhook HTTP Methods:** Configure webhooks to accept all expected methods (GET, POST, etc.). Validated by `webhook_methods_validator`.

**n8n Evaluations Exit Gate:** [DEV] workflows require 98%+ success rate on evaluations before tag removal. Enforced by `evaluation_gate`, tracked via execution history parsing.

**For detailed implementation patterns:** See `~/.claude/hooks/src/governance/n8n_dual_trigger_validator.ts`

## n8n Naming Conventions

**Enforced by:** `n8n_naming_validator` hook

### Tag Syntax Reservation

Reserve `[TAG]` bracket syntax ONLY for systems without built-in tag features. n8n has native tags, so bracket tags are BLOCKED except `[DEV]`.

| System | Has Native Tags | Bracket Tags Allowed |
|--------|-----------------|---------------------|
| n8n | Yes | NO (use native tags) |
| ServiceTitan | Limited | YES for status |
| Files | No | YES for prefixes |

### System Name Prefixes

Use full system names as workflow prefixes, NOT abbreviations:

| Wrong | Correct |
|-------|---------|
| `[ST] Customer Sync` | `ServiceTitan_customer_sync` |
| `[EL] Agent Handler` | `ElevenLabs_agent_handler` |
| `[N8N] Orchestrator` | `main_orchestrator` |

### Version Numbers Banned (Global Rule)

Version numbers in object names are BLOCKED across ALL systems:

**Blocked patterns:** `v1`, `v2`, `V3`, `r1`, `r2`, `_1`, `_2`, `ver1`, `version2`

Use n8n tags or create new workflows instead of versioning names.

### Node Naming: snake_case

All n8n node names MUST be snake_case:

| Wrong | Correct |
|-------|---------|
| `GetCustomerData` | `get_customer_data` |
| `HTTP Request` | `http_request` |
| `fetchJobs` | `fetch_jobs` |

### Integers in Names (Global Rule)

Arbitrary integers are BLOCKED in programming object names unless canonical:

**Allowed (canonical):** `base64`, `oauth2`, `sha256`, `utf8`, `http2`, `ipv4`, `aes256`

**Blocked (arbitrary):** `handler2`, `process_data_3`, `sync_v1`

## n8n Node Documentation

**Enforced by:** `n8n_node_note_validator` hook

### Mandatory Notes

ALL n8n nodes MUST have substantial notes:

| Requirement | Specification |
|-------------|---------------|
| Minimum length | 20 characters |
| Content | Must describe purpose, not repeat name |
| Placeholders | BLOCKED (TODO, FIXME, "add description") |
| Display | "Display Note in Flow?" MUST be enabled |

### Good vs Bad Notes

| Bad (BLOCKED) | Good (ALLOWED) |
|---------------|----------------|
| `HTTP Request` | `Fetches active jobs from ServiceTitan API for current dispatch zone` |
| `Gets data` | `Retrieves customer records filtered by status and creation date` |
| `TODO: add description` | `Transforms raw API response into normalized format for downstream processing` |

## n8n Code Node Governance

**Enforced by:** `code_node_linting_gate` hook

### Logic Centralization

Maximize workflow logic into JavaScript code nodes. Minimize inline expressions and mustaching in other node types.

**Rationale:** Code nodes can be locally tested, linted, and version-controlled.

### Complex Expression Detection

Expressions with more than 2 operations trigger a warning to move logic to code nodes:

```javascript
// WARNING: Too complex for inline expression
{{ $json.data.filter(x => x.active).map(x => x.id).join(',') }}

// OK: Simple field access
{{ $json.customer.name }}
```

### Linting Rules

Standard JavaScript linting applies to code node content:

| Rule | Severity | Description |
|------|----------|-------------|
| `no-var` | Error | Use const/let instead of var |
| `no-debugger` | Error | Remove debugger statements |
| `no-eval` | Error | eval() is dangerous |
| `no-console` | Warning | Remove console.log in production |
| `no-empty-catch` | Warning | Handle errors or comment why ignored |

### n8n-Specific Exceptions

These patterns are allowed despite normal linting:

- `$input.all()`, `$json`, `$items`, `$workflow` - n8n globals
- `return items` - standard n8n return pattern
- `$('node name')` - n8n node reference syntax

## n8n Webhook Path Naming

**Enforced by:** `n8n_webhook_path_validator` hook

### Path Requirements

Webhook trigger paths must follow these rules:

| Requirement | Specification |
|-------------|---------------|
| Format | kebab-case only |
| Nesting | NOT allowed (no slashes) |
| "test" word | BLOCKED (n8n has built-in test triggers) |
| Authentication | REQUIRED via header auth |
| Node name | Must be exactly "webhook" |

### Valid vs Invalid Paths

| Invalid Path | Why | Valid Path |
|--------------|-----|------------|
| `api/customer-sync` | Nested (has slash) | `customer-sync` |
| `customer_sync` | snake_case, not kebab-case | `customer-sync` |
| `test-customer-sync` | Contains "test" | `customer-sync` |
| `CustomerSync` | PascalCase | `customer-sync` |

### Authentication Requirement

All webhooks MUST authenticate using header auth with a unique secret key:

```javascript
// Required webhook configuration
{
  "name": "webhook",
  "type": "n8n-nodes-base.webhook",
  "parameters": {
    "path": "customer-sync",
    "httpMethod": "POST",
    "authentication": "headerAuth",
    "options": {
      "headerAuth": {
        "name": "X-Webhook-Secret",
        "value": "={{$env.N8N_IN_SECRET_CUSTOMER_SYNC}}"
      }
    }
  }
}
```

### Secret Key Naming Convention

Store webhook secrets in `~/.claude/.env` with this naming pattern:

```
N8N_IN_SECRET_<WEBHOOK_PATH_UPPER_SNAKE>
```

Examples:
- `customer-sync` -> `N8N_IN_SECRET_CUSTOMER_SYNC`
- `job-handler` -> `N8N_IN_SECRET_JOB_HANDLER`
- `servicetitan-dispatch` -> `N8N_IN_SECRET_SERVICETITAN_DISPATCH`

### Node Name Rule

The webhook node name MUST be exactly `webhook`. This provides consistency and makes workflows predictable:

| Wrong | Correct |
|-------|---------|
| `api_webhook` | `webhook` |
| `customer_webhook` | `webhook` |
| `trigger` | `webhook` |

**Rationale:** Webhook nodes should be identified by their path, not their name. The path (`customer-sync`) provides the semantic meaning.

## Test Framework: Vitest

**Vitest is the ONLY approved test framework.** The `vitest_migration_enforcer` hook blocks Jest/Mocha and provides migration guidance.

**Migration:** When encountering Jest, automatically migrate to Vitest. See `~/.claude/hooks/docs/vitest-migration.md` for complete migration checklist.

## Hook System

All hooks are TypeScript with TDD. Run via: `node ~/.claude/hooks/dist/cli.js <hook-name>`

### Core Enforcement Hooks

| Hook | Event | Purpose | Configuration |
|------|-------|---------|---------------|
| `pre_bash` | PreToolUse | Blocks deletion commands, emoji, dangerous operations | settings.json |
| `pre_write` | PreToolUse | Blocks Write/Edit when Morph MCP available, emoji | settings.json |
| `pre_build_gate` | PreToolUse | Validates PROJECT-DIRECTIVE.md exists before development | settings.json |
| `pre_task_start` | UserPromptSubmit | Validates MCP health, triggers intent analysis | settings.json |
| `pre_task_complete` | Stop | Requires visual validation via Scrapling | settings.json |

### Governance Hooks

| Hook | Event | Purpose | Data Source |
|------|-------|---------|-------------|
| `n8n_workflow_governance` | PreToolUse | Checks LIVE n8n API before create/delete | n8n API |
| `elevenlabs_agent_governance` | PreToolUse | Checks LIVE ElevenLabs API before create | ElevenLabs API |
| `servicetitan_governance` | PreToolUse | Prevents duplicate ServiceTitan object creation | ServiceTitan API |
| `n8n_dual_trigger_validator` | PreToolUse | Validates dual trigger pattern in subworkflows | Workflow JSON |
| `n8n_naming_validator` | PreToolUse | Enforces naming conventions for workflows/nodes | Workflow JSON |
| `n8n_node_note_validator` | PreToolUse | Enforces documentation requirements for nodes | Workflow JSON |
| `code_node_linting_gate` | PreToolUse | Enforces JS linting on code node content | Workflow JSON |
| `n8n_webhook_path_validator` | PreToolUse | Enforces webhook path naming conventions | Workflow JSON |
| `ghost_file_detector` | PreToolUse | Prevents creating cloud objects that already exist | LIVE APIs |
| `child_project_override_detector` | PreToolUse | Blocks child projects from overriding spinal cord | File system |
| `documentation_drift_detector` | PreToolUse | Detects when docs don't match implementation | Code analysis |

### Testing & Validation Hooks

| Hook | Event | Purpose | Registry |
|------|-------|---------|----------|
| `hierarchical_testing_gate` | PreToolUse | Enforces sequential node-by-node testing | test-run-registry.json |
| `primordial_pipeline_gate` | PreToolUse | Requires 3 novel test runs before building upon | test-run-registry.json |
| `code_node_test_validator` | PreToolUse | Validates code nodes tested locally first | File system + test results |
| `evaluation_gate` | PreToolUse | Validates n8n workflows meet evaluation criteria | Execution history |
| `spec_completeness_validator` | PreToolUse | Validates specs have inputs/outputs/routes/tests | Spec files |

### Quality Enforcement Hooks

| Hook | Event | Purpose | Integration |
|------|-------|---------|-------------|
| `post_code_write` | PostToolUse | Requires code-reviewer subagent invocation | Subagent system |
| `inline_script_validator` | PreToolUse | Blocks complex inline scripts, enforces temp file pattern | Bash command analysis |
| `vitest_migration_enforcer` | PreToolUse | Blocks Jest, provides Vitest migration guidance | package.json analysis |
| `workflow_publishing_gate` | PreToolUse | Ensures workflows published before prod use | n8n API |
| `webhook_methods_validator` | PreToolUse | Validates webhook HTTP method configuration | Workflow JSON |

### Browser Automation Hooks

| Hook | Event | Purpose | MCP Integration |
|------|-------|---------|-----------------|
| `browser_automation_gate` | PreToolUse | Blocks Playwright when Scrapling healthy | MCP health check |
| `login_detection_escalator` | PostToolUse | Detects login pages, escalates to human | Browser content analysis |
| `post_tool_use` | PostToolUse | Enforces Scrapling over Playwright | Tool usage monitoring |

### Meta-System Hooks

| Hook | Event | Purpose | Output |
|------|-------|---------|--------|
| `session_start` | SessionStart | MCP self-healing, environment setup | MCP health report |
| `escalation_trigger` | PostToolUse | Detects repeated corrections, proposes new hooks | Correction Debt Ledger |
| `prompt_escalation_detector` | UserPromptSubmit | Identifies escalation opportunities | Escalation registry |
| `self_audit_enforcement` | SessionStart | Periodically audits hook system health | Audit reports |

### Workflow Intent Analysis

| Hook | Event | Purpose | Detection |
|------|-------|---------|----------|
| `workflow_intent` | PreToolUse | Classifies workflow operations (create/read/update/delete) | Natural language analysis |
| `plan_completeness_gate` | PreToolUse | Validates execution plans are complete before proceeding | Plan structure analysis |

### Hook Development (TDD)

```bash
cd hooks
npm test           # Run Vitest tests
npm run lint       # Lint TypeScript
npm run build      # Compile to dist/
```

### Hook JSON Schema

All hooks output valid JSON matching Claude Code schemas. Use helpers from `hook-utils.js`:
- `outputPreToolUse(decision, reason)`
- `outputPostToolUse(context)`
- `outputUserPromptSubmit(context)`
- `outputSessionStart(context)`
- `outputStop(decision, reason)`

## Hook Implementation Status

This table maps CLAUDE.md sections to their enforcement mechanisms:

| CLAUDE.md Section | Lines | Enforcement | Implementation Status |
|-------------------|-------|-------------|----------------------|
| Purpose | 1-7 | Philosophical foundation | N/A (documentation) |
| Setup | 9-20 | setup.sh script | Implemented |
| Architecture | 22-42 | File system structure | Implemented |
| Critical Rules | 44-57 | Multiple hooks | See Critical Rules table above |
| Hierarchical Development | 59-527 | `hierarchical_testing_gate`, `primordial_pipeline_gate`, `spec_completeness_validator` | Fully enforced |
| Project Directive | 82-108 | `pre_build_gate` | Fully enforced |
| Design Enforcer Audit | 209-318 | `spec_completeness_validator` + manual enforcer invocation | Hook enforces spec existence, manual review required |
| Sequential Pipeline | 109-347 | `hierarchical_testing_gate` | Fully enforced |
| Code Node Local Testing | 426-477 | `code_node_test_validator` | Fully enforced |
| Perfection Criteria | 479-492 | `hierarchical_testing_gate` + test-run-registry | Tracked, gate enforced |
| n8n Evaluations | 528-575 | `evaluation_gate`, `evaluation_gate_wrapper` | Fully enforced |
| Source of Truth: LIVE APIs | 576-596 | `ghost_file_detector`, governance hooks | Fully enforced |
| Testing Context Interpretation | 598-653 | Documentation only | N/A (interpretation guidance) |
| n8n Subworkflow Dual Trigger | 654-762 | `n8n_dual_trigger_validator` | Fully enforced |
| Dual-Trigger Error Handling | 763-833 | `n8n_dual_trigger_validator` (pattern validation) | Validated by hook |
| Workflow Publishing | 834-853 | `workflow_publishing_gate` | Fully enforced |
| Webhook HTTP Methods | 854-887 | `webhook_methods_validator` | Fully enforced |
| Webhook Path Naming | 248-319 | `n8n_webhook_path_validator` | Fully enforced |
| Vitest Standard | 889-998 | `vitest_migration_enforcer` | Fully enforced |
| Primordial Pipeline | 1000-1163 | `primordial_pipeline_gate` + test-run-registry | Fully enforced |
| Inline Script Anti-Pattern | 1165-1183 | `inline_script_validator` | Fully enforced |
| Hook System | 1184-1203 | Hook infrastructure | Implemented |
| Browser Automation | 1205-1267 | `browser_automation_gate`, `login_detection_escalator` | Fully enforced |
| Hook JSON Schema | 1277-1295 | Hook output validation | Implemented in all hooks |
| MCP Self-Healing | 1297-1306 | `session_start` hook | Fully enforced |
| Dynamic Tool Router | 1308-1319 | tool-router.json + runtime logic | Implemented |
| Subagent Invocation | 1321-1329 | `post_code_write` (code-reviewer) | Partially enforced |
| API Key Architecture | 1331-1338 | `api_key_sync` module | Implemented |
| Task Completion | 1340-1347 | Multiple hooks | Checklist format |

## Tool Selection Protocol

**Enforced by:** `tool_research_gate` hook

### Purpose

Before implementing automation wrappers, integrations, or client libraries, research existing tools to prevent reinventing the wheel. This gate blocks creation of code files in wrapper directories without a documented research process.

### Detection Patterns

The hook triggers when creating code files in these directories:

| Directory Pattern | Description |
|------------------|-------------|
| `**/wrappers/**` | Wrapper modules for external APIs |
| `**/integrations/**` | Third-party integrations |
| `**/automation/**` | Automation scripts/modules |
| `**/clients/**` | API client implementations |
| `**/adapters/**` | Adapter pattern implementations |
| `**/connectors/**` | Service connectors |

### Research Document Requirement

Before creating code files in these directories, create `TOOL-RESEARCH.md` in the same directory with:

| Required Section | Description |
|-----------------|-------------|
| Problem Statement | What capability is needed |
| Search Queries Executed | Document `gh search repos`, `npm search` queries |
| Candidates Found | Evaluate tools with >1k stars |
| Final Decision | BUILD or USE with rationale |

### Validation Rules

| Rule | Severity |
|------|----------|
| Missing TOOL-RESEARCH.md | BLOCK |
| Missing required sections | BLOCK |
| No tools evaluated | BLOCK |
| Missing BUILD/USE decision | BLOCK |
| Rejecting tool with >5k stars | WARN (logged to registry) |

### Template Location

```
~/.claude/templates/TOOL-RESEARCH.template.md
```

### Registry Tracking

All research decisions are recorded in:
```
~/.claude/ledger/tool-research-registry.json
```

### Automated Discovery

The hook system provides automated tool discovery via:

```bash
# GitHub search (via gh CLI)
gh search repos "browser automation" --sort stars --limit 10

# npm search
npm search browser-automation
```

## Browser Automation Rules

**Tool Architecture:**

| Tool | Purpose | When to Use | Hook Enforcement |
|------|---------|-------------|------------------|
| Scrapling MCP | Anti-bot page fetching | `s-fetch-page`, `s-fetch-pattern` for protected sites | `browser_automation_gate` (primary) |
| Scrapling CLI | CLI-based extraction | `scrapling extract fetch URL output.md` | Documentation |
| Playwright MCP | Browser interactions | Click, type, screenshot (fallback when Scrapling unhealthy) | `browser_automation_gate` (fallback) |

**Direct Python/Node automation is BLOCKED** by `browser_automation_gate`.

**Auth Escalation:** The `login_detection_escalator` hook monitors for login pages and stops automation, escalating to human user via AskUserQuestion tool. Browser sessions persist in `~/.claude/browser-data` for reuse after authentication.

## MCP Self-Healing

The `session_start` hook executes on every session:
1. Inventories expected MCP servers from `~/.claude/mcp/mcp-registry.json`
2. Health checks each server
3. Self-heals failed servers (reinstall/update)
4. Verifies all tools available
5. Reports status for LLM awareness

## Dynamic Tool Router

Tool preferences are runtime decisions from `~/.claude/tool-router/tool-router.json`.

### Cloud Object Modification Hierarchy

When creating or modifying cloud objects (n8n workflows, ServiceTitan objects, etc.):

| Priority | Tool | Condition |
|----------|------|-----------|
| 1 | Download to temp directory | Always first step |
| 2 | `mcp__n8n__*` / `mcp__servicetitan__*` / system MCP | System MCP healthy |
| 3 | `mcp__morph__edit_file` + API upload | Morph MCP healthy |
| 4 | `mcp__desktop-commander__start_process` | Desktop Commander healthy |
| 5 | `mcp__scrapling__s_fetch_page` + CLI | Scrapling healthy |
| 6 | `AskUserQuestion` | Last resort |

### Local Object Modification Hierarchy

When creating or modifying local files:

| Priority | Tool | Condition |
|----------|------|-----------|
| 1 | `mcp__morph__edit_file` | Morph MCP healthy |
| 2 | `mcp__desktop-commander__edit_block` | Desktop Commander healthy |
| 3 | `Edit` | Built-in tool |
| 4 | `mcp__desktop-commander__start_process` (bun) | Desktop Commander healthy |
| 5 | `mcp__desktop-commander__start_process` (raw) | Desktop Commander healthy |
| 6 | `Bash` | Built-in tool |
| 7 | `AskUserQuestion` | Last resort |

### Ad-Hoc Code Execution Hierarchy

When executing ad-hoc code (prefer bun/JavaScript, avoid Python, avoid full scripts):

| Priority | Tool | Condition |
|----------|------|-----------|
| 1 | `mcp__desktop-commander__start_process` with `bun -e` | Desktop Commander healthy |
| 2 | `Write` to temp file + execute | Built-in tool |
| 3 | `mcp__desktop-commander__start_process` (raw) | Desktop Commander healthy |
| 4 | `Bash` | Built-in tool |
| 5 | `AskUserQuestion` | Last resort |

**Constraints:**
- Prefer bun/JavaScript over Python
- Avoid creating full script files
- Use temp directory for any required files

### Framework Exceptions

Some tools require specific frameworks. These exceptions override the default JavaScript preference:

| Tool | Required Framework | Reason |
|------|-------------------|--------|
| Scrapling CLI | Python | CLI only supports Python scripting |
| Playwright codegen | JavaScript | Playwright's native language |

**Research requirement:** Before adding a framework exception, confirm via research that no preferred-language alternative exists.

### Legacy Routes

| Operation | Primary | Fallback |
|-----------|---------|----------|
| File edit | `mcp__morph__edit_file` | `Edit` |
| Browser navigate | `mcp__scrapling__s_fetch_page` | `mcp__playwright__browser_navigate` |
| Web search | `mcp__exa__search` | `WebSearch` |
| Code search | `mcp__filesystem-with-morph__warpgrep_codebase_search` | `Grep` |

## Subagent Invocation

| Scenario | Subagent | Hook Enforcement |
|----------|----------|------------------|
| After writing code | code-reviewer | `post_code_write` (REQUIRED) |
| Any error/bug | debugger | Manual invocation |
| Creating tests | test-automator | Manual invocation |
| Security-sensitive | security-auditor | Manual invocation |
| System design | system-architect | Manual invocation |
| Spec review | architect-reviewer | `spec_completeness_validator` (recommended) |

## API Key Architecture

Keys must exist in BOTH locations (synchronized by `api_key_sync`):

| Location | Purpose |
|----------|---------|
| ~/.claude/.env | Non-MCP utilities, scripts |
| MCP config JSON | MCP server authentication |

## Task Completion Checklist

Before marking a task complete:
- [ ] Session start hook ran (`session_start`)
- [ ] MCP servers healthy (self-healed if needed)
- [ ] Appropriate subagents invoked (e.g., `code-reviewer`)
- [ ] Code reviewed via code-reviewer subagent
- [ ] Visual validation performed (Scrapling screenshot)
- [ ] All hooks passed (no permission denials)
- [ ] Test runs recorded (if applicable)

## GitHub Framework

The Spinal Cord includes a comprehensive GitHub framework for standardized version control across all projects.

### Commit Conventions

**Standard:** Conventional Commits 1.0.0
**Enforcement:** WARN (soft)

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

| Type | Description | Version Bump |
|------|-------------|--------------|
| `feat` | New feature | MINOR |
| `fix` | Bug fix | PATCH |
| `docs` | Documentation only | None |
| `style` | Formatting, no code change | None |
| `refactor` | Code change, no feature/fix | None |
| `perf` | Performance improvement | PATCH |
| `test` | Adding/updating tests | None |
| `build` | Build system/dependencies | None |
| `ci` | CI configuration | None |
| `chore` | Maintenance tasks | None |

**Breaking Changes:** Add `!` after type or include `BREAKING CHANGE:` in footer for MAJOR bump.

### Default Branch Standard

**Enforcement:** STRICT (hard block)

**Rule:** All repositories MUST use `main` as the default branch. The branch name `master` is BANNED.

| Allowed | Banned |
|---------|--------|
| `main` | `master` |
| `origin/main` | `origin/master` |

The `branch_naming_validator` hook blocks any git command referencing `master`:
- `git checkout master` → BLOCKED
- `git push origin master` → BLOCKED
- `git merge master` → BLOCKED

**Rationale:** Eliminates confusion between `main` and `master` across all projects permanently.

### Branch Naming

**Enforcement:** WARN (soft)

| Prefix | Purpose | Example |
|--------|---------|---------|
| `feature/` | New functionality | `feature/user-auth` |
| `bugfix/` | Bug fixes | `bugfix/login-redirect` |
| `hotfix/` | Urgent fixes | `hotfix/security-patch` |
| `release/` | Release preparation | `release/2.0.0` |
| `chore/` | Maintenance | `chore/update-deps` |
| `docs/` | Documentation | `docs/api-reference` |

### Secret Scanning

**Enforcement:** STRICT (hard block)

Detected patterns include:
- AWS keys (`AKIA...`)
- GitHub tokens (`ghp_...`, `gho_...`)
- Anthropic keys (`sk-ant-...`)
- Private keys (`-----BEGIN...PRIVATE KEY-----`)
- Connection strings (database URLs with embedded credentials)
- JWTs, Slack tokens, Stripe keys, etc.

### Semantic Versioning

**Standard:** SemVer 2.0.0
**Automation:** Fully automatic on push to main

| Commit Type | Version Bump |
|-------------|--------------|
| `BREAKING CHANGE:` or `!` | MAJOR |
| `feat` | MINOR |
| `fix`, `perf` | PATCH |

### Release Automation

On push to main/master:
1. Analyze commits since last tag
2. Calculate version bump
3. Generate changelog
4. Create git tag
5. Create GitHub release

### Git Hooks

| Hook | Event | Action |
|------|-------|--------|
| `secret_scanner` | PreToolUse (Bash git commit/push) | **BLOCK** on secrets |
| `commit_message_validator` | PreToolUse (Bash git commit) | Warn on non-conventional |
| `branch_naming_validator` | PreToolUse (Bash git checkout -b) | Warn on non-conformant |
| `changelog_generator` | PostToolUse (Bash git commit) | Update changelog-registry |
| `semantic_version_calculator` | PostToolUse (Bash git tag) | Update release-registry |

### Templates Location

```
~/.claude/github/
    +-- templates/
    |   +-- README.template.md
    |   +-- CONTRIBUTING.template.md
    |   +-- PR_TEMPLATE.md
    +-- configs/
        +-- commitlint.config.js
        +-- release.config.js
```

## References

**For detailed specifications and templates:**
- Node specification template: `~/.claude/hooks/specs/enforcer-audit-checklist.md`
- Vitest migration guide: `~/.claude/hooks/docs/vitest-migration.md`
- Hook source code: `~/.claude/hooks/src/hooks/`
- Git hooks source: `~/.claude/hooks/src/git/`
- Governance logic: `~/.claude/hooks/src/governance/`
- Test run registry: `~/.claude/ledger/test-run-registry.json`
- Release registry: `~/.claude/ledger/release-registry.json`
- Changelog registry: `~/.claude/ledger/changelog-registry.json`
- Correction ledger: `~/.claude/ledger/correction-ledger.json`
- Tool research registry: `~/.claude/ledger/tool-research-registry.json`
- Tool research template: `~/.claude/templates/TOOL-RESEARCH.template.md`
- GitHub templates: `~/.claude/github/templates/`
- GitHub configs: `~/.claude/github/configs/`
- OpenSpec proposal: `~/.claude/openspec/changes/add-global-github-framework/`

**Hook configuration:** `~/.claude/settings.json`
