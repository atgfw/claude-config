#!/bin/bash
# Claude Code Configuration - Portable Setup Script
# Run this after cloning to set up on a new machine

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Claude Code Configuration Setup"
echo "================================"
echo ""

# Create required directories
echo "Creating directory structure..."
mkdir -p "$SCRIPT_DIR/agents"
mkdir -p "$SCRIPT_DIR/commands"
mkdir -p "$SCRIPT_DIR/hooks"
mkdir -p "$SCRIPT_DIR/skills"
mkdir -p "$SCRIPT_DIR/plans"
mkdir -p "$SCRIPT_DIR/todos"
mkdir -p "$SCRIPT_DIR/downloads"
mkdir -p "$SCRIPT_DIR/old"
mkdir -p "$SCRIPT_DIR/_PROJECTS_"

# Create .env template if not exists
if [ ! -f "$SCRIPT_DIR/.env" ]; then
    echo "Creating .env template..."
    cat > "$SCRIPT_DIR/.env" << 'EOF'
# Claude Code MCP Server API Keys
# Copy this file and fill in your keys

# Exa Search API (https://exa.ai)
EXA_API_KEY=

# Supabase (https://supabase.com)
SUPABASE_ACCESS_TOKEN=

# n8n Workflow Automation
N8N_API_KEY=
N8N_BASE_URL=

# Add other service API keys below
EOF
    echo "Created .env template - add your API keys"
fi

# Make hooks executable
echo "Setting hook permissions..."
chmod +x "$SCRIPT_DIR/hooks/"*.sh 2>/dev/null || true

# Verify Claude CLI is available
echo ""
echo "Checking Claude CLI..."
if command -v claude &> /dev/null; then
    echo "  [OK] Claude CLI found"
    claude --version
else
    echo "  [WARN] Claude CLI not found"
    echo "  Install from: https://claude.ai/code"
fi

# Run session start hook
echo ""
echo "Running session start hook..."
if [ -f "$SCRIPT_DIR/hooks/session-start.sh" ]; then
    bash "$SCRIPT_DIR/hooks/session-start.sh"
else
    echo "  [SKIP] session-start.sh not found"
fi

echo ""
echo "================================"
echo "Setup complete!"
echo ""
echo "Next steps:"
echo "1. Add API keys to .env"
echo "2. Run: bash hooks/session-start.sh"
echo "3. Start Claude Code in your project"
echo "================================"
