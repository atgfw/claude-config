#!/bin/bash
# Pre-Write Hook
# BLOCKS writes containing emojis
# ENFORCES use of Morph edit_file for code modifications
# Receives: FILE_PATH, CONTENT (from Claude Code)

FILE_PATH="${1:-}"
CONTENT="${2:-}"

echo "PRE-WRITE VALIDATION"
echo "===================="
echo "File: $FILE_PATH"
echo ""

# Check for emojis in content
if echo "$CONTENT" | grep -P '[\x{1F300}-\x{1F9FF}]' > /dev/null 2>&1; then
    echo "[BLOCKED] Emoji detected in file content"
    echo ""
    echo "VIOLATION: Emojis are banned per CLAUDE.md"
    echo ""
    echo "From CLAUDE.md:"
    echo "> Never use emojis anywhere for any reason"
    echo ""
    echo "AFFECTED FILE: $FILE_PATH"
    echo ""
    exit 1
fi

# Check if Morph MCP edit_file is available
if command -v claude &> /dev/null; then
    # Check if filesystem-with-morph MCP server is configured
    if claude mcp list 2>/dev/null | grep -q "filesystem-with-morph"; then
        echo "[BLOCKED] Morph edit_file MCP is available - use it instead of Write/Edit"
        echo ""
        echo "VIOLATION: Write/Edit tool used when edit_file is available"
        echo ""
        echo "From CLAUDE.md:"
        echo "> CRITICAL: Use edit_file MCP tool for ALL code modifications."
        echo "> ALWAYS use edit_file instead of Write, Edit, or str_replace"
        echo "> Performance: edit_file (~11s) vs Write/Edit (~60s)"
        echo ""
        echo "REQUIRED ACTION:"
        echo "  Use edit_file MCP tool with partial code snippet:"
        echo "  - File: $FILE_PATH"
        echo "  - No need for full file content"
        echo "  - Works with any file type"
        echo ""
        exit 1
    fi
fi

echo "[OK] Write allowed (Morph MCP not available)"
