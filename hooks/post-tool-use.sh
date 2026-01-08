#!/bin/bash
# Post-Tool-Use Hook
# ENFORCES Scrapling MCP over Playwright for browser automation
# Receives: TOOL_NAME (from Claude Code)

TOOL_NAME="${1:-}"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"
VIOLATION_LOG="$CLAUDE_DIR/scrapling-violations.log"

# All diagnostic output to stderr
echo "POST-TOOL-USE VALIDATION" >&2
echo "========================" >&2
echo "Tool used: $TOOL_NAME" >&2
echo "" >&2

# Check if Playwright was used when Scrapling should be used
if echo "$TOOL_NAME" | grep -q "playwright"; then
    # Check if scrapling is available
    if command -v claude &> /dev/null && claude mcp list 2>/dev/null | grep -q "scrapling"; then
        echo "[VIOLATION] Playwright used when Scrapling is available" >&2
        echo "" >&2
        echo "CRITICAL DIRECTIVE VIOLATION from CLAUDE.md:" >&2
        echo "> USE SCRAPLING MCP for all browser automation tasks" >&2
        echo "> Scrapling is preferred over Playwright" >&2
        echo "> Only fall back to Playwright MCP if Scrapling cannot handle a specific use case" >&2
        echo "" >&2
        echo "SCRAPLING IS AVAILABLE - You must use Scrapling instead" >&2
        echo "" >&2

        # Log violation
        echo "$(date): Playwright used instead of Scrapling - Tool: $TOOL_NAME" >> "$VIOLATION_LOG"

        echo "[LOGGED] Violation recorded in: $VIOLATION_LOG" >&2
        echo "" >&2
        echo "Continuing with WARNING..." >&2
        # Output JSON with warning context
        echo '{"hookEventName":"PostToolUse","additionalContext":"WARNING: Playwright used when Scrapling available - logged violation"}'
        exit 0
    fi
fi

# Check if Python Playwright (non-MCP) was used
if echo "$TOOL_NAME" | grep -q "^Bash$"; then
    # Check command for Python Playwright imports
    if [ -n "${BASH_COMMAND:-}" ] && echo "${BASH_COMMAND}" | grep -E 'from playwright|import playwright|playwright\.sync_api' > /dev/null 2>&1; then
        echo "[BLOCKED] Direct Python Playwright detected" >&2
        echo "" >&2
        echo "CRITICAL VIOLATION from CLAUDE.md:" >&2
        echo "> USE SCRAPLING MCP for all browser automation tasks" >&2
        echo "" >&2
        echo "You attempted to use Python Playwright directly instead of MCP tools" >&2
        echo "" >&2
        echo "REQUIRED USAGE:" >&2
        echo "  Use Scrapling MCP tools:" >&2
        echo "  - mcp__scrapling__navigate(url)" >&2
        echo "  - mcp__scrapling__screenshot(filename)" >&2
        echo "  - mcp__scrapling__extract(selector)" >&2
        echo "  - mcp__scrapling__click(selector)" >&2
        echo "" >&2
        echo "  OR use Playwright MCP (if Scrapling can't handle):" >&2
        echo "  - mcp__playwright__browser_navigate(url)" >&2
        echo "  - mcp__playwright__browser_screenshot(filename)" >&2
        echo "" >&2
        # Output blocking JSON to stdout
        echo '{"decision":"block","reason":"Direct Python Playwright blocked - use Scrapling MCP"}'
        exit 1
    fi
fi

echo "[OK] Tool usage compliant" >&2

# Output success JSON to stdout
echo '{"hookEventName":"PostToolUse"}'
