#!/bin/bash
# Pre-Write Hook
# BLOCKS writes containing emojis
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

echo "[OK] Write allowed"
