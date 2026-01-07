#!/bin/bash
# Pre-Task Start Hook
# Ensures all MCP servers and subagents are available before starting any task
# PORTABLE: Uses $HOME, checks .md files, no hardcoded paths

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"

echo "PRE-TASK VALIDATION HOOK"
echo "========================"

# Required MCP servers (scrapling preferred over playwright)
REQUIRED_MCP_SERVERS=(
    "scrapling"
    "exa"
    "memory"
)

# Optional MCP servers (warn if missing, don't block)
OPTIONAL_MCP_SERVERS=(
    "playwright"
    "supabase"
    "n8n-mcp"
)

# Required subagents
REQUIRED_SUBAGENTS=(
    "code-reviewer"
    "debugger"
    "test-automator"
    "system-architect"
)

echo ""
echo "Checking MCP server availability..."

# Check if claude CLI exists
if ! command -v claude &> /dev/null; then
    echo "[WARN] Claude CLI not found - skipping MCP server check"
    echo "       Install from: https://claude.ai/code"
else
    # Try to check MCP servers (command may vary by version)
    for server in "${REQUIRED_MCP_SERVERS[@]}"; do
        if claude mcp list 2>/dev/null | grep -q "$server"; then
            echo "[OK] $server configured"
        else
            echo "[WARN] $server not found - run session-start.sh"
        fi
    done

    for server in "${OPTIONAL_MCP_SERVERS[@]}"; do
        if claude mcp list 2>/dev/null | grep -q "$server"; then
            echo "[OK] $server configured (optional)"
        else
            echo "[INFO] $server not configured (optional)"
        fi
    done
fi

echo ""
echo "Checking subagent availability..."

AGENT_DIR="$CLAUDE_DIR/agents"
MISSING_AGENTS=()

for agent in "${REQUIRED_SUBAGENTS[@]}"; do
    # Check for .md files (actual agent format)
    if [ -f "$AGENT_DIR/$agent.md" ]; then
        echo "[OK] $agent available"
    elif [ -f "$AGENT_DIR/$agent.json" ] || [ -f "$AGENT_DIR/$agent.yaml" ]; then
        echo "[OK] $agent available"
    else
        echo "[MISSING] $agent not found in $AGENT_DIR"
        MISSING_AGENTS+=("$agent")
    fi
done

echo ""
if [ ${#MISSING_AGENTS[@]} -gt 0 ]; then
    echo "[WARN] Missing agents: ${MISSING_AGENTS[*]}"
    echo "       Clone agents from: https://github.com/wshobson/agents"
fi

echo ""
echo "Pre-task validation complete"
echo ""
