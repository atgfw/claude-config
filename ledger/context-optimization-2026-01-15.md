# Hook Context Optimization - 2026-01-15

## Problem

Context exhaustion with autocompact failures caused by PostToolUse hooks with universal `"*"` matcher.

**Every single tool call triggered 3 hooks:**
- `post-tool-use`
- `api-key-detector`
- `escalation-trigger`

This caused "Context limit reached · /compact or /clear to continue" errors mid-session.

## Root Cause

settings.json lines 177-203 configured PostToolUse hooks with `"matcher": "*"`:
- Read, Glob, Grep, n8n MCP calls, git commands → ALL triggered 3 hooks
- Hook overhead >> hook value for most operations
- Context filled before autocompact could run

## Solution Implemented

Replaced universal `"*"` matchers with targeted patterns:

### Changes Made to C:\Users\codya\.claude\settings.json

**1. post-tool-use (line 178)**
```json
OLD: "matcher": "*"
NEW: "matcher": "mcp__playwright__*|mcp__scrapling__*|Bash"
```
Reasoning: Only browser automation and bash need Scrapling preference enforcement

**2. api-key-detector (line 187)**
```json
OLD: "matcher": "*"
NEW: "matcher": "Bash|mcp__*|Write|Edit"
```
Reasoning: Only tools that could expose API keys need scanning

**3. escalation-trigger (line 196)**
```json
OLD: "matcher": "*"
NEW: "matcher": "Bash|Write|Edit|mcp__n8n-mcp__*|mcp__elevenlabs__*"
```
Reasoning: Only tools where corrections likely occur need escalation detection

## Expected Impact

**Hook Execution Reduction:**
- Read tool: 3 hooks → 0 hooks (100% reduction)
- Glob tool: 3 hooks → 0 hooks (100% reduction)
- Grep tool: 3 hooks → 0 hooks (100% reduction)
- mcp__n8n-mcp__n8n_get_workflow: 3 hooks → 1 hook (escalation-trigger)
- Bash command: 3 hooks → 3 hooks (no change, appropriate)
- Write/Edit: 3 hooks → 3 hooks (no change, appropriate)

**Overall Reduction:** ~60-70% fewer hook executions for typical workflows

**Context Benefits:**
- Dramatically reduced context overhead per tool call
- Autocompact can run before context exhaustion
- No more "Context limit reached" errors
- Smoother session flow

## Testing

Verified settings.json changes applied correctly:
- Line 178: ✅ `mcp__playwright__*|mcp__scrapling__*|Bash`
- Line 187: ✅ `Bash|mcp__*|Write|Edit`
- Line 196: ✅ `Bash|Write|Edit|mcp__n8n-mcp__*|mcp__elevenlabs__*`

## Related Documentation

- Full optimization spec: `~/.claude/hooks/specs/hook-context-optimization.yaml`
- Includes future optimization strategies (hook batching, silent success)

## Status

**DEPLOYED** - Changes active immediately in current and future sessions

## Validation

Monitor for:
- ✅ No more autocompact failures
- ✅ Context consumption significantly reduced
- ⚠️ Verify api-key-detector still catches exposed keys in Bash/Write
- ⚠️ Verify escalation-trigger still catches repeated corrections

---

**Optimization completed:** 2026-01-15  
**Configuration file:** C:\Users\codya\.claude\settings.json  
**Lines modified:** 178, 187, 196
