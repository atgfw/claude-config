# Claude Code Configuration

A portable, git-ready configuration for [Claude Code](https://claude.ai/code) with specialized subagents, skills, hooks, and commands.

## Quick Start

```bash
# Clone to your .claude directory
git clone https://github.com/YOUR_USERNAME/claude-config.git ~/.claude

# Run setup
cd ~/.claude
bash setup.sh
```

## What's Included

### Subagents (`agents/`)

70+ specialized AI subagents for domain-specific tasks:

| Category | Examples |
|----------|----------|
| Development | `code-reviewer`, `debugger`, `test-automator` |
| Architecture | `system-architect`, `backend-architect`, `cloud-architect` |
| Languages | `python-pro`, `typescript-expert`, `rust-pro`, `golang-pro` |
| DevOps | `deployment-engineer`, `devops-troubleshooter`, `terraform-specialist` |
| Security | `security-auditor`, `security-analyst` |
| Data | `data-scientist`, `data-engineer`, `database-optimizer` |
| Specialized | `rewst-jinja-orchestrator`, `n8n-mcp-tester` |

Invoke via Task tool: `Task(subagent_type='code-reviewer', prompt='...')`

### Skills (`skills/`)

| Skill | Purpose |
|-------|---------|
| `frontend-design` | Distinctive UI creation avoiding generic AI aesthetics |
| `webapp-testing` | Playwright-based web application testing |
| `e2e-testing-patterns` | End-to-end testing with Playwright/Cypress |

### Hooks (`hooks/`)

Development process enforcement hooks:

```
SESSION START
    |
[session-start.sh]    <- Check prerequisites, MCP servers, subagents
    |
[pre-task-start.sh]   <- Validate environment before starting work
    |
WORK ON TASK
    |
[post-code-write.sh]  <- Remind to invoke code-reviewer
    |
[pre-task-complete.sh] <- Block completion until visual validation
```

### Commands (`commands/`)

Custom slash commands for complex workflows:

- `rewst-jinja-orchestrator` - Rewst Jinja expression testing

## Configuration

### Environment Variables

Create `~/.claude/.env` with your API keys:

```bash
# MCP Server API Keys
EXA_API_KEY=your_exa_key
SUPABASE_ACCESS_TOKEN=your_supabase_token
N8N_API_KEY=your_n8n_key
N8N_BASE_URL=http://localhost:5678
ELEVENLABS_API_KEY=your_elevenlabs_key
```

### MCP Config Location

MCP server configuration (contains API keys - never commit):

| Platform | Location |
|----------|----------|
| Windows | `%APPDATA%\Claude\claude_desktop_config.json` |
| macOS | `~/Library/Application Support/Claude/claude_desktop_config.json` |
| Linux | `~/.config/claude/claude_desktop_config.json` |

## Core Directives

See `CLAUDE.md` for full details. Key rules:

1. **Visual Validation Required** - Use Scrapling/Playwright to verify UI output
2. **No Deletion** - Move files to `old/` instead of deleting
3. **Mandatory Code Review** - Invoke `code-reviewer` after writing code
4. **No Guessing** - Provide exact quotes and proof for code locations

## Directory Structure

```
~/.claude/
  agents/         # 70+ specialized subagents
  commands/       # Custom slash commands
  hooks/          # Development process hooks
  skills/         # Reusable skill definitions
  plugins/        # Plugin configuration
  old/            # Archived files (never delete, always move here)
  .env            # API keys (gitignored)
  CLAUDE.md       # Core directives for Claude Code
  setup.sh        # One-command setup script
```

## Portability

This configuration is designed to be portable:

- All paths use `~/.claude/` or `$CLAUDE_DIR`
- No hardcoded usernames or domains
- API keys stored in `.env` (gitignored)
- Hooks use relative paths from script location

## Contributing

1. Fork this repository
2. Add your subagents to `agents/`
3. Add skills to `skills/`
4. Test with `bash setup.sh`
5. Submit a pull request

## License

MIT License - See individual files for specific licenses.
