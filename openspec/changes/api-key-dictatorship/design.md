# Design: API Key Dictatorship

## System Architecture

The system has three layers:
1. **Hook Layer** - PostToolUse detector + SessionStart health
2. **Key Layer** - Registry, Detector, Tester, Writer
3. **Storage Layer** - .env + MCP config files

## Key Registry Schema

\
## Detection Flow

1. Tool completes (Bash, Read, etc.)
2. PostToolUse hook fires
3. Extract tool_result text
4. Match against all patterns in registry
5. Queue detected keys (non-blocking)
6. Background: Test connectivity
7. If valid: Save to .env AND MCP config

## Connectivity Testing

Each service has specific test:
- **Anthropic**: POST /v1/messages with x-api-key header
- **OpenAI**: GET /v1/models with Bearer token
- **GitHub**: GET /user with token header
- **Exa**: POST /search with API key

Timeout: 5 seconds max
Valid responses: 200 OK
Invalid: 401/403 (bad key)
Network: Other errors (retry later)

## Security: Key Masking

Format: - - 
NEVER log full keys.

## Dual-Write Strategy

1. Read existing .env
2. Parse as key=value pairs
3. Update or append new key
4. Atomic write via temp file + rename
5. Find MCP configs with matching servers
6. Update env section in JSON
7. Backup before modify

## Integration with Session-Start

Session-start uses same registry:
- Loop through all services
- Check if env var exists
- If exists, run connectivity test
- Report: OK / MISSING / INVALID
