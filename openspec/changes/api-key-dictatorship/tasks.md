# Tasks: API Key Dictatorship

## Phase 1: Key Registry & Detection

- [ ] Create `src/keys/registry.ts` with service definitions
  - Pattern regex for each service
  - Env var name mapping
  - Test endpoint URLs
  - MCP server name mapping

- [ ] Create `src/keys/detector.ts` with detection logic
  - `detectApiKeys(text: string): DetectedKey[]`
  - Pattern matching against registry
  - Key masking for logs (`sk-ant-...xxxx`)
  - Deduplication logic

- [ ] Add unit tests for detector
  - Test each known pattern
  - Test false positive rejection
  - Test partial key handling

## Phase 2: Connectivity Testing

- [ ] Create `src/keys/tester.ts` with validation logic
  - `testKey(service: string, key: string): Promise<boolean>`
  - Service-specific test implementations
  - Timeout handling (5s max)
  - Error classification (invalid vs network)

- [ ] Implement testers for each service:
  - Anthropic: POST to messages with minimal payload
  - OpenAI: GET /v1/models
  - GitHub: GET /user with auth header
  - Exa: POST to /search with minimal query
  - Supabase: Auth check
  - Slack: POST to auth.test

- [ ] Add unit tests for testers
  - Mock HTTP responses
  - Test success/failure paths
  - Test timeout handling

## Phase 3: Dual-Write System

- [ ] Create `src/keys/writer.ts` with save logic
  - `saveKey(service: string, key: string): Promise<void>`
  - Atomic .env update (read-modify-write)
  - MCP config discovery and update
  - Backup before modify

- [ ] Implement .env writer
  - Parse existing .env
  - Update or append key
  - Preserve comments and formatting
  - Write atomically

- [ ] Implement MCP config updater
  - Find MCP config files
  - Parse JSON safely
  - Update env section for matching servers
  - Write with backup

- [ ] Add unit tests for writer
  - Test .env creation
  - Test .env update
  - Test MCP config update

## Phase 4: Hook Integration

- [ ] Create `src/hooks/api-key-detector.ts`
  - PostToolUse hook
  - Scan tool_result for keys
  - Queue detected keys
  - Non-blocking (WARN)

- [ ] Create background processor
  - Process queued keys
  - Test connectivity
  - Save valid keys
  - Log results

- [ ] Update `settings.json` with new hook
  - Add PostToolUse matcher for "*"

## Phase 5: Session-Start Integration

- [ ] Refactor `session-start.ts` to use registry
  - Import key registry
  - Use same test functions
  - Report missing keys
  - Report invalid keys

- [ ] Add key health to session output
  - List all registered services
  - Show key status (present/missing/invalid)
  - Show last test time

## Phase 6: Testing & Validation

- [ ] Integration test: key in Bash output
- [ ] Integration test: key saved to .env
- [ ] Integration test: key saved to MCP config
- [ ] Integration test: session-start reports health
- [ ] Manual test: real API key flow
