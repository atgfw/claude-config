# Spec: API Key Detection & Ingestion

## ADDED Requirements

### Requirement: API Key Pattern Detection

The system SHALL detect API keys in any tool output using pattern matching.

**Supported Patterns:**
| Service | Pattern | Example |
|---------|---------|---------|
| Anthropic | `/sk-ant-[a-zA-Z0-9_-]{90,}/` | `sk-ant-api03-...` |
| OpenAI | `/sk-[a-zA-Z0-9]{48,}/` (not ant) | `sk-proj-...` |
| GitHub | `/gh[pousr]_[a-zA-Z0-9]{36,}/` | `ghp_xxxx...` |
| Exa | `/[a-f0-9]{32,}/` + context | `abc123...` |
| Slack | `/xox[baprs]-[a-zA-Z0-9-]+/` | `xoxb-...` |
| AWS | `/AKIA[A-Z0-9]{16}/` | `AKIAIOSFODNN7EXAMPLE` |

#### Scenario: Detect Anthropic key in Bash output
- GIVEN a Bash tool result containing `export ANTHROPIC_API_KEY=sk-ant-api03-abc123...`
- WHEN api-key-detector hook executes
- THEN key is detected and classified as "anthropic"
- AND key is queued for connectivity testing

#### Scenario: Detect GitHub token in file content
- GIVEN a Read tool result containing `ghp_abc123def456...`
- WHEN api-key-detector hook executes
- THEN key is detected and classified as "github"

#### Scenario: Ignore partial/invalid patterns
- GIVEN text containing `sk-` without full key
- WHEN api-key-detector hook executes
- THEN no key is detected

---

### Requirement: Key Connectivity Testing

The system SHALL validate detected keys by testing connectivity.

**Test Methods:**
| Service | Method | Success Criteria |
|---------|--------|------------------|
| Anthropic | POST /v1/messages | 200 or 401 (valid format) |
| OpenAI | GET /v1/models | 200 |
| GitHub | GET /user | 200 |
| Exa | POST /search | 200 or 401 |

#### Scenario: Test valid Anthropic key
- GIVEN a detected Anthropic API key
- WHEN connectivity test runs
- THEN POST request sent to api.anthropic.com
- AND 200 response marks key as valid

#### Scenario: Test invalid key
- GIVEN a detected key that fails connectivity
- WHEN test returns 401/403
- THEN key is marked invalid
- AND key is NOT saved

#### Scenario: Handle network timeout
- GIVEN a connectivity test that times out
- WHEN 5 seconds elapse
- THEN test fails gracefully
- AND key status is "unknown"

---

### Requirement: Dual-Write to .env and MCP Config

The system SHALL save valid keys to BOTH locations atomically.

**.env Format:**
```
# Auto-detected by API Key Dictatorship
ANTHROPIC_API_KEY=sk-ant-...
```

**MCP Config Update:**
```json
{
  "mcpServers": {
    "service-name": {
      "env": {
        "API_KEY": "sk-ant-..."
      }
    }
  }
}
```

#### Scenario: Save new key to empty .env
- GIVEN no existing .env file
- AND a valid detected key
- WHEN writer executes
- THEN .env is created with key
- AND comment header is added

#### Scenario: Update existing key in .env
- GIVEN existing .env with old key value
- AND new valid key detected
- WHEN writer executes
- THEN .env is updated with new value
- AND other entries preserved

#### Scenario: Update MCP config
- GIVEN MCP config with matching server
- AND valid key detected
- WHEN writer executes
- THEN MCP config env section updated
- AND backup created first

---

### Requirement: Non-Blocking Hook Behavior

The system SHALL NOT block agent operation for key processing.

#### Scenario: Hook allows tool completion
- GIVEN any tool output with potential keys
- WHEN api-key-detector hook executes
- THEN hook returns "allow"
- AND key processing happens asynchronously

#### Scenario: Log key detection
- GIVEN a key detected in output
- WHEN hook executes
- THEN WARN log shows masked key
- AND agent continues operating

---

### Requirement: Session-Start Key Health

The session-start hook SHALL report key health using the same registry.

#### Scenario: Report missing keys
- GIVEN MCP server requiring MORPH_API_KEY
- AND MORPH_API_KEY not in .env
- WHEN session-start executes
- THEN output shows "[WARN] MORPH_API_KEY missing"

#### Scenario: Report invalid keys
- GIVEN API key in .env
- AND connectivity test fails
- WHEN session-start executes
- THEN output shows "[WARN] ANTHROPIC_API_KEY invalid"

#### Scenario: Report healthy keys
- GIVEN API key in .env
- AND connectivity test passes
- WHEN session-start executes
- THEN output shows "[OK] ANTHROPIC_API_KEY"

---

## Security Requirements

### Requirement: Key Masking

The system SHALL never log full API keys.

**Masking Format:** `{prefix}...{last4}`
- Example: `sk-ant-api03-...xyz9`

#### Scenario: Mask key in logs
- GIVEN detected key `sk-ant-api03-abcdefghijklmnop`
- WHEN logging key detection
- THEN log shows `sk-ant-api03-...mnop`
- AND full key never in output

### Requirement: Atomic Writes

The system SHALL use atomic file operations for key storage.

#### Scenario: Crash during write
- GIVEN .env being updated
- AND process crashes mid-write
- THEN original .env preserved
- OR new .env complete (no partial)
