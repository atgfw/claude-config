# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Portability

This configuration is git-ready and portable. After cloning:
```bash
cd ~/.claude
bash setup.sh
```

All paths use `~/.claude/` or `$CLAUDE_DIR` - never hardcoded user paths. API keys go in `.env` (gitignored).

## Core Directives

### Visual Validation Requirement
Task completion requires visual validation using MCP tools and subagents. Do not rely solely on code execution success. Use Scrapling or browser automation to verify actual UI/workflow output matches expectations. All subagents and MCP servers must be confirmed available before proceeding.

### Critical Rules
- **Never guess about code locations** - Always provide exact quotes and proof. If something doesn't exist, state that definitively with evidence.
- **Deletion is banned** - Never use `rm`, `del`, `Remove-Item`. Always move files to `old/` directory instead.
- **Never use emojis** anywhere for any reason.
- **Always provide links** when referencing external resources or created artifacts.

## Directory Structure

```
~/.claude/
  agents/          # 70+ specialized subagents (code-reviewer, debugger, etc.)
  commands/        # Custom slash commands (rewst-jinja-orchestrator)
  hooks/           # Development process hooks (session-start, pre-task-start, etc.)
  skills/          # Custom skills (frontend-design, webapp-testing, e2e-testing-patterns)
  _PROJECTS_/      # Project-specific configurations
  plans/           # Implementation plans
  todos/           # Task tracking data
  old/             # Archive directory (never delete, always move here)
  .env             # API keys (gitignored)
  setup.sh         # Portable setup script
```

## MCP Server Management

### Browser Automation Priority
**USE SCRAPLING MCP** for all browser automation tasks. Scrapling is preferred over Playwright for:
- Web scraping and data extraction
- Page interaction and form filling
- Screenshot capture and visual validation
- Any browser-based testing

Only fall back to Playwright MCP if Scrapling cannot handle a specific use case.

### Session Start Hook
Run `~/.claude/hooks/session-start.sh` at the beginning of each session to:
- Install/update all MCP servers
- Connect MCP servers to Claude
- Save API keys to `.env`
- Curl test each server for connectivity

```bash
bash ~/.claude/hooks/session-start.sh
```

### Tool Categories
- **Browser Automation**: Scrapling (primary), Playwright (fallback)
- **Data Analysis**: Desktop Commander process tools, Exa for web research
- **Code Operations**: Built-in file tools (Read, Edit, Bash)
- **Web Research**: Exa tools for searches, WebFetch for specific URLs
- **UI Development**: Material UI MCP for component examples
- **Memory Management**: Memory MCP for persistent knowledge graphs

For novel tasks, search for an MCP server that can handle it more effectively.

### MCP Server Reference
External documentation: `$HOME/Documents/mcp-server-instructions.md` (create locally or see MCP docs)

### MCP Config Location (CONTAINS API KEYS)
```
Windows: %APPDATA%\Claude\claude_desktop_config.json
macOS:   ~/Library/Application Support/Claude/claude_desktop_config.json
Linux:   ~/.config/claude/claude_desktop_config.json
```
This file contains API keys for MCP servers. NEVER commit this file. It is outside `~/.claude/` but is gitignored if copied here.

## Subagent Invocation

Location: `~/.claude/agents/`

Invoke subagents via Task tool with `subagent_type` parameter. Mandatory usage:

| Scenario | Subagent | When |
|----------|----------|------|
| After writing code | `code-reviewer` | Immediately after Write/Edit |
| Any error/bug | `debugger` | When errors occur |
| Creating tests | `test-automator` | Before marking feature complete |
| Rewst Jinja work | `rewst-jinja-orchestrator` | Any Jinja debugging/creation |
| CI/CD setup | `deployment-engineer` | Pipeline/container configuration |
| Security-sensitive code | `security-auditor` | Auth flows, vulnerability reviews |
| System design | `system-architect` | API contracts, database schemas |
| Complex searches | `general-purpose` | When unsure about file locations |
| MCP implementation | `mcp-backend-engineer` | MCP server modifications |
| Technology evaluation | `technical-researcher` | Framework/library decisions |

## Skills

| Skill | Purpose |
|-------|---------|
| `frontend-design` | Distinctive UI creation avoiding generic AI aesthetics |
| `webapp-testing` | Scrapling/Playwright-based local web app testing |
| `e2e-testing-patterns` | E2E testing with Playwright/Cypress |

## Hooks

Hooks are **programmatically enforced** via `settings.json` configuration. They trigger automatically during Claude Code execution.

### Hook Execution Order
```
SESSION START
    |
[session-start.sh] <- Manual: Run at session start (not automated)
    |
START TASK
    |
[pre-task-start.sh] <- AUTO: Validates MCP servers & subagents exist
    |
WORK ON TASK
    |
[post-code-write.sh] <- AUTO: Triggers after Write/Edit operations
    |
[pre-task-complete.sh] <- AUTO: BLOCKS completion until visual validation
    |
END TASK
```

**Configured in `settings.json`:**
```json
{
  "hooks": {
    "PreToolUse": [
      {"matcher": {"tools": ["BashTool"]}, "hooks": [{"type": "command", "command": "bash ~/.claude/hooks/pre-bash.sh"}]},
      {"matcher": {"tools": ["WriteTool"]}, "hooks": [{"type": "command", "command": "bash ~/.claude/hooks/pre-write.sh"}]}
    ],
    "PostToolUse": [
      {"matcher": {"tools": ["WriteTool", "EditTool"]}, "hooks": [{"type": "command", "command": "bash ~/.claude/hooks/post-code-write.sh"}]},
      {"matcher": {}, "hooks": [{"type": "command", "command": "bash ~/.claude/hooks/post-tool-use.sh"}]}
    ],
    "UserPromptSubmit": [
      {"matcher": {}, "hooks": [{"type": "command", "command": "bash ~/.claude/hooks/pre-task-start.sh"}]}
    ],
    "Stop": [
      {"matcher": {}, "hooks": [{"type": "command", "command": "bash ~/.claude/hooks/pre-task-complete.sh"}]}
    ]
  }
}
```

### Enforcement Mechanisms

| Directive | Hook | Enforcement |
|-----------|------|-------------|
| Use Scrapling MCP | `postToolUse` | Logs violations, blocks direct Playwright |
| Code review mandatory | `postCodeWrite` | BLOCKS until code-reviewer invoked |
| No file deletion | `preBash` | BLOCKS rm/del/Remove-Item commands |
| No emojis | `preWrite`, `preBash` | BLOCKS emoji in files/commands |
| Visual validation | `preTaskComplete` | BLOCKS without validation flag |

## UI Component Protocol

1. Deconstruct requirements from page guides
2. Generate base code from Material UI MCP
3. Adapt styling per `master_design_prompt.md` and `frontend_stack_guide.md`
4. Invoke `code-reviewer` subagent
5. Invoke `test-automator` for Storybook/Vitest tests

## Animation Guidelines (No Framer Motion MCP)

- Use CSS-only solutions first (transitions, keyframes)
- For 3D effects: CSS perspective, transform3d, React state for mouse tracking
- For holographic effects: CSS gradients, backdrop-filter, transform rotateY/X
- Performance: Use `will-change`, prefer `transform`/`opacity`, enable GPU with `translateZ(0)`

## Rewst Jinja Expression Testing

Context pane represents data WITHIN CTX, not the CTX wrapper:
WRONG:
```json
{"CTX": {"ticket_count": 25}}
```

CORRECT:
```json
{"ticket_count": 25}
```

Monaco editor auto-adds closing braces - remove extra trailing braces when they appear.

Use multi-expression debugging (10+ expressions at once) to accelerate understanding:
```jinja
Submitted: {{ CTX.data | map(attribute="value") | list }}
Stored: {{ ORG.VARIABLES().get("key") | from_yaml_string }}
Comparison: {{ submitted_value == stored_value }}
```

Use `now()` function, not `CTX.now`. Convert datetime to epoch with `| format_datetime('%s') | int`.

## Task Completion Checklist

- [ ] Session start hook ran (MCP servers installed/connected)
- [ ] All MCP servers responding
- [ ] Appropriate subagents invoked
- [ ] Code reviewed via code-reviewer
- [ ] Tests created if applicable
- [ ] Visual validation performed (Scrapling screenshot)
- [ ] Output verified matches expectations
