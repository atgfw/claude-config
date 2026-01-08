#!/bin/bash
# Pre-Bash Hook
# BLOCKS deletion commands - enforces "move to old/" rule
# PORTABLE: Uses $CLAUDE_DIR

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"

# Get the command from environment or args
COMMAND="${BASH_COMMAND:-$1}"

# All diagnostic output to stderr
echo "PRE-BASH VALIDATION" >&2
echo "===================" >&2
echo "Command: $COMMAND" >&2
echo "" >&2

# Check for deletion commands
if echo "$COMMAND" | grep -qE '\b(rm|del|Remove-Item)\b'; then
    echo "[BLOCKED] File deletion detected" >&2
    echo "" >&2
    echo "VIOLATION: Deletion is banned per CLAUDE.md" >&2
    echo "" >&2
    echo "From CLAUDE.md:" >&2
    echo "> Deletion is banned - Never use rm, del, Remove-Item" >&2
    echo "> Always move files to old/ directory instead" >&2
    echo "" >&2
    echo "CORRECT USAGE:" >&2
    echo "  mkdir -p ~/.claude/old/path/to/file" >&2
    echo "  mv file.txt ~/.claude/old/path/to/file/" >&2
    echo "" >&2
    # Output blocking JSON to stdout
    echo '{"permissionDecision":"deny","permissionDecisionReason":"Deletion banned - use mv to old/ directory"}'
    exit 1
fi

# Check for emojis in echo/printf commands (will be written to files)
if echo "$COMMAND" | grep -P '[\x{1F300}-\x{1F9FF}]' > /dev/null 2>&1; then
    echo "[BLOCKED] Emoji detected in command" >&2
    echo "" >&2
    echo "VIOLATION: Emojis are banned per CLAUDE.md" >&2
    echo "" >&2
    echo "From CLAUDE.md:" >&2
    echo "> Never use emojis anywhere for any reason" >&2
    echo "" >&2
    # Output blocking JSON to stdout
    echo '{"permissionDecision":"deny","permissionDecisionReason":"Emojis banned per CLAUDE.md"}'
    exit 1
fi

echo "[OK] Command allowed" >&2

# Output success JSON to stdout
echo '{"permissionDecision":"allow"}'
