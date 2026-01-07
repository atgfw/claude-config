#!/bin/bash
# Pre-Bash Hook
# BLOCKS deletion commands - enforces "move to old/" rule
# PORTABLE: Uses $CLAUDE_DIR

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"

# Get the command from environment or args
COMMAND="${BASH_COMMAND:-$1}"

echo "PRE-BASH VALIDATION"
echo "==================="
echo "Command: $COMMAND"
echo ""

# Check for deletion commands
if echo "$COMMAND" | grep -qE '\b(rm|del|Remove-Item)\b'; then
    echo "[BLOCKED] File deletion detected"
    echo ""
    echo "VIOLATION: Deletion is banned per CLAUDE.md"
    echo ""
    echo "From CLAUDE.md:"
    echo "> Deletion is banned - Never use rm, del, Remove-Item"
    echo "> Always move files to old/ directory instead"
    echo ""
    echo "CORRECT USAGE:"
    echo "  mkdir -p ~/.claude/old/path/to/file"
    echo "  mv file.txt ~/.claude/old/path/to/file/"
    echo ""
    exit 1
fi

# Check for emojis in echo/printf commands (will be written to files)
if echo "$COMMAND" | grep -P '[\x{1F300}-\x{1F9FF}]' > /dev/null 2>&1; then
    echo "[BLOCKED] Emoji detected in command"
    echo ""
    echo "VIOLATION: Emojis are banned per CLAUDE.md"
    echo ""
    echo "From CLAUDE.md:"
    echo "> Never use emojis anywhere for any reason"
    echo ""
    exit 1
fi

echo "[OK] Command allowed"
