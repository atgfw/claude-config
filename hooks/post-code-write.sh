#!/bin/bash
# Post-Code Write Hook
# BLOCKS until code-reviewer is invoked after writing code
# PORTABLE: No hardcoded paths

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"
REVIEW_FLAG="$CLAUDE_DIR/code-review-completed"

# All diagnostic output to stderr
echo "======================================" >&2
echo "POST-CODE-WRITE HOOK - Code Review" >&2
echo "======================================" >&2
echo "" >&2

# Check if WRITTEN_FILES env var is set (by Claude Code)
if [ -n "${WRITTEN_FILES:-}" ]; then
    echo "Files written:" >&2
    echo "$WRITTEN_FILES" | sed 's/^/  - /' >&2
    echo "" >&2
else
    echo "No WRITTEN_FILES env var (files may have been written)" >&2
    echo "" >&2
fi

# Check if code review was completed
if [ ! -f "$REVIEW_FLAG" ]; then
    echo "[BLOCKED] Code review required before continuing" >&2
    echo "" >&2
    echo "MANDATORY REQUIREMENT from CLAUDE.md:" >&2
    echo "> After writing code | code-reviewer | Immediately after Write/Edit" >&2
    echo "" >&2
    echo "REQUIRED ACTION:" >&2
    echo "  1. Invoke code-reviewer subagent:" >&2
    echo "     Task(subagent_type='code-reviewer', prompt='Review the code changes')" >&2
    echo "" >&2
    echo "  2. After review completes, create flag:" >&2
    echo "     touch $REVIEW_FLAG" >&2
    echo "" >&2
    echo "From CLAUDE.md:" >&2
    echo "> Code review is MANDATORY immediately after Write/Edit operations" >&2
    echo "" >&2
    # Output blocking JSON to stdout
    echo '{"hookSpecificOutput":{"hookEventName":"PostToolUse","decision":"block","reason":"Code review required - invoke code-reviewer subagent"}}'
    exit 0
fi

echo "[OK] Code review completed" >&2

# Move flag to old/ for next write (deletion ban)
OLD_DIR="$CLAUDE_DIR/old"
mkdir -p "$OLD_DIR"
mv "$REVIEW_FLAG" "$OLD_DIR/code-review-completed-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true

# Output success JSON to stdout
echo '{"hookSpecificOutput":{"hookEventName":"PostToolUse","additionalContext":"Code review completed"}}'
