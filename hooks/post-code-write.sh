#!/bin/bash
# Post-Code Write Hook
# Reminder to trigger code review after writing code
# PORTABLE: No hardcoded paths

echo "POST-CODE-WRITE HOOK"
echo "===================="
echo ""
echo "Code was written. Code review is MANDATORY."
echo ""

# Check if WRITTEN_FILES env var is set (by Claude Code)
if [ -n "${WRITTEN_FILES:-}" ]; then
    echo "FILES WRITTEN:"
    echo "$WRITTEN_FILES"
    echo ""
fi

echo "REQUIRED ACTION:"
echo "  Invoke code-reviewer subagent via Task tool:"
echo "  Task(subagent_type='code-reviewer', prompt='Review the code changes')"
echo ""
