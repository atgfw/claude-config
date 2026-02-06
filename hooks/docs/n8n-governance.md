# n8n Governance Reference

Comprehensive rules for n8n workflow development. Enforced programmatically by hooks in `hooks/src/governance/`.

## Webhook Path Naming

**Enforced by:** `n8n_webhook_path_validator.ts`

### Rules

1. Webhook trigger paths must be named (not empty)
2. Must be kebab-case
3. Same or similar name as workflow
4. Long names allowed if perfectly prescriptive
5. Webhook path should NOT be nested (no slashes)
6. Webhook node name itself should always be just `webhook`
7. Path should never contain the word "test"
8. All webhook triggers must authenticate by a unique secret key
9. CRITICAL: `webhookId` field REQUIRED (undocumented n8n requirement - causes 404 without it)

### Valid vs Invalid Paths

| Invalid Path | Why | Valid Path |
|--------------|-----|------------|
| `api/customer-sync` | Nested (has slash) | `customer-sync` |
| `customer_sync` | snake_case, not kebab-case | `customer-sync` |
| `test-customer-sync` | Contains "test" | `customer-sync` |
| `CustomerSync` | PascalCase | `customer-sync` |

### Authentication Requirement

All webhooks MUST authenticate using header auth with a unique secret key:

```javascript
{
  "name": "webhook",
  "type": "n8n-nodes-base.webhook",
  "webhookId": "customer-sync-webhook",  // REQUIRED
  "parameters": {
    "path": "customer-sync",
    "httpMethod": "POST",
    "authentication": "headerAuth",
    "options": {
      "headerAuth": {
        "name": "X-Webhook-Secret",
        "value": "={{$env.N8N_IN_SECRET_CUSTOMER_SYNC}}"
      }
    }
  }
}
```

### Secret Key Naming Convention

Store webhook secrets in `~/.claude/.env`:

```
N8N_IN_SECRET_<WEBHOOK_PATH_UPPER_SNAKE>
```

Examples: `customer-sync` -> `N8N_IN_SECRET_CUSTOMER_SYNC`

### webhookId Field (CRITICAL)

Every webhook node MUST have a `webhookId` field. Without it, n8n returns 404 "The requested webhook is not registered". Use a UUID or descriptive slug matching the webhook path.

Discovery: Found through experimental testing. The Execute Workflow node's runtime validation differs from webhook execution. See `docs/N8N-SUBWORKFLOW-ARCHITECTURE.md` for full documentation.

## Naming Conventions

**Enforced by:** `n8n_naming_validator.ts`

### Tag Syntax Reservation

Reserve `[TAG]` bracket syntax ONLY for systems without built-in tag features. n8n has native tags, so bracket tags are BLOCKED except `[DEV]`.

| System | Has Native Tags | Bracket Tags Allowed |
|--------|-----------------|---------------------|
| n8n | Yes | NO (use native tags) |
| ServiceTitan | Limited | YES for status |
| Files | No | YES for prefixes |

### System Name Prefixes

Use full system names as workflow prefixes, NOT abbreviations:

| Wrong | Correct |
|-------|---------|
| `[ST] Customer Sync` | `ServiceTitan_customer_sync` |
| `[EL] Agent Handler` | `ElevenLabs_agent_handler` |
| `[N8N] Orchestrator` | `main_orchestrator` |

### Version Numbers Banned (Global Rule)

Version numbers in object names are BLOCKED across ALL systems.

**Blocked patterns:** `v1`, `v2`, `V3`, `r1`, `r2`, `_1`, `_2`, `ver1`, `version2`

Use n8n tags or create new workflows instead of versioning names.

### Node Naming: snake_case

All n8n node names MUST be snake_case:

| Wrong | Correct |
|-------|---------|
| `GetCustomerData` | `get_customer_data` |
| `HTTP Request` | `http_request` |
| `fetchJobs` | `fetch_jobs` |

### Integers in Names (Global Rule)

Arbitrary integers are BLOCKED in programming object names unless canonical:

**Allowed (canonical):** `base64`, `oauth2`, `sha256`, `utf8`, `http2`, `ipv4`, `aes256`

**Blocked (arbitrary):** `handler2`, `process_data_3`, `sync_v1`

## Node Documentation

**Enforced by:** `n8n_node_note_validator.ts`

### Requirements

| Requirement | Specification |
|-------------|---------------|
| Minimum length | 20 characters |
| Content | Must describe purpose, not repeat name |
| Placeholders | BLOCKED (TODO, FIXME, "add description") |
| Display | "Display Note in Flow?" MUST be enabled |

### Good vs Bad Notes

| Bad (BLOCKED) | Good (ALLOWED) |
|---------------|----------------|
| `HTTP Request` | `Fetches active jobs from ServiceTitan API for current dispatch zone` |
| `Gets data` | `Retrieves customer records filtered by status and creation date` |
| `TODO: add description` | `Transforms raw API response into normalized format for downstream processing` |

## Code Node Governance

**Enforced by:** `code_node_linting_gate.ts`

### Logic Centralization

Maximize workflow logic into JavaScript code nodes. Minimize inline expressions and mustaching in other node types. Code nodes can be locally tested, linted, and version-controlled.

### Complex Expression Detection

Expressions with more than 2 operations trigger a warning to move logic to code nodes:

```javascript
// WARNING: Too complex for inline expression
{{ $json.data.filter(x => x.active).map(x => x.id).join(',') }}

// OK: Simple field access
{{ $json.customer.name }}
```

### Linting Rules

| Rule | Severity | Description |
|------|----------|-------------|
| `no-var` | Error | Use const/let instead of var |
| `no-debugger` | Error | Remove debugger statements |
| `no-eval` | Error | eval() is dangerous |
| `no-console` | Warning | Remove console.log in production |
| `no-empty-catch` | Warning | Handle errors or comment why ignored |

### n8n-Specific Exceptions

These patterns are allowed despite normal linting:

- `$input.all()`, `$json`, `$items`, `$workflow` - n8n globals
- `return items` - standard n8n return pattern
- `$('node name')` - n8n node reference syntax

## Workflow Requirements

### Dual Trigger Pattern

**Enforced by:** `n8n_dual_trigger_validator.ts`

All n8n subworkflows MUST have both `executeWorkflowTrigger` (for parent orchestration) AND `webhook` trigger (for API testing).

### Publishing Requirement

**Enforced by:** `workflow_publishing_gate.ts`

Workflows with webhook triggers MUST be published before production use.

### Webhook HTTP Methods

**Enforced by:** `webhook_methods_validator.ts`

Configure webhooks to accept all expected methods (GET, POST, etc.).

### Evaluations Exit Gate

**Enforced by:** `evaluation_gate.ts`

[DEV] workflows require 98%+ success rate on evaluations before tag removal.

## Cloud-Only Storage

**Enforced by:** `stale_workflow_json_detector.ts`, `n8n_download_blocker.ts`, `n8n_post_update_cleanup.ts`

n8n workflows MUST NOT be stored locally.

**Allowed local files per n8n project folder:**
- `CLAUDE.md` - Project context and goals
- `temp/*.json` - Transient editing workspace (auto-cleaned after push)
- `temp/*.js` - Code node local testing

**Blocked:** Persistent workflow JSON files, downloaded workflow definitions, local "backups".
