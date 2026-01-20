# Morph MCP Tool Loading Issue - 2026-01-15

## Problem

Morph MCP server is configured and connected but tools not appearing in MCPSearch.

**Status:**
- ✅ Configured in ~/.claude.json (line 380-389)
- ✅ Connected - `claude mcp list` shows "✓ Connected"
- ✅ Responding to MCP protocol - `tools/list` returns `edit_file` tool
- ❌ Tool NOT appearing in MCPSearch queries
- ❌ Cannot use `mcp__morph__edit_file` (tool not found)

## Root Cause

Tool name mismatch: Morph exposes `edit_file`, Claude Code expects `mcp__morph__edit_file`.

Claude Code's MCP tool indexing may not be picking up Morph's tools on this session.

## Investigation Results

1. **Morph API Key:** Present in both .env and ~/.claude.json
2. **Flag File:** Created `~/.claude/.morph-available` (20 bytes)
3. **MCP Protocol Test:** Successfully returned tool definition
4. **Tool Name:** `edit_file` (not namespaced with `mcp__morph__`)

## Workaround Applied

Created `.morph-available` flag file so pre_write hook detects Morph availability:
- File: `~/.claude/.morph-available`
- Content: "Morph MCP available"
- Hook function `isMorphAvailable()` should now return true

This enables the pre_write hook to suggest using Morph, even if tools aren't directly callable.

## Expected Behavior After Session Restart

After restarting Claude Code session:
1. MCP tools should re-index
2. `mcp__morph__edit_file` should appear in MCPSearch
3. pre_write hook should block Write/Edit and suggest Morph
4. Direct tool invocation should work

## Immediate Status

**Current session:** Morph tools not callable directly
**pre_write hook:** Now detects Morph as available (via flag file)
**Fallback:** desktop-commander edit_block and write_file working correctly

---

**Created:** 2026-01-15
**Status:** Workaround applied, session restart needed for full resolution
