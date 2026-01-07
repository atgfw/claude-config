#!/bin/bash
# n8n Workflow Validation Hook
# Comprehensive validation checklist for n8n workflows
# PORTABLE: Uses env vars for URLs, no hardcoded domains

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"
ENV_FILE="$CLAUDE_DIR/.env"

echo "N8N WORKFLOW VALIDATION HOOK"
echo "============================"

# Load environment variables
if [ -f "$ENV_FILE" ]; then
    export $(grep -v '^#' "$ENV_FILE" | grep -v '^$' | xargs) 2>/dev/null || true
fi

# Get n8n base URL from env or use default
N8N_URL="${N8N_BASE_URL:-http://localhost:5678}"

WORKFLOW_ID="$1"
WORKFLOW_NAME="${2:-Unnamed Workflow}"

if [ -z "$WORKFLOW_ID" ]; then
    echo "[ERROR] Usage: $0 <workflow_id> [workflow_name]"
    echo ""
    echo "Set N8N_BASE_URL in $ENV_FILE for your n8n instance"
    exit 1
fi

echo "Workflow: $WORKFLOW_NAME ($WORKFLOW_ID)"
echo "n8n URL: $N8N_URL"
echo ""

echo "REQUIRED VALIDATION STEPS:"
echo "  [ ] 1. Code-level validation via n8n_validate_workflow"
echo "  [ ] 2. Code review via code-reviewer subagent"
echo "  [ ] 3. Visual validation via Scrapling/Playwright"
echo "  [ ] 4. Test webhook execution"
echo "  [ ] 5. Verify MCP access enabled"
echo "  [ ] 6. Screenshot captured"
echo ""

echo "EXECUTE THIS WORKFLOW:"
echo "----------------------"
echo ""
echo "# Step 1: Code validation"
echo "mcp__n8n-mcp__n8n_validate_workflow(id: '$WORKFLOW_ID')"
echo ""
echo "# Step 2: Code review"
echo "Task(subagent_type: 'code-reviewer', prompt: 'Review n8n workflow $WORKFLOW_NAME')"
echo ""
echo "# Step 3: Visual validation (use Scrapling preferred)"
echo "mcp__scrapling__navigate(url: '$N8N_URL/workflow/$WORKFLOW_ID')"
echo "mcp__scrapling__screenshot(filename: 'workflow-$WORKFLOW_ID-validation.png')"
echo ""
echo "# Step 4: Test execution (if webhook workflow)"
echo "curl -X POST '$N8N_URL/webhook-test/<webhook-path>'"
echo ""
echo "# Step 5: Verify MCP enabled (manual in n8n UI)"
echo "# Go to workflow settings -> Toggle 'Available in MCP'"
echo ""
echo "# Step 6: Create validation flag"
echo "touch $CLAUDE_DIR/validation-completed"
echo ""
