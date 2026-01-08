#!/bin/bash
# Pre-Write Hook - BLOCKS Write/Edit when Morph MCP is available
# Receives JSON via stdin with tool_input containing file_path and content

# Read JSON from stdin
INPUT=$(cat)

# Extract file path from JSON
if command -v jq &> /dev/null; then
    FILE_PATH=$(echo "$INPUT" | jq -r '.tool_input.file_path // .file_path // empty' 2>/dev/null)
    CONTENT=$(echo "$INPUT" | jq -r '.tool_input.content // .content // empty' 2>/dev/null)
else
    FILE_PATH=$(echo "$INPUT" | grep -oP '"file_path"\s*:\s*"\K[^"]+' | head -1)
    CONTENT=""
fi

# All diagnostic output to stderr
echo "==========================================" >&2
echo "PRE-WRITE HOOK - Morph MCP Enforcement" >&2
echo "==========================================" >&2
echo "File: $FILE_PATH" >&2
echo "" >&2

# Check for emojis in content (if we could extract it)
if [ -n "$CONTENT" ] && echo "$CONTENT" | grep -P '[\x{1F300}-\x{1F9FF}]' > /dev/null 2>&1; then
    echo "[BLOCKED] Emoji detected in file content" >&2
    echo "" >&2
    echo "VIOLATION: Emojis are banned per CLAUDE.md" >&2
    echo "" >&2
    echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Emojis banned per CLAUDE.md"}}'
    exit 0
fi

# Check if Morph MCP edit_file is available
# Method 1: Check if the MCP tool was used recently in this session
MORPH_AVAILABLE=false

# Method 2: Check environment or a flag file
if [ -f "$HOME/.claude/.morph-available" ]; then
    MORPH_AVAILABLE=true
fi

# Method 3: Check if mcp__filesystem-with-morph tools exist in current session
# This is set by the session-start hook
if [ -n "${MORPH_MCP_AVAILABLE:-}" ]; then
    MORPH_AVAILABLE=true
fi

# Method 4: Try to detect from .mcp.json in current directory or home
if [ -f ".mcp.json" ] && grep -q "filesystem-with-morph" ".mcp.json" 2>/dev/null; then
    MORPH_AVAILABLE=true
fi

if [ -f "$HOME/.claude/.mcp.json" ] && grep -q "filesystem-with-morph" "$HOME/.claude/.mcp.json" 2>/dev/null; then
    MORPH_AVAILABLE=true
fi

# Check the project's .mcp.json too
PROJECT_MCP=$(find . -maxdepth 2 -name ".mcp.json" 2>/dev/null | head -1)
if [ -n "$PROJECT_MCP" ] && grep -q "filesystem-with-morph" "$PROJECT_MCP" 2>/dev/null; then
    MORPH_AVAILABLE=true
fi

if [ "$MORPH_AVAILABLE" = true ]; then
    echo "[BLOCKED] Morph edit_file MCP is available" >&2
    echo "" >&2
    echo "VIOLATION: Write/Edit tool used when edit_file is available" >&2
    echo "" >&2
    echo "From CLAUDE.md:" >&2
    echo "> CRITICAL: Use edit_file MCP tool for ALL code modifications." >&2
    echo "> ALWAYS use edit_file instead of Write, Edit, or str_replace" >&2
    echo "" >&2
    echo "REQUIRED: Use mcp__filesystem-with-morph__edit_file instead" >&2
    echo "  - File: $FILE_PATH" >&2
    echo "  - Partial code snippets work" >&2
    echo "  - 10x faster than Write/Edit" >&2
    echo "" >&2
    echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"Use mcp__filesystem-with-morph__edit_file instead of Write/Edit - Morph MCP is available and faster"}}'
    exit 0
fi

echo "[OK] Write allowed (Morph MCP not detected)" >&2
echo '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"allow"}}'
exit 0
