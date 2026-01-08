# Global Hooks Enforcement

## Policy: No Local Hooks

**ALL hooks must be global. No project-specific hook configurations allowed.**

### Rationale
Local project settings.json files OVERRIDE global hooks, bypassing critical enforcement:
- Morph MCP edit_file enforcement (pre-write.sh)
- Deletion prevention (pre-bash.sh)
- Code review requirements (post-code-write.sh)
- Scrapling MCP preference (post-tool-use.sh)
- Visual validation (pre-task-complete.sh)

### Implementation

**Single Source of Truth:**
```
~/.claude/settings.json  <- ONLY hook configuration file
```

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

1. **NEVER create project-specific .claude/settings.json**
2. **ALWAYS use global hooks from ~/.claude/settings.json**
3. **Project-specific hooks belong in ~/.claude/hooks/ as global hooks**
4. **If a project needs special hooks, add them to GLOBAL settings with matchers**

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
