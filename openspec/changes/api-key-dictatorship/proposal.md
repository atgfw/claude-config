# Proposal: API Key Dictatorship

**Change ID:** `api-key-dictatorship`
**Status:** Draft
**Created:** 2026-01-12

## Summary

Implement an aggressive API key detection and ingestion system that:
1. Scans ALL tool outputs for API key patterns
2. Classifies detected keys by service
3. Tests connectivity before saving
4. Dual-writes to both `.env` AND MCP config
5. Integrates with session-start health checks

## Motivation

Current state:
- API keys manually added to .env
- MCP configs require separate key configuration
- Missing keys cause silent MCP failures
- No automatic key discovery or validation

Desired state:
- Any API key appearing anywhere gets captured
- Keys automatically tested for validity
- Valid keys saved to both locations atomically
- Session-start verifies all keys work
- Zero manual key management

## Architecture

```
                    +------------------+
                    |   Tool Output    |
                    | (Bash, Read, etc)|
                    +--------+---------+
                             |
                             v
                    +------------------+
                    | API Key Detector |
                    | (PostToolUse)    |
                    +--------+---------+
                             |
              +--------------+--------------+
              |                             |
              v                             v
     +----------------+            +------------------+
     | Key Classifier |            | Pattern Registry |
     | (by prefix)    |            | (known formats)  |
     +-------+--------+            +------------------+
             |
             v
     +----------------+
     | Connectivity   |
     | Tester         |
     +-------+--------+
             |
    +--------+--------+
    |                 |
    v                 v
+--------+      +-----------+
| .env   |      | MCP Config|
| Writer |      | Updater   |
+--------+      +-----------+
```

## Key Detection Patterns

| Service | Env Var | Pattern | Test Endpoint |
|---------|---------|---------|---------------|
| Anthropic | `ANTHROPIC_API_KEY` | `sk-ant-...` | `api.anthropic.com/v1/messages` |
| OpenAI | `OPENAI_API_KEY` | `sk-...` (not ant) | `api.openai.com/v1/models` |
| GitHub | `GITHUB_TOKEN` | `ghp_...`, `gho_...`, `ghu_...` | `api.github.com/user` |
| Exa | `EXA_API_KEY` | Alphanumeric 32+ | `api.exa.ai/search` |
| Supabase | `SUPABASE_ACCESS_TOKEN` | `sbp_...`, `eyJ...` | Supabase API |
| Morph | `MORPH_API_KEY` | Varies | Morph API |
| Slack | `SLACK_BOT_TOKEN` | `xoxb-...` | `slack.com/api/auth.test` |
| AWS | `AWS_ACCESS_KEY_ID` | `AKIA...` | STS GetCallerIdentity |
| N8N | `N8N_API_KEY` | Varies | N8N instance |
| ElevenLabs | `ELEVENLABS_API_KEY` | Varies | ElevenLabs API |

## Hook Integration

### PostToolUse Hook (New: api-key-detector)
- Triggers on ALL tool completions
- Scans `tool_result` for key patterns
- Non-blocking (WARN only)
- Queues detected keys for processing

### Background Processor
- Deduplicates detected keys
- Runs connectivity tests
- Writes to .env and MCP config
- Logs results

### Session-Start Integration
- Reads from same key registry
- Uses same connectivity testers
- Reports missing/invalid keys
- Self-heals by re-testing

## Security Considerations

1. **Never log full keys** - Only show prefix + last 4 chars
2. **Test before save** - Invalid keys rejected
3. **No key echo** - Keys not repeated to stdout
4. **Atomic writes** - .env updated safely
5. **MCP config backup** - Before modification

## Files to Create/Modify

### New Files
- `src/keys/registry.ts` - Key pattern definitions
- `src/keys/detector.ts` - Pattern matching logic
- `src/keys/tester.ts` - Connectivity validation
- `src/keys/writer.ts` - Dual-write to .env + MCP
- `src/hooks/api-key-detector.ts` - PostToolUse hook

### Modified Files
- `src/hooks/session-start.ts` - Use key registry
- `src/mcp/api-key-sync.ts` - Enhance with testers
- `settings.json` - Add new hook

## Success Criteria

1. API key in any Bash output -> detected
2. Detected key -> classified correctly
3. Valid key -> saved to .env AND MCP config
4. Invalid key -> logged, not saved
5. Session-start -> reports key health
6. Agent continues operating (non-blocking)
