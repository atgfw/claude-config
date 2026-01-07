#!/bin/bash
# Session Start Hook
# Proactively installs, connects, updates, and tests all MCP servers at session start
# PORTABLE: Uses relative paths, creates .env template, cross-platform compatible

# Don't exit on error - we want to continue and report all issues
set +e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$CLAUDE_DIR/.env"
OLD_DIR="$CLAUDE_DIR/old"

echo "SESSION START - MCP Server Setup"
echo "================================="
echo ""

# Ensure old directory exists (for deletion ban compliance)
mkdir -p "$OLD_DIR"

# Create .env template if not exists
if [ ! -f "$ENV_FILE" ]; then
    echo "Creating .env file for API keys..."
    cat > "$ENV_FILE" << 'ENVEOF'
# MCP Server API Keys
# Fill in your keys and restart session

# Exa Search API (https://exa.ai)
EXA_API_KEY=

# Supabase (https://supabase.com)
SUPABASE_ACCESS_TOKEN=

# n8n Workflow Automation
N8N_API_KEY=
N8N_BASE_URL=

# ElevenLabs (https://elevenlabs.io)
ELEVENLABS_API_KEY=

# Add other API keys as needed
ENVEOF
    echo "Created $ENV_FILE"
    echo "[ACTION REQUIRED] Add your API keys to $ENV_FILE"
    echo ""
fi

# Source environment variables (portable method)
if [ -f "$ENV_FILE" ]; then
    while IFS='=' read -r key value; do
        # Skip comments and empty lines
        [[ "$key" =~ ^#.*$ ]] && continue
        [[ -z "$key" ]] && continue
        # Export non-empty values
        if [ -n "$value" ]; then
            export "$key=$value"
        fi
    done < "$ENV_FILE"
fi

echo "Step 1: Checking Prerequisites"
echo "------------------------------"

# Check for required tools
MISSING_TOOLS=()

if ! command -v node &> /dev/null; then
    echo "[MISSING] Node.js not installed"
    MISSING_TOOLS+=("node")
else
    echo "[OK] Node.js $(node --version)"
fi

if ! command -v npx &> /dev/null; then
    echo "[MISSING] npx not installed"
    MISSING_TOOLS+=("npx")
else
    echo "[OK] npx available"
fi

if ! command -v claude &> /dev/null; then
    echo "[MISSING] Claude CLI not installed"
    echo "         Install from: https://claude.ai/code"
    MISSING_TOOLS+=("claude")
else
    echo "[OK] Claude CLI $(claude --version 2>/dev/null || echo 'installed')"
fi

if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
    echo ""
    echo "[WARN] Missing tools: ${MISSING_TOOLS[*]}"
    echo "       Some MCP servers may not install correctly"
fi

echo ""
echo "Step 2: MCP Server Status"
echo "-------------------------"

# Define MCP servers with their check commands
# Format: name|description|check_command
declare -a MCP_SERVERS=(
    "scrapling|Browser automation (primary)|echo ok"
    "playwright|Browser automation (fallback)|echo ok"
    "exa|Web search|test -n \"\$EXA_API_KEY\""
    "memory|Persistent memory|echo ok"
    "supabase|Database|test -n \"\$SUPABASE_ACCESS_TOKEN\""
    "n8n-mcp|Workflow automation|test -n \"\$N8N_API_KEY\""
)

CONFIGURED_SERVERS=()
MISSING_SERVERS=()

for server_def in "${MCP_SERVERS[@]}"; do
    IFS='|' read -r name desc check_cmd <<< "$server_def"

    # Check if server is configured in Claude
    if command -v claude &> /dev/null && claude mcp list 2>/dev/null | grep -q "$name"; then
        # Check if it has required env vars
        if eval "$check_cmd" 2>/dev/null; then
            echo "[OK] $name - $desc"
            CONFIGURED_SERVERS+=("$name")
        else
            echo "[WARN] $name configured but missing API key"
            MISSING_SERVERS+=("$name")
        fi
    else
        echo "[--] $name - not configured"
        MISSING_SERVERS+=("$name")
    fi
done

echo ""
echo "Step 3: Subagent Availability"
echo "-----------------------------"

AGENT_DIR="$CLAUDE_DIR/agents"
REQUIRED_AGENTS=("code-reviewer" "debugger" "test-automator" "system-architect" "security-auditor")

if [ -d "$AGENT_DIR" ]; then
    AGENT_COUNT=$(find "$AGENT_DIR" -name "*.md" 2>/dev/null | wc -l)
    echo "[OK] Agent directory exists with $AGENT_COUNT agents"

    for agent in "${REQUIRED_AGENTS[@]}"; do
        if [ -f "$AGENT_DIR/$agent.md" ]; then
            echo "  [OK] $agent"
        else
            echo "  [--] $agent not found"
        fi
    done
else
    echo "[MISSING] Agent directory not found: $AGENT_DIR"
    echo "          Clone from: https://github.com/wshobson/agents"
fi

echo ""
echo "========================================="
echo "SESSION START COMPLETE"
echo ""

if [ ${#MISSING_SERVERS[@]} -gt 0 ]; then
    echo "MCP servers needing setup: ${MISSING_SERVERS[*]}"
fi

if [ ${#MISSING_TOOLS[@]} -gt 0 ]; then
    echo "Missing tools: ${MISSING_TOOLS[*]}"
fi

echo ""
echo "To configure MCP servers, edit:"
echo "  - API keys: $ENV_FILE"
echo "  - MCP config: See CLAUDE.md for config locations"
echo "========================================="
