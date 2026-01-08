# UserPromptSubmit Hook Fixes

## Root Cause Analysis

UserPromptSubmit hooks were failing with "Failed with non-blocking status code: No stderr output" because:

1. **Missing hookSpecificOutput wrapper** - Hooks outputting JSON without required wrapper
2. **Missing JSON output** - Some code paths exited without outputting ANY JSON
3. **Emoji violations** - Using emojis despite CLAUDE.md ban

## Official Hook Schema

ALL hooks MUST output JSON with `hookSpecificOutput` wrapper:

```json
{
  "hookSpecificOutput": {
    "hookEventName": "UserPromptSubmit",
    "additionalContext": "optional message"
  }
}
```

**Exit code MUST be 0** when outputting JSON.

## Fixes Applied

### 1. pre-task-start.sh (Global)
**Location**: C:\Users\codya\.claude\hooks\pre-task-start.sh

**Issues**:
- Lines 28, 118: Missing `hookSpecificOutput` wrapper

**Fixed**:
```bash
# BEFORE (WRONG)
echo '{"hookEventName":"UserPromptSubmit","additionalContext":""}'

# AFTER (CORRECT)
echo '{"hookSpecificOutput":{"hookEventName":"UserPromptSubmit","additionalContext":""}}'
```

### 2. detect-workflow-intent.js (n8n Project)
**Location**: n8n_workflow_development\.claude\hooks\detect-workflow-intent.js

**Issues**:
- Line 342: Exited without outputting JSON when prompt too short

**Fixed**:
```javascript
// BEFORE (WRONG)
if (!prompt || prompt.length < 10) {
  logHook('detect-workflow-intent', 'Skipped', { reason: 'prompt too short' });
  process.exit(0); // NO JSON OUTPUT!
}

// AFTER (CORRECT)
if (!prompt || prompt.length < 10) {
  logHook('detect-workflow-intent', 'Skipped', { reason: 'prompt too short' });
  outputResult({
    hookSpecificOutput: {
      hookEventName: "UserPromptSubmit",
      additionalContext: ""
    }
  });
  process.exit(0);
}
```

### 3. detect-voice-agent-intent.js (n8n Project)
**Location**: n8n_workflow_development\.claude\hooks\detect-voice-agent-intent.js

**Issues**:
- Line 78: Used emoji "🎤" violating CLAUDE.md

**Fixed**:
```javascript
// BEFORE (WRONG)
additionalContext: `🎤 VOICE AGENT FACTORY ACTIVATED

// AFTER (CORRECT)
additionalContext: `VOICE AGENT FACTORY ACTIVATED
```

## Testing UserPromptSubmit Hooks

### Test 1: pre-task-start.sh (Short prompt)
```bash
echo '{"user_prompt":"test"}' | bash ~/.claude/hooks/pre-task-start.sh
```

**Expected**: JSON output with hookSpecificOutput wrapper, exit 0

### Test 2: detect-workflow-intent.js (Short prompt)
```bash
echo '{"user_prompt":"hi"}' | node n8n_workflow_development/.claude/hooks/detect-workflow-intent.js
```

**Expected**: JSON output (not crash), exit 0

### Test 3: detect-workflow-intent.js (Workflow keyword)
```bash
echo '{"user_prompt":"create a workflow to sync data from Salesforce to Slack"}' | \
  node n8n_workflow_development/.claude/hooks/detect-workflow-intent.js
```

**Expected**: JSON with mandatory skill invocation message, exit 0

### Test 4: detect-voice-agent-intent.js (Voice agent keyword)
```bash
echo '{"user_message":"make a voice agent for Acme Corp"}' | \
  node n8n_workflow_development/.claude/hooks/detect-voice-agent-intent.js
```

**Expected**: JSON with voice agent factory message (NO EMOJI), exit 0

## Complete UserPromptSubmit Hook List

All hooks now properly configured:

1. **pre-task-start.sh** (Global) - Validates MCP servers and subagents
2. **detect-workflow-intent.js** (n8n Project) - Routes to n8n-workflow-dev skill
3. **detect-voice-agent-intent.js** (n8n Project) - Routes to voice-agent-factory skill

## Verification Checklist

- [x] All hooks output JSON with `hookSpecificOutput` wrapper
- [x] All hooks use exit 0 (not exit 1 or 2)
- [x] All code paths output JSON before exit
- [x] No emojis in any hook output
- [x] All hooks have proper error handling (fail open)

## Next Steps

1. Restart Claude Code session
2. Verify no "Failed with non-blocking status code" errors
3. Test workflow request detection
4. Test voice agent request detection

The UserPromptSubmit hooks should now work without errors.
