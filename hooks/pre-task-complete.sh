#!/bin/bash
# Pre-Task Complete Hook
# BLOCKS task completion until visual validation is performed
# PORTABLE: Uses $CLAUDE_DIR, no deletion (moves flag to old/)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"
VALIDATION_FLAG="$CLAUDE_DIR/validation-completed"
OLD_DIR="$CLAUDE_DIR/old"

echo "TASK COMPLETION GATE"
echo "===================="

if [ ! -f "$VALIDATION_FLAG" ]; then
    echo "[BLOCKED] Cannot mark task complete"
    echo ""
    echo "REASON: Visual validation not performed"
    echo ""
    echo "REQUIRED ACTIONS:"
    echo "1. Use Scrapling MCP (preferred) or Playwright to navigate to output"
    echo "2. Take screenshot with browser_take_screenshot"
    echo "3. Verify visually that output matches expectations"
    echo "4. Create validation flag: touch $VALIDATION_FLAG"
    echo ""
    echo "From CLAUDE.md:"
    echo "> YOU SHALL NOT CONSIDER YOUR TASK COMPLETE UNTIL VISUALLY"
    echo "> VALIDATING WITH YOUR TOOLS"
    echo ""
    exit 1
fi

echo "[OK] Visual validation confirmed"

# Move flag to old/ instead of deleting (deletion ban)
mkdir -p "$OLD_DIR"
mv "$VALIDATION_FLAG" "$OLD_DIR/validation-completed-$(date +%Y%m%d-%H%M%S)" 2>/dev/null || true

echo "[OK] Task completion allowed"
echo ""
