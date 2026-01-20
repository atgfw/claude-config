# Spec: Tool Preference Hierarchy

## ADDED Requirements

### Requirement: Cloud Object Modification Hierarchy (T1)

The system SHALL follow this precise preference order when creating or modifying cloud objects:

| Priority | Tool | Condition |
|----------|------|-----------|
| 1 | Download to temp directory | Always first step |
| 2 | `mcp__n8n__*` / `mcp__servicetitan__*` / system-specific MCP | MCP healthy |
| 3 | `mcp__morph__edit_file` + API upload | Morph MCP healthy |
| 4 | Ad-hoc API call via `mcp__desktop-commander__start_process` | Desktop Commander healthy |
| 5 | `mcp__scrapling__s_fetch_page` + CLI extraction | Scrapling healthy |
| 6 | `AskUserQuestion` with URL/instructions | Last resort |

#### Scenario: Prefer cloud MCP for n8n workflow
- **GIVEN** a request to modify an n8n workflow
- **WHEN** n8n MCP is healthy
- **THEN** use `mcp__n8n__update_workflow` tool

#### Scenario: Fallback to Morph for cloud object
- **GIVEN** a request to modify a cloud object
- **WHEN** cloud system MCP is unavailable AND Morph MCP is healthy
- **THEN** download definition locally, use `mcp__morph__edit_file`, upload via API

#### Scenario: Fallback to Scrapling CLI
- **GIVEN** a request to modify a cloud object
- **WHEN** cloud MCP, Morph MCP, and Desktop Commander are unavailable
- **THEN** use Scrapling CLI for browser-based modification

#### Scenario: Prompt user as last resort
- **GIVEN** a request to modify a cloud object
- **WHEN** all automated methods fail
- **THEN** use `AskUserQuestion` with URL and manual instructions

---

### Requirement: Local Object Modification Hierarchy (T2)

The system SHALL follow this precise preference order when creating or modifying local objects:

| Priority | Tool | Condition |
|----------|------|-----------|
| 1 | `mcp__morph__edit_file` | Morph MCP healthy |
| 2 | `mcp__desktop-commander__write_file` / `mcp__desktop-commander__edit_block` | Desktop Commander healthy |
| 3 | Claude `Write` / `Edit` / `MultiEdit` | Built-in tools |
| 4 | `mcp__desktop-commander__start_process` with node.js | Desktop Commander healthy |
| 5 | `mcp__desktop-commander__start_process` raw terminal | Desktop Commander healthy |
| 6 | Claude `Bash` | Built-in tool |
| 7 | `AskUserQuestion` | Last resort |

#### Scenario: Prefer Morph for local file edit
- **GIVEN** a request to edit a local file
- **WHEN** Morph MCP is healthy
- **THEN** use `mcp__morph__edit_file` tool

#### Scenario: Fallback to Desktop Commander file tools
- **GIVEN** a request to edit a local file
- **WHEN** Morph MCP is unavailable AND Desktop Commander is healthy
- **THEN** use `mcp__desktop-commander__edit_block` tool

#### Scenario: Fallback to built-in Edit
- **GIVEN** a request to edit a local file
- **WHEN** Morph and Desktop Commander MCPs are unavailable
- **THEN** use Claude built-in `Edit` tool

#### Scenario: Shell fallback order
- **GIVEN** a request requiring shell execution for file modification
- **WHEN** file-specific tools are insufficient
- **THEN** prefer `mcp__desktop-commander__start_process` over Claude `Bash`

---

### Requirement: Ad-Hoc Code Execution Hierarchy (T3)

The system SHALL follow this precise preference order when executing ad-hoc code:

| Priority | Tool | Condition |
|----------|------|-----------|
| 1 | `mcp__desktop-commander__start_process` with `node -e` | Desktop Commander healthy |
| 2 | Claude `Write` to temp file + execute | Built-in tool |
| 3 | `mcp__desktop-commander__start_process` raw command | Desktop Commander healthy |
| 4 | Claude `Bash` | Built-in tool |
| 5 | `AskUserQuestion` | Last resort |

**Default constraints:**
- Prefer node.js/JavaScript over Python for general ad-hoc code
- Avoid creating full script files; prefer one-liners or inline code
- If script required, use temp directory and clean up after

#### Scenario: Execute ad-hoc JavaScript
- **GIVEN** a request to run a quick data transformation
- **WHEN** Desktop Commander MCP is healthy
- **THEN** use `mcp__desktop-commander__start_process` with `node -e "..."` command

#### Scenario: Default to JavaScript over Python
- **GIVEN** a request to execute ad-hoc code
- **WHEN** implementation could use either Python or JavaScript
- **THEN** prefer JavaScript implementation

#### Scenario: Avoid full script creation
- **GIVEN** a request to execute a simple operation
- **WHEN** operation can be a one-liner
- **THEN** execute directly without creating script file

---

### Requirement: Framework Exception for Tool-Specific Requirements (T4)

The system SHALL allow non-preferred languages/frameworks when a tool explicitly requires them.

**Known exceptions:**
| Tool | Required Framework | Reason |
|------|-------------------|--------|
| Scrapling CLI | Python | CLI only supports Python scripting |
| Playwright codegen | JavaScript/TypeScript | Playwright's native language |

#### Scenario: Allow Python for Scrapling
- **GIVEN** a request to use Scrapling CLI for web scraping
- **WHEN** Scrapling requires Python code
- **THEN** Python is ALLOWED (framework exception)

#### Scenario: Research-driven exception
- **GIVEN** a tool that only supports a specific framework
- **WHEN** research confirms no JavaScript/Node alternative exists
- **THEN** the required framework is ALLOWED with documented rationale

#### Scenario: Prefer native framework for tool
- **GIVEN** a request to generate browser automation code
- **WHEN** using Playwright MCP
- **THEN** prefer JavaScript/TypeScript (Playwright's native language)

---

### Requirement: Tool Router Configuration (T5)

The system SHALL store preference hierarchies in `tool-router/tool-router.json` with the following routes:

```json
{
  "routes": [
    {
      "operation": "cloud-object-modify",
      "preferences": [
        { "tool": "system-mcp", "priority": 1, "conditions": { "mcpHealthy": ["n8n", "servicetitan", "elevenlabs"] } },
        { "tool": "mcp__morph__edit_file", "priority": 2, "conditions": { "mcpHealthy": ["morph"] } },
        { "tool": "mcp__desktop-commander__start_process", "priority": 3, "conditions": { "mcpHealthy": ["desktop-commander"] } },
        { "tool": "mcp__scrapling__s_fetch_page", "priority": 4, "conditions": { "mcpHealthy": ["scrapling"] } },
        { "tool": "AskUserQuestion", "priority": 5 }
      ]
    },
    {
      "operation": "local-object-modify",
      "preferences": [
        { "tool": "mcp__morph__edit_file", "priority": 1, "conditions": { "mcpHealthy": ["morph"] } },
        { "tool": "mcp__desktop-commander__edit_block", "priority": 2, "conditions": { "mcpHealthy": ["desktop-commander"] } },
        { "tool": "Edit", "priority": 3 },
        { "tool": "mcp__desktop-commander__start_process", "priority": 4, "conditions": { "mcpHealthy": ["desktop-commander"] } },
        { "tool": "Bash", "priority": 5 },
        { "tool": "AskUserQuestion", "priority": 6 }
      ]
    },
    {
      "operation": "adhoc-code-execute",
      "preferences": [
        { "tool": "mcp__desktop-commander__start_process", "priority": 1, "conditions": { "mcpHealthy": ["desktop-commander"], "runtime": "node" } },
        { "tool": "Write", "priority": 2, "note": "temp file approach" },
        { "tool": "mcp__desktop-commander__start_process", "priority": 3, "conditions": { "mcpHealthy": ["desktop-commander"] } },
        { "tool": "Bash", "priority": 4 },
        { "tool": "AskUserQuestion", "priority": 5 }
      ],
      "frameworkExceptions": {
        "scrapling": "python",
        "playwright-codegen": "javascript"
      }
    }
  ]
}
```

#### Scenario: Route cloud object modification
- **GIVEN** a cloud object modification request for n8n
- **WHEN** tool router evaluates preferences AND n8n MCP is healthy
- **THEN** select `mcp__n8n__*` tools (priority 1)

#### Scenario: Route with framework exception
- **GIVEN** an ad-hoc code execution request using Scrapling
- **WHEN** tool router evaluates preferences
- **THEN** allow Python despite default JavaScript preference (framework exception)

#### Scenario: Handle MCP health changes
- **GIVEN** a tool preference route
- **WHEN** primary MCP becomes unhealthy mid-session
- **THEN** automatically fall back to next healthy preference without user intervention

---

### Requirement: CLAUDE.md Mapping (T6)

The system SHALL document tool preference hierarchies in CLAUDE.md under the Dynamic Tool Router section with precise tool names matching `tool-router.json`.

**Required sections:**
1. Cloud Object Modification table with exact tool names
2. Local Object Modification table with exact tool names
3. Ad-Hoc Code Execution table with exact tool names
4. Framework Exceptions table with rationale

#### Scenario: CLAUDE.md matches tool-router.json
- **GIVEN** a tool preference defined in `tool-router.json`
- **WHEN** CLAUDE.md Dynamic Tool Router section is reviewed
- **THEN** exact same tool names and priority order appear

#### Scenario: Hook description matches CLAUDE.md
- **GIVEN** a hook that enforces tool preferences
- **WHEN** hook description/documentation is reviewed
- **THEN** references CLAUDE.md section for authoritative preference list
