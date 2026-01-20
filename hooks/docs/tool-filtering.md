# Tool Filtering System

Generic mechanism for whitelisting/blacklisting Claude Code MCP tools.

## Configuration File

Location: `~/.claude/tool-filter-config.json`

```json
{
  "mode": "blocklist",
  "patterns": [
    {
      "pattern": "mcp__servicetitan-mcp__*",
      "action": "block",
      "reason": "ServiceTitan MCP has 454 tools causing context bloat.",
      "exceptions": []
    }
  ]
}
```

## Configuration Options

### Mode

- `blocklist`: Allow all tools by default, block only matched patterns
- `allowlist`: Block all tools by default, allow only matched patterns

### Pattern Object

| Field | Required | Description |
|-------|----------|-------------|
| `pattern` | Yes | Glob-style pattern (e.g., `mcp__*__delete_*`) |
| `action` | Yes | `block` or `allow` |
| `reason` | No | Human-readable explanation for the rule |
| `exceptions` | No | Array of patterns to exclude from this rule |

## Pattern Syntax

Supports glob-style wildcards:

| Pattern | Matches |
|---------|---------|
| `*` | Any characters (0 or more) |
| `?` | Any single character |
| `mcp__servicetitan-mcp__*` | All ServiceTitan tools |
| `mcp__*__delete_*` | All MCP delete operations |
| `mcp__n8n-mcp__n8n_list_*` | All n8n list operations |

## Examples

### Block All ServiceTitan Tools

```json
{
  "mode": "blocklist",
  "patterns": [
    {
      "pattern": "mcp__servicetitan-mcp__*",
      "action": "block",
      "reason": "ServiceTitan has 454 tools - too much context bloat"
    }
  ]
}
```

### Allow Only Specific ServiceTitan Tools

```json
{
  "mode": "blocklist",
  "patterns": [
    {
      "pattern": "mcp__servicetitan-mcp__*",
      "action": "block",
      "exceptions": [
        "mcp__servicetitan-mcp__get_customer",
        "mcp__servicetitan-mcp__get_job"
      ]
    }
  ]
}
```

### Block All Delete Operations

```json
{
  "mode": "blocklist",
  "patterns": [
    {
      "pattern": "mcp__*__delete_*",
      "action": "block",
      "reason": "Deletion operations require manual approval"
    }
  ]
}
```

### Strict Allowlist Mode

```json
{
  "mode": "allowlist",
  "patterns": [
    {
      "pattern": "mcp__n8n-mcp__n8n_list_*",
      "action": "allow"
    },
    {
      "pattern": "mcp__scrapling__*",
      "action": "allow"
    }
  ]
}
```

## Hook Integration

The `tool-filter` hook runs on PreToolUse with matcher `mcp__*`:

```json
{
  "matcher": "mcp__*",
  "hooks": [
    {
      "type": "command",
      "command": "node -e \"process.argv.splice(1,0,'cli.js');require(require('path').join(require('os').homedir(),'.claude','hooks','dist','cli.js'))\" tool-filter"
    }
  ]
}
```

## Testing

Run tests:
```bash
cd ~/.claude/hooks
npm test tool_filter
```

## Editing Configuration

To enable a blocked tool:
1. Open `~/.claude/tool-filter-config.json`
2. Add the tool pattern to the `exceptions` array
3. Save file (no restart needed, loaded on each tool use)

Example:
```json
{
  "pattern": "mcp__servicetitan-mcp__*",
  "action": "block",
  "exceptions": [
    "mcp__servicetitan-mcp__get_customer"  // <- Add this
  ]
}
```
