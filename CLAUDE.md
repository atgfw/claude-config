# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Purpose

This is the **Spinal Cord** - a centralized nervous system that superintends the operation of ALL projects through deterministic, authoritative control. Every human corrective action represents a failure: a missing hook, an incomplete rule, or a flawed enforcement mechanism.

## Active Goal Display (MANDATORY)

**EVERY response MUST end with the active goal from the session-scoped goal stack (injected via hooks).**

The authoritative goal source is the session goal stack (`sessions/{id}/goal-stack.json`), NOT `active-goal.json`. The `active-goal.json` file is a sync artifact for cross-tool visibility and MUST NOT be used as the primary source - it is scoped by `projectScope` to prevent cross-session bleeding.

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
    +-- hooks/src/          # TypeScript hook source
    +-- hooks/tests/        # Vitest tests (TDD)
    +-- hooks/dist/         # Compiled JavaScript
    +-- hooks/docs/         # Reference guides (detailed rule docs)
    +-- hooks/specs/        # Specification documents
    +-- mcp/                # Self-managing MCP system
    +-- tool-router/        # Dynamic preference engine
    +-- ledger/             # Tracking registries (test-runs, corrections, releases)
    +-- templates/          # Document templates
    +-- github/             # GitHub framework (templates, configs)
    +-- agents/             # 70+ specialized subagents
    +-- openspec/           # Spec-driven development
    +-- settings.json       # Global hook configuration
    +-- .env                # API keys (gitignored)
```

## Critical Rules

All rules are programmatically enforced by hooks. When a hook blocks an action, its error message explains the rule and shows corrected examples.

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
| **Webhook Path Naming** | `n8n_webhook_path_validator` | kebab-case, no nesting, no "test", must authenticate, **webhookId required** |
| **n8n Cloud-Only Storage** | `stale_workflow_json_detector` | BLOCKS Write/Edit of workflow JSON outside temp/old |
| **n8n Download Blocked** | `n8n_download_blocker` | BLOCKS downloading full workflows via MCP |
| **n8n Temp Cleanup** | `n8n_post_update_cleanup` | Auto-archives temp/*.json after successful push |
| **Secret Scanning** | `secret_scanner` | STRICT: Blocks commits containing API keys/secrets |
| **Commit Conventions** | `commit_message_validator` | WARN: Conventional Commits format recommended |
| **Default Branch** | `branch_naming_validator` | STRICT: Blocks `master`, enforces `main` only |
| **Branch Naming** | `branch_naming_validator` | WARN: prefix/description format recommended |
| **Context-optimized output** | `utils.ts` verbosity system | Terse logging to minimize context consumption |
| **Full file paths required** | `full_path_validator` | STRICT: All file paths must be absolute, not relative |
| **Evidence required for completions** | `evidence_requirement_gate` | STRICT: Task completions require verbatim code evidence (file:line + quote) |
| **Credential context awareness** | `credential_context_injector` | Injects credential location context when API keys/secrets are discussed |

## Hierarchical Development Governance

**Philosophy:** UNTESTED WORK IS UNSUITABLE TO BUILD UPON. All development follows a strict hierarchical, sequential, test-driven pipeline enforced by hooks.

**The 5-Phase Sequential Pipeline:**
1. **SPEC** - Complete specification with inputs/outputs/routes (enforced by `spec_completeness_validator`)
2. **BUILD** - Implementation (blocked until spec approved by `pre_build_gate`)
3. **MOCK TESTING** - Synthetic data validation (tracked by `test_run_registry`)
4. **REAL TESTING** - Live environment validation (tracked by `test_run_registry`)
5. **GATE CHECK** - Perfection verification (enforced by `hierarchical_testing_gate`)

**Node-by-Node Perfection:** Within workflows, nodes are tested sequentially. Building Node 3 while Node 2 is untested is BLOCKED.

**Primordial Pipeline (3 Novel Runs):** Every entity requires 3 complete test runs with NOVEL input data (unique SHA-256 hash) before building upon. Tracked in `~/.claude/ledger/test-run-registry.json`.

## Source of Truth: LIVE APIs

Local files are documentation/cache only. Cloud APIs are authoritative. Before creating ANY cloud object: query the LIVE API, check for duplicates, only proceed if no conflict found. Enforced by `ghost_file_detector` and governance hooks (`n8n_workflow_governance`, `elevenlabs_agent_governance`, `servicetitan_governance`).

## Testing Context Interpretation

When user requests "tests" or "evaluations", interpret as operations on LIVE cloud objects:

| Request | Meaning | Hook/Tool |
|---------|---------|-----------|
| "Run tests on workflows" | Execute/validate LIVE n8n workflows | `n8n_trigger_webhook_workflow` |
| "Test the agents" | Run simulations against LIVE ElevenLabs agents | `elevenlabs-mcp` tools |
| "2000 tests" | 2000 evaluation runs against cloud objects | Batch API calls with rate limiting |
| "Validate everything" | Health check all LIVE cloud objects | Governance hooks |

## Test Framework: Vitest

**Vitest is the ONLY approved test framework.** The `vitest_migration_enforcer` hook blocks Jest/Mocha. See `~/.claude/hooks/docs/vitest-migration.md` for migration guide.

## Browser Automation Rules

| Tool | Purpose | Hook Enforcement |
|------|---------|------------------|
| Scrapling MCP | Anti-bot page fetching (primary) | `browser_automation_gate` |
| Playwright MCP | Browser interactions (fallback) | `browser_automation_gate` |

Direct Python/Node automation is BLOCKED. The `login_detection_escalator` monitors for login pages and escalates to human.

## MCP Self-Healing

The `session_start` hook executes on every session:
1. Inventories expected MCP servers from `~/.claude/mcp/mcp-registry.json`
2. Health checks each server
3. Self-heals failed servers (reinstall/update)
4. Verifies all tools available
5. Reports status for LLM awareness

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

## References

**Detailed rule documentation (not loaded into context - read on demand):**
- n8n governance (naming, webhooks, notes, linting): `~/.claude/hooks/docs/n8n-governance.md`
- GitHub framework (commits, branches, secrets, semver): `~/.claude/hooks/docs/github-framework.md`
- Tool routing (priorities, research gate, framework exceptions): `~/.claude/hooks/docs/tool-routing.md`
- Verbosity system (output levels, prefixes, anti-patterns): `~/.claude/hooks/docs/verbosity-system.md`
- Tool filtering: `~/.claude/hooks/docs/tool-filtering.md`
- Vitest migration: `~/.claude/hooks/docs/vitest-migration.md`

**Source code:**
- Hook source: `~/.claude/hooks/src/hooks/`
- Git hooks: `~/.claude/hooks/src/git/`
- Governance hooks: `~/.claude/hooks/src/governance/`
- Spec templates: `~/.claude/hooks/specs/`

**Registries:**
- Test runs: `~/.claude/ledger/test-run-registry.json`
- Corrections: `~/.claude/ledger/correction-ledger.json`
- Releases: `~/.claude/ledger/release-registry.json`
- Tool research: `~/.claude/ledger/tool-research-registry.json`

**Hook configuration:** `~/.claude/settings.json`
