#!/bin/bash
# Session Start - Hooks Validation and Repair
# Validates hooks configuration and repairs issues
# Run at session start to ensure enforcement system is functional

set +e  # Don't exit on errors - we want to repair them

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLAUDE_DIR="$(dirname "$SCRIPT_DIR")"
SETTINGS_FILE="$CLAUDE_DIR/settings.json"
HOOKS_DIR="$SCRIPT_DIR"

echo "HOOKS VALIDATION & REPAIR"
echo "========================="
echo ""

ISSUES_FOUND=0
ISSUES_FIXED=0

# Check if settings.json exists
if [ ! -f "$SETTINGS_FILE" ]; then
    echo "[CRITICAL] settings.json not found"
    echo "Creating default settings.json..."

    cat > "$SETTINGS_FILE" << 'SETTINGSEOF'
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/pre-bash.sh"
          }
        ]
      },
      {
        "matcher": "Write",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/pre-write.sh"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Write|Edit",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/post-code-write.sh"
          }
        ]
      },
      {
        "matcher": "*",
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/post-tool-use.sh"
          }
        ]
      }
    ],
    "UserPromptSubmit": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/pre-task-start.sh"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash ~/.claude/hooks/pre-task-complete.sh"
          }
        ]
      }
    ]
  }
}
SETTINGSEOF

    echo "[FIXED] Created settings.json with default hooks configuration"
    ((ISSUES_FIXED++))
else
    echo "[OK] settings.json exists"
fi

# Validate settings.json is valid JSON
echo ""
echo "Validating settings.json format..."
if command -v python &> /dev/null || command -v python3 &> /dev/null; then
    PYTHON_CMD=$(command -v python3 2>/dev/null || command -v python 2>/dev/null)

    # Use cd to ensure we're in the right directory
    cd "$CLAUDE_DIR"
    VALIDATION=$($PYTHON_CMD -c "
import json
import sys
import os
try:
    with open('settings.json', 'r') as f:
        settings = json.load(f)

    # Check hooks field exists
    if 'hooks' not in settings:
        print('MISSING_HOOKS_FIELD')
        sys.exit(1)

    # Validate each hook configuration
    for event, configs in settings['hooks'].items():
        if not isinstance(configs, list):
            print('HOOKS_NOT_ARRAY:%s' % event)
            sys.exit(1)

        for i, config in enumerate(configs):
            if 'hooks' not in config:
                print('MISSING_HOOKS_FIELD:%s[%d]' % (event, i))
                sys.exit(1)

            # Check matcher is string if present
            if 'matcher' in config and not isinstance(config['matcher'], str):
                print('MATCHER_NOT_STRING:%s[%d]' % (event, i))
                sys.exit(1)

    print('VALID')
except json.JSONDecodeError as e:
    print('INVALID_JSON:%s' % str(e))
    sys.exit(1)
except Exception as e:
    print('ERROR:%s' % str(e))
    sys.exit(1)
" 2>&1)

    if [ "$VALIDATION" = "VALID" ]; then
        echo "[OK] settings.json format is valid"
    else
        echo "[ERROR] settings.json validation failed: $VALIDATION"
        echo "[ACTION] Please fix settings.json manually or delete it to regenerate"
        ((ISSUES_FOUND++))
    fi
else
    echo "[WARN] Python not available - skipping JSON validation"
fi

# Check hook scripts exist and are executable
echo ""
echo "Checking hook scripts..."

REQUIRED_HOOKS=(
    "pre-bash.sh"
    "pre-write.sh"
    "post-code-write.sh"
    "post-tool-use.sh"
    "pre-task-start.sh"
    "pre-task-complete.sh"
)

for hook in "${REQUIRED_HOOKS[@]}"; do
    HOOK_PATH="$HOOKS_DIR/$hook"

    if [ ! -f "$HOOK_PATH" ]; then
        echo "[MISSING] $hook not found at $HOOK_PATH"
        ((ISSUES_FOUND++))
    elif [ ! -x "$HOOK_PATH" ]; then
        echo "[FIXING] $hook is not executable, adding execute permission..."
        chmod +x "$HOOK_PATH"
        if [ -x "$HOOK_PATH" ]; then
            echo "[FIXED] $hook is now executable"
            ((ISSUES_FIXED++))
        else
            echo "[FAILED] Could not make $hook executable"
            ((ISSUES_FOUND++))
        fi
    else
        echo "[OK] $hook exists and is executable"
    fi
done

# Check for enforcement flags (cleanup old flags)
echo ""
echo "Checking enforcement flags..."

OLD_FLAGS=(
    "$CLAUDE_DIR/validation-completed"
    "$CLAUDE_DIR/code-review-completed"
)

OLD_DIR="$CLAUDE_DIR/old"
mkdir -p "$OLD_DIR"

for flag in "${OLD_FLAGS[@]}"; do
    if [ -f "$flag" ]; then
        FLAG_NAME=$(basename "$flag")
        echo "[CLEANUP] Found old enforcement flag: $FLAG_NAME"
        mv "$flag" "$OLD_DIR/${FLAG_NAME}-$(date +%Y%m%d-%H%M%S)" 2>/dev/null
        echo "[FIXED] Moved to old/"
        ((ISSUES_FIXED++))
    fi
done

# Check .gitignore includes enforcement flags
echo ""
echo "Checking .gitignore..."

GITIGNORE="$CLAUDE_DIR/.gitignore"
if [ -f "$GITIGNORE" ]; then
    if ! grep -q "validation-completed" "$GITIGNORE"; then
        echo "[WARN] .gitignore missing enforcement flags"
        ((ISSUES_FOUND++))
    else
        echo "[OK] .gitignore includes enforcement flags"
    fi
else
    echo "[WARN] .gitignore not found"
fi

# Summary
echo ""
echo "========================================="
echo "VALIDATION COMPLETE"
echo ""
echo "Issues found: $ISSUES_FOUND"
echo "Issues fixed: $ISSUES_FIXED"
echo ""

if [ $ISSUES_FOUND -gt 0 ]; then
    echo "Action required: Some issues could not be auto-fixed"
    echo "Review the output above for details"
else
    echo "All hooks configured and ready"
fi

echo "========================================="
echo ""

exit 0  # Always exit 0 so session can continue
