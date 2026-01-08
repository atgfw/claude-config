#!/bin/bash
# Pre-Task Complete Hook
# BLOCKS task completion until visual validation is performed
# PORTABLE: Uses $CLAUDE_DIR, no deletion (moves flag to old/)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"
VALIDATION_FLAG="$CLAUDE_DIR/validation-completed"
OLD_DIR="$CLAUDE_DIR/old"

# All diagnostic output goes to stderr
echo "TASK COMPLETION GATE" >&2
echo "====================" >&2

if [ ! -f "$VALIDATION_FLAG" ]; then
    echo "[BLOCKED] Cannot mark task complete" >&2
    echo "" >&2
    echo "REASON: Visual validation not performed" >&2
    echo "" >&2
    echo "REQUIRED ACTIONS:" >&2
    echo "1. Use Scrapling MCP (preferred) or Playwright to navigate to output" >&2
    echo "2. Take screenshot with browser_take_screenshot" >&2
    echo "3. Verify visually that output matches expectations" >&2
    echo "4. Create validation flag: touch $VALIDATION_FLAG" >&2
    echo "" >&2
    echo "From CLAUDE.md:" >&2
    echo "> YOU SHALL NOT CONSIDER YOUR TASK COMPLETE UNTIL VISUALLY" >&2
    echo "> VALIDATING WITH YOUR TOOLS" >&2
    echo "" >&2
    # Output blocking JSON to stdout
    echo '{"decision":"block","reason":"Visual validation not performed - see stderr for details"}'
    exit 1
fi

echo "[OK] Visual validation confirmed" >&2

# Move flag to old/ instead of deleting (deletion ban)
mkdir -p "$OLD_DIR"
mv "$VALIDATION_FLAG" "$OLD_DIR/validation-completed-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true

echo "[OK] Task completion allowed" >&2
echo "" >&2

# Output success JSON to stdout
echo '{"decision":"approve"}'
