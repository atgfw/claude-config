#!/bin/bash
# Post-Code Write Hook
# BLOCKS until code-reviewer is invoked after writing code
# PORTABLE: No hardcoded paths

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"
REVIEW_FLAG="$CLAUDE_DIR/code-review-completed"

echo "POST-CODE-WRITE ENFORCEMENT"
echo "==========================="
echo ""

# Check if WRITTEN_FILES env var is set (by Claude Code)
if [ -n "${WRITTEN_FILES:-}" ]; then
    echo "FILES WRITTEN:"
    echo "$WRITTEN_FILES"
    echo ""
fi

# Check if code review was completed
if [ ! -f "$REVIEW_FLAG" ]; then
    echo "[BLOCKED] Code review required before continuing"
    echo ""
    echo "MANDATORY REQUIREMENT from CLAUDE.md:"
    echo "> After writing code | code-reviewer | Immediately after Write/Edit"
    echo ""
    echo "REQUIRED ACTION:"
    echo "  1. Invoke code-reviewer subagent:"
    echo "     Task(subagent_type='code-reviewer', prompt='Review the code changes')"
    echo ""
    echo "  2. After review completes, create flag:"
    echo "     touch $REVIEW_FLAG"
    echo ""
    echo "From CLAUDE.md:"
    echo "> Code review is MANDATORY immediately after Write/Edit operations"
    echo ""
    exit 1
fi

echo "[OK] Code review completed"

# Move flag to old/ for next write (deletion ban)
OLD_DIR="$CLAUDE_DIR/old"
mkdir -p "$OLD_DIR"
mv "$REVIEW_FLAG" "$OLD_DIR/code-review-completed-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true
