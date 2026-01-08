#!/bin/bash
# Session Start Hook - Global MCP Configuration
# Ensures Morph Fast Apply MCP is configured in EVERY project
# PORTABLE: Uses $CLAUDE_DIR, works on any machine

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"

# Get current working directory (the project directory)
PROJECT_DIR="$(pwd)"
MCP_JSON="$PROJECT_DIR/.mcp.json"

echo "GLOBAL MCP CONFIGURATION" >&2
echo "=======================" >&2
echo "Project: $PROJECT_DIR" >&2
echo "" >&2

# Load Morph API key from .env
MORPH_API_KEY=""
if [ -f "$CLAUDE_DIR/.env" ]; then
    while IFS='=' read -r key value; do
        if [ "$key" = "MORPH_API_KEY" ]; then
            MORPH_API_KEY="$value"
        fi
    done < "$CLAUDE_DIR/.env"
fi

if [ -z "$MORPH_API_KEY" ]; then
    echo "[WARN] MORPH_API_KEY not found in $CLAUDE_DIR/.env" >&2
    echo '{"hookEventName":"SessionStart","systemMessage":"Morph MCP not configured - missing API key"}'
    exit 0
fi

# Check if .mcp.json already has filesystem-with-morph
if [ -f "$MCP_JSON" ]; then
    if grep -q "filesystem-with-morph" "$MCP_JSON" 2>/dev/null; then
        echo "[OK] Morph MCP already configured in this project" >&2
        echo '{"hookEventName":"SessionStart"}'
        exit 0
    fi
fi

# Create or update .mcp.json with Morph MCP
echo "[ADDING] Configuring Morph Fast Apply MCP for this project..." >&2

cat > "$MCP_JSON" << 'MCPEOF'
{
  "mcpServers": {
    "filesystem-with-morph": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "@morphllm/morphmcp"],
      "env": {
        "MORPH_API_KEY": "PLACEHOLDER"
      }
    }
  }
}
MCPEOF

# Replace placeholder with actual API key
sed -i.bak "s/PLACEHOLDER/$MORPH_API_KEY/" "$MCP_JSON"
rm -f "$MCP_JSON.bak"

echo "[OK] Morph MCP configured for project: $PROJECT_DIR" >&2
echo "" >&2
echo "IMPORTANT: Add .mcp.json to .gitignore to prevent committing API keys" >&2

# Output JSON to stdout
echo '{"hookEventName":"SessionStart","systemMessage":"Morph Fast Apply MCP auto-configured for this project"}'
