# Tool Routing & Selection Reference

Covers both the Dynamic Tool Router (runtime tool selection) and the Tool Selection Protocol (pre-implementation research gate). Configuration lives in `~/.claude/tool-router/tool-router.json`.

## Dynamic Tool Router

Provides runtime tool selection based on MCP server health and operation type. Enables graceful degradation when preferred tools are unavailable.

### Architecture

```
tool-router.json
    |
    +-- routes[]
    |   +-- operation: string      # Operation category
    |   +-- preferences[]          # Ordered tool preferences
    |   |   +-- tool: string       # Tool name
    |   |   +-- priority: number   # Selection order (1 = highest)
    |   |   +-- conditions?        # Required MCP health, runtime
    |   +-- fallback: string       # Last resort tool
    |
    +-- frameworkExceptions{}      # Language overrides per tool
    +-- lastResearchUpdate         # When exceptions were verified
```

### Route Selection Logic

1. Identify operation type (e.g., `cloud-object-modify`)
2. Iterate preferences by priority (1, 2, 3...)
3. For each preference, check conditions:
   - `mcpHealthy`: Array of MCP server names that must be healthy
   - `runtime`: Required runtime (e.g., `node`)
4. Return first tool where all conditions pass
5. If no conditions pass, use `fallback`

### Operation Categories

#### cloud-object-modify

Creating or modifying cloud objects (n8n workflows, ServiceTitan objects, ElevenLabs agents, etc.)

| Priority | Tool | Rationale |
|----------|------|-----------|
| 1 | System MCP (mcp__n8n__*, etc.) | Native API integration, full feature support, proper error handling |
| 2 | Morph + API upload | Enables fast local editing, then single API call for upload |
| 3 | Desktop Commander (node.js) | Direct API calls via fetch/axios when MCPs unavailable |
| 4 | Scrapling CLI | Browser automation for systems without APIs |
| 5 | AskUserQuestion | Human-in-the-loop when all automation fails |

**Key principle:** Always download cloud objects to temp directory first, modify locally, then upload.

#### local-object-modify

Creating or modifying local files.

| Priority | Tool | Rationale |
|----------|------|-----------|
| 1 | Morph MCP | LLM-accelerated edits, understands context better than simple replacements |
| 2 | Desktop Commander edit_block | Block-based editing with better conflict resolution |
| 3 | Claude Edit | Built-in, always available, simple string replacement |
| 4 | Desktop Commander (node.js) | fs module operations when edits are complex |
| 5 | Desktop Commander (raw) | Shell commands for edge cases |
| 6 | Bash | Built-in shell, always available |
| 7 | AskUserQuestion | Last resort |

#### adhoc-code-execute

Running one-off code snippets (data transforms, API calls, calculations).

| Priority | Tool | Rationale |
|----------|------|-----------|
| 1 | Desktop Commander with `bun -e` | Direct execution, no file creation, fast |
| 2 | Write temp file + execute | When code is too long for `-e` flag |
| 3 | Desktop Commander (raw) | Shell piping and complex commands |
| 4 | Bash | Built-in, always available |
| 5 | AskUserQuestion | Last resort |

**Constraints:** Prefer bun/JavaScript over Python. Avoid creating full script files. Use temp directory for any required files.

#### browser-navigate / browser-screenshot / browser-interact

Web automation and scraping.

| Priority | Tool | Rationale |
|----------|------|-----------|
| 1 | Scrapling MCP | Anti-bot capabilities, handles protected sites |
| 2 | Playwright MCP | Full browser automation when Scrapling insufficient |

#### web-search

| Priority | Tool | Rationale |
|----------|------|-----------|
| 1 | Exa MCP | Semantic search, better for code/technical queries |
| 2 | WebSearch | Built-in, always available |

#### code-search

| Priority | Tool | Rationale |
|----------|------|-----------|
| 1 | Warpgrep (filesystem-with-morph) | Faster, better pattern matching |
| 2 | Grep | Built-in, always available |

### Legacy Routes

| Operation | Primary | Fallback |
|-----------|---------|----------|
| File edit | `mcp__morph__edit_file` | `Edit` |
| Browser navigate | `mcp__scrapling__s_fetch_page` | `mcp__playwright__browser_navigate` |
| Web search | `mcp__exa__search` | `WebSearch` |
| Code search | `mcp__filesystem-with-morph__warpgrep_codebase_search` | `Grep` |

### Framework Exceptions

Some tools require specific programming languages. These exceptions override the default JavaScript preference:

| Tool | Allowed Framework | Reason |
|------|-------------------|--------|
| Scrapling CLI | Python | CLI only supports Python scripting |
| Playwright codegen | JavaScript | Playwright's native codegen language |

**Research requirement:** Before adding a new exception, verify via research that no JavaScript alternative exists. Document the research in `researchSources`.

### Extending the Router

#### Adding a New Route

```json
{
  "operation": "new-operation",
  "description": "What this operation does",
  "preferences": [
    {
      "tool": "preferred_tool",
      "priority": 1,
      "description": "Why this is preferred",
      "conditions": {
        "mcpHealthy": ["required-mcp"]
      }
    },
    {
      "tool": "fallback_tool",
      "priority": 2
    }
  ],
  "fallback": "fallback_tool"
}
```

#### Adding a Framework Exception

1. Research if the tool genuinely requires a specific language
2. Document the research source
3. Add to `frameworkExceptions`:

```json
{
  "toolName": {
    "allowedFramework": "python",
    "reason": "Why this exception is necessary"
  }
}
```

### Integration with Hooks

The tool router is consumed by:

- **browser_automation_gate** - Checks Scrapling vs Playwright health
- **pre_write** - Checks Morph MCP health before Write/Edit
- **session_start** - Reports MCP health for router decisions

### Testing Route Selection

1. **MCP Health Variations:** Manually disable MCPs and verify fallback selection
2. **Framework Exceptions:** Verify Python allowed for Scrapling operations
3. **Condition Evaluation:** Test `runtime: node` conditions

## Tool Selection Protocol

**Enforced by:** `tool_research_gate.ts`

Before implementing automation wrappers, integrations, or client libraries, research existing tools to prevent reinventing the wheel.

### Detection Patterns

The hook triggers when creating code files in these directories:

| Directory Pattern | Description |
|------------------|-------------|
| `**/wrappers/**` | Wrapper modules for external APIs |
| `**/integrations/**` | Third-party integrations |
| `**/automation/**` | Automation scripts/modules |
| `**/clients/**` | API client implementations |
| `**/adapters/**` | Adapter pattern implementations |
| `**/connectors/**` | Service connectors |

### Research Document Requirement

Before creating code files in these directories, create `TOOL-RESEARCH.md` in the same directory with:

| Required Section | Description |
|-----------------|-------------|
| Problem Statement | What capability is needed |
| Search Queries Executed | Document `gh search repos`, `npm search` queries |
| Candidates Found | Evaluate tools with >1k stars |
| Final Decision | BUILD or USE with rationale |

### Validation Rules

| Rule | Severity |
|------|----------|
| Missing TOOL-RESEARCH.md | BLOCK |
| Missing required sections | BLOCK |
| No tools evaluated | BLOCK |
| Missing BUILD/USE decision | BLOCK |
| Rejecting tool with >5k stars | WARN (logged to registry) |

### Template & Registry

- Template: `~/.claude/templates/TOOL-RESEARCH.template.md`
- Registry: `~/.claude/ledger/tool-research-registry.json`

## References

- `~/.claude/tool-router/tool-router.json` - Route configuration
- `~/.claude/mcp/mcp-registry.json` - MCP server inventory
- `~/.claude/hooks/src/hooks/browser_automation_gate.ts` - Route consumption example
- `~/.claude/hooks/src/governance/tool_research_gate.ts` - Research gate implementation
