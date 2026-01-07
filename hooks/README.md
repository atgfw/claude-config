# Claude Code Hooks - Deterministic Development Process

## Overview

These hooks enforce the development framework defined in CLAUDE.md files.
All hooks are **portable** - they use relative paths and environment variables, no hardcoded user paths.

## Portability Features

- All paths derived from `$SCRIPT_DIR` (where the hook lives)
- Environment variables loaded from `~/.claude/.env`
- No hardcoded usernames or domains
- Checks for `.md` agent files (actual format)
- Scrapling preferred over Playwright
- No deletion commands (uses `mv` to `old/` directory)
- Graceful degradation when tools missing

## Hook Execution Order

```
SESSION START
    |
[session-start.sh] <- Checks prerequisites, MCP servers, subagents
    |
START TASK
    |
[pre-task-start.sh] <- Validates MCP servers & subagents exist
    |
WORK ON TASK
    |
[post-code-write.sh] <- Triggers code-reviewer after writing code
    |
[n8n-workflow-validation.sh] <- For n8n workflows specifically
    |
[pre-task-complete.sh] <- BLOCKS completion until visual validation
    |
END TASK
```

## Hooks

### 0. `session-start.sh`
**When:** Beginning of each Claude Code session
**Purpose:** Check prerequisites, MCP server status, and subagent availability
**Blocks:** NO - Advisory only
**Exit Code:** 0 (reports issues but continues)
**Actions:**
- Creates `.env` template if missing
- Checks Node.js, npx, Claude CLI installed
- Reports MCP server configuration status
- Verifies required subagents exist
- Reports missing API keys

### 1. `pre-task-start.sh`
**When:** Before starting any task
**Purpose:** Verify required MCP servers and subagents are available
**Blocks:** NO - Warnings only (was YES, changed for portability)
**Exit Code:** 0
**Checks:**
- Required: scrapling, exa, memory
- Optional: playwright, supabase, n8n-mcp
- Subagents: code-reviewer, debugger, test-automator, system-architect

### 2. `post-code-write.sh`
**When:** After writing any code file
**Purpose:** Reminder to invoke code-reviewer subagent
**Blocks:** NO - Reminder only
**Exit Code:** 0

### 3. `n8n-workflow-validation.sh`
**When:** After creating/modifying n8n workflow
**Purpose:** Comprehensive validation checklist
**Blocks:** NO - Guidance only
**Exit Code:** 0
**Usage:** `bash n8n-workflow-validation.sh <workflow_id> [workflow_name]`
**Env Vars:** Uses `N8N_BASE_URL` from `.env` (defaults to localhost:5678)

### 4. `pre-task-complete.sh`
**When:** Before marking task complete
**Purpose:** Enforce visual validation requirement from CLAUDE.md
**Blocks:** YES - Task cannot complete without visual validation
**Exit Code:** 1 if validation flag missing
**Validation Flag:** `~/.claude/validation-completed`
**Note:** Moves (not deletes) validation flag to `old/` after use

## Environment Variables

Create `~/.claude/.env` with your API keys:

```bash
# MCP Server API Keys
EXA_API_KEY=your_exa_key
SUPABASE_ACCESS_TOKEN=your_supabase_token
N8N_API_KEY=your_n8n_key
N8N_BASE_URL=https://your-n8n-instance.com
ELEVENLABS_API_KEY=your_elevenlabs_key
```

## Running Hooks Manually

```bash
# Start of session
bash ~/.claude/hooks/session-start.sh

# Before starting work
bash ~/.claude/hooks/pre-task-start.sh

# After n8n workflow changes
bash ~/.claude/hooks/n8n-workflow-validation.sh <workflow-id> "Workflow Name"

# Before marking complete
bash ~/.claude/hooks/pre-task-complete.sh
```

## Visual Validation Flag

The `pre-task-complete.sh` hook checks for `~/.claude/validation-completed`

Create this flag ONLY after:
1. Using Scrapling (preferred) or Playwright to navigate to the UI
2. Taking screenshot with browser tools
3. Visually confirming the output matches expectations

```bash
touch ~/.claude/validation-completed
```

## Subagent Requirements

Required subagents must exist in `~/.claude/agents/` as `.md` files:
- `code-reviewer.md`
- `debugger.md`
- `test-automator.md`
- `system-architect.md`
- `security-auditor.md`

Clone from: https://github.com/wshobson/agents

## Why These Hooks Exist

From `CLAUDE.md`:
> "YOU SHALL NOT CONSIDER YOUR TASK COMPLETE UNTIL VISUALLY VALIDATING WITH YOUR TOOLS"

These hooks make that directive **deterministic** and **enforceable** across any machine.
