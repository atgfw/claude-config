#!/bin/bash
# Post-Tool-Use Hook
# ENFORCES Scrapling MCP over Playwright for browser automation
# Receives: TOOL_NAME (from Claude Code)

TOOL_NAME="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"
VIOLATION_LOG="$CLAUDE_DIR/scrapling-violations.log"

echo "POST-TOOL-USE VALIDATION"
echo "========================"
echo "Tool used: $TOOL_NAME"
echo ""

# Check if Playwright was used when Scrapling should be used
if echo "$TOOL_NAME" | grep -q "playwright"; then
    # Check if scrapling is available
    if command -v claude &> /dev/null && claude mcp list 2>/dev/null | grep -q "scrapling"; then
        echo "[VIOLATION] Playwright used when Scrapling is available"
        echo ""
        echo "CRITICAL DIRECTIVE VIOLATION from CLAUDE.md:"
        echo "> USE SCRAPLING MCP for all browser automation tasks"
        echo "> Scrapling is preferred over Playwright"
        echo "> Only fall back to Playwright MCP if Scrapling cannot handle a specific use case"
        echo ""
        echo "SCRAPLING IS AVAILABLE - You must use Scrapling instead"
        echo ""

        # Log violation
        echo "$(date): Playwright used instead of Scrapling - Tool: $TOOL_NAME" >> "$VIOLATION_LOG"

        echo "[LOGGED] Violation recorded in: $VIOLATION_LOG"
        echo ""
        echo "Continuing with WARNING..."
        # Don't exit 1 here - just warn, as Playwright might be intentional fallback
    fi
fi

# Check if Python Playwright (non-MCP) was used
if echo "$TOOL_NAME" | grep -q "^Bash$"; then
    # Check command for Python Playwright imports
    if [ -n "${BASH_COMMAND:-}" ] && echo "${BASH_COMMAND}" | grep -E 'from playwright|import playwright|playwright\.sync_api' > /dev/null 2>&1; then
        echo "[BLOCKED] Direct Python Playwright detected"
        echo ""
        echo "CRITICAL VIOLATION from CLAUDE.md:"
        echo "> USE SCRAPLING MCP for all browser automation tasks"
        echo ""
        echo "You attempted to use Python Playwright directly instead of MCP tools"
        echo ""
        echo "REQUIRED USAGE:"
        echo "  Use Scrapling MCP tools:"
        echo "  - mcp__scrapling__navigate(url)"
        echo "  - mcp__scrapling__screenshot(filename)"
        echo "  - mcp__scrapling__extract(selector)"
        echo "  - mcp__scrapling__click(selector)"
        echo ""
        echo "  OR use Playwright MCP (if Scrapling can't handle):"
        echo "  - mcp__playwright__browser_navigate(url)"
        echo "  - mcp__playwright__browser_screenshot(filename)"
        echo ""
        exit 1
    fi
fi

echo "[OK] Tool usage compliant"
