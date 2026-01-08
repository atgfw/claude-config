# Global Hooks Enforcement

## Policy: Standardized Hook Configuration

**ALL projects must use identical settings.json files that reference global hook scripts.**

### Clarification: How Global Hooks Work

Claude Code does NOT automatically use `~/.claude/settings.json` as a global fallback. Each project requires its own `.claude/settings.json` file.

**To achieve global hooks:**
1. Hook scripts live in `~/.claude/hooks/` (truly global)
2. Each project has an IDENTICAL `settings.json` in `.claude/settings.json`
3. These settings.json files reference the global scripts via `$HOME/.claude/hooks/`
4. Result: All projects use the same hooks (effectively global)

### Rationale
- Prevents local overrides that bypass enforcement
- Ensures Morph MCP, deletion prevention, code review work everywhere
- Updates to hook scripts in ~/.claude/hooks/ apply to all projects instantly
- No project-specific configuration allowed

### Implementation

**Single Source of Truth:**
```
~/.claude/hooks/           <- Hook scripts (truly global)
~/.claude/settings.json    <- Template settings file

Each project:
  project/.claude/settings.json  <- IDENTICAL copy of template
```

**Setup for new projects:**
```bash
# Copy standardized settings to new project
cp ~/.claude/settings.json /path/to/project/.claude/settings.json
```

**Updated n8n project:**
- Copied ~/.claude/settings.json to n8n_workflow_development/.claude/settings.json
- Old custom settings moved to old/ directory
- Now uses global hook scripts via $HOME/.claude/hooks/

**Removed Local Configurations:**
- n8n_workflow_development/.claude/settings.json -> moved to old/

**Global Hook Coverage:**
1. **PreToolUse:**
   - pre-bash.sh: Blocks deletion (rm/del/Remove-Item) and emoji usage
   - pre-write.sh: Enforces Morph edit_file MCP over Write/Edit

2. **PostToolUse:**
   - post-code-write.sh: Requires code-reviewer subagent invocation
   - post-tool-use.sh: Enforces Scrapling MCP over Playwright

3. **UserPromptSubmit:**
   - pre-task-start.sh: Validates MCP servers and subagents exist

4. **Stop:**
   - pre-task-complete.sh: Requires visual validation flag

5. **SessionStart:**
   - session-start-global-mcp.sh: Auto-configures Morph MCP in all projects

### Verification

Check for unauthorized local settings:
```bash
find ~/Documents -name "settings.json" -path "*/.claude/*" | grep -v "/old/"
# Should return NOTHING except ~/.claude/settings.json
```

### Enforcement Rules

1. **ALL projects need .claude/settings.json**
2. **ALL settings.json files must be IDENTICAL copies**
3. **ALL hooks must reference global scripts: $HOME/.claude/hooks/**
4. **NEVER modify hooks in project settings.json - update template instead**
5. **When updating hooks, copy updated settings.json to all projects**

### Template Settings.json

Located at `~/.claude/settings.json`, references all global hooks:

```json
{
  "hooks": {
    "PreToolUse": [
      {"matcher": "Bash", "hooks": [{"type": "command", "command": "bash \"$HOME/.claude/hooks/pre-bash.sh\""}]},
      {"matcher": "Write", "hooks": [{"type": "command", "command": "bash \"$HOME/.claude/hooks/pre-write.sh\""}]}
    ],
    "PostToolUse": [
      {"matcher": "Write|Edit", "hooks": [{"type": "command", "command": "bash \"$HOME/.claude/hooks/post-code-write.sh\""}]},
      {"matcher": "*", "hooks": [{"type": "command", "command": "bash \"$HOME/.claude/hooks/post-tool-use.sh\""}]}
    ],
    "UserPromptSubmit": [
      {"hooks": [{"type": "command", "command": "bash \"$HOME/.claude/hooks/pre-task-start.sh\""}]}
    ],
    "Stop": [
      {"hooks": [{"type": "command", "command": "bash \"$HOME/.claude/hooks/pre-task-complete.sh\""}]}
    ],
    "SessionStart": [
      {"hooks": [{"type": "command", "command": "bash \"$HOME/.claude/hooks/session-start-global-mcp.sh\""}]}
    ]
  }
}
```

### Example: Project-Specific Hook as Global

Instead of n8n project having its own settings.json, add to global settings:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "mcp__n8n-mcp__*",
        "hooks": [
          {
            "type": "command",
            "command": "bash \"$HOME/.claude/hooks/n8n-workflow-validation.sh\""
          }
        ]
      }
    ]
  }
}
```

This hook applies globally but ONLY triggers for n8n MCP tools.

### Migration Checklist

- [x] Move n8n_workflow_development/.claude/settings.json to old/
- [x] Verify ~/.claude/settings.json contains all enforcement hooks
- [x] Document policy: NO local hooks anywhere
- [x] Update CLAUDE.md with global-only policy

### Result

Global hooks now apply to ALL projects:
- n8n_workflow_development
- Any future projects
- All working directories

**Morph MCP enforcement now works universally.**
