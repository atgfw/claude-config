#!/bin/bash
# Pre-Task Start Hook
# Ensures all MCP servers and subagents are available before starting any task
# PORTABLE: Uses $HOME, checks .md files, no hardcoded paths
# COMPACT MODE: Skips validation if session-start.sh ran recently (< 1 hour)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"
SESSION_FLAG="$CLAUDE_DIR/.session-validated"

# Check if session validation already ran recently (compact mode optimization)
if [ -f "$SESSION_FLAG" ]; then
    # Get file modification time in seconds since epoch
    if [[ "$OSTYPE" == "darwin"* ]]; then
        FLAG_TIME=$(stat -f %m "$SESSION_FLAG" 2>/dev/null || echo 0)
    else
        FLAG_TIME=$(stat -c %Y "$SESSION_FLAG" 2>/dev/null || echo 0)
    fi
    CURRENT_TIME=$(date +%s)
    TIME_DIFF=$((CURRENT_TIME - FLAG_TIME))

    # Skip if validated within last hour (3600 seconds)
    if [ $TIME_DIFF -lt 3600 ]; then
        echo "[COMPACT MODE] Session validated $(($TIME_DIFF / 60)) minutes ago - skipping pre-task check"
        exit 0
    fi
fi

echo "PRE-TASK VALIDATION HOOK"
echo "========================"

# Required MCP servers (filesystem-with-morph CRITICAL for fast code editing)
REQUIRED_MCP_SERVERS=(
    "filesystem-with-morph"
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

# Create session validation flag for compact mode (expires in 1 hour)
touch "$SESSION_FLAG"

echo ""
echo "Pre-task validation complete (cached for 1 hour)"
echo ""
