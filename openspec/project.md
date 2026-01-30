# Project Context

## Purpose

This is the **Spinal Cord** - a centralized nervous system that superintends the operation of ALL projects through deterministic, authoritative control. The primary goal is cross-pollination of learnings, patterns, and corrections across every child project from a single source of truth.

Every human corrective action represents a failure: a missing hook, an incomplete rule, or a flawed enforcement mechanism. The system must evolve to prevent the same correction twice.

## Core Directives

### 1. Child Project Isolation

**Child projects MUST NOT contain project-specific configurations that override or conflict with the global .claude project.**

Prohibited in child projects:
- `.mcp.json` or MCP server configurations
- Custom hooks or `settings.json`
- `.env` files with API credentials
- Tool preference overrides
- Any configuration that shadows global behavior

All configuration flows DOWN from `~/.claude/`. Child projects inherit, never override. If better architectural patterns emerge to streamline this inheritance, implement them immediately.

### 2. Global Hook Supremacy

**All hooks live in `~/.claude/hooks/` and apply universally to every child project.**

Hooks are the enforcement mechanism. They are not optional conveniences - they are the law. Every project, every session, every operation passes through the same hook pipeline.

### 3. Dynamic Hook Engineering

**Hooks must be created, tested, and deployed on-the-fly for any deterministic activity.**

When a pattern emerges that requires enforcement:
1. Identify the invariant that must hold
2. Design the hook with TDD (tests first)
3. Implement, lint, deploy
4. Verify across projects

**The Hook Debt Principle**: Most human corrections stem from missing or incomplete hooks. Every manual intervention is technical debt - the hook that should have existed but didn't. Track these failures. Remediate them.

### 4. Hook Engineering Standards

**All hooks MUST follow these standards:**

| Requirement | Specification |
|-------------|---------------|
| Language | TypeScript or JavaScript only (no shell scripts) |
| Linting | Standard linting convention (ESLint with strict config) |
| Output | Console output for LLM visibility (stdout) |
| Errors | All errors output to stderr with full context |
| Testing | Test-Driven Development mandatory |
| Follow-up | Errors, flaws, and proactive opportunities must be tracked and remediated |

**Hook Output Contract:**
```typescript
interface HookResult {
  decision: 'allow' | 'block' | 'warn';
  reason?: string;
  context?: Record<string, unknown>;
  suggestions?: string[];
}
// All output visible to LLM for learning and adaptation
```

### 5. Self-Managing MCP Infrastructure

**MCP servers must be autonomous: self-install, self-update, self-test, self-heal.**

On every session startup:
1. **Inventory** - Enumerate expected MCP servers
2. **Health Check** - Test each server's responsiveness
3. **Self-Heal** - Failed servers automatically reinstall/update
4. **Verify** - Confirm all tools are available
5. **Report** - Output full status for LLM awareness

No human intervention for MCP failures. The system recovers or reports why it cannot.

### 6. Dual API Key Architecture

**API keys must exist in BOTH locations:**

| Location | Purpose |
|----------|---------|
| `~/.claude/.env` | Non-MCP API utilities, scripts, direct HTTP calls |
| MCP config JSON | MCP server authentication |

Both are necessary. MCP tools need keys in their config. Non-MCP utilities (curl, fetch, SDK calls) need environment variables. Synchronize both on session start.

### 7. Dynamic Tool Routing

**Tool preferences are not static lists - they are intelligent, research-driven decisions made at invocation time.**

The system must:
- Evaluate available tools for each operation
- Consider current MCP server health
- Apply soft preference hierarchies (not hard blocks)
- Adapt based on modern research and discovered patterns
- Route to optimal tool based on real-time context

Static rules like "always use X over Y" are insufficient. The routing must be intelligent:
- If Morph MCP is healthy and fast, prefer it for edits
- If Morph is slow or failing, fall back gracefully
- If a new tool emerges that outperforms current choices, adapt

### 8. Centralized Authority Model

```
~/.claude/ (SPINAL CORD)
    |
    +-- hooks/           # TypeScript hooks with TDD
    |   +-- src/         # Source files
    |   +-- tests/       # Test files
    |   +-- dist/        # Compiled hooks
    |
    +-- mcp/             # Self-managing MCP system
    |   +-- registry/    # Known servers + health state
    |   +-- recovery/    # Auto-heal procedures
    |
    +-- tool-router/     # Dynamic preference engine
    |   +-- strategies/  # Routing strategies
    |   +-- research/    # Modern approaches
    |
    +-- agents/          # Subagent definitions
    +-- skills/          # Skill definitions
    +-- commands/        # Custom commands
    +-- .env             # API keys (synced to MCP configs)
    +-- settings.json    # Global hook configuration
    |
    v
[Child Project A] --> inherits, never overrides
[Child Project B] --> inherits, never overrides
[Child Project N] --> inherits, never overrides
```

## Tech Stack

- **TypeScript/JavaScript** - All hooks, automation, tool routing
- **Bun** - Runtime for hooks (>=1.1.0 required); npm/npx preserved for MCP management
- **ESLint** - Strict linting for all code
- **Vitest** - TDD for hooks (Jest is banned)
- **Markdown** - Agent definitions, documentation
- **JSON** - Settings, MCP configuration
- **Claude Code CLI** - Primary runtime environment

## Project Conventions

### Code Style
- TypeScript strict mode enabled
- ESLint with no warnings allowed
- All async operations properly awaited
- All errors caught and reported with context
- Console output structured for LLM parsing

### Architecture Patterns
- **Centralized Control** - All config in ~/.claude/, flows to children
- **Hook-First Enforcement** - Every rule has a hook
- **Self-Healing Infrastructure** - MCP servers auto-recover
- **Dynamic Routing** - Tool selection at runtime, not design time
- **Correction Tracking** - Every human fix becomes a hook

### Testing Strategy
- TDD mandatory for all hooks
- Integration tests for MCP self-healing
- End-to-end validation on session start
- Regression tests for previously-fixed issues

### Git Workflow
- Main branch: `master`
- Hook changes require passing tests
- Breaking changes require migration path

## Domain Context

### The Correction Debt Ledger

Track every human corrective action:
- What was the symptom?
- What was the root cause?
- What hook would have prevented it?
- Was the hook implemented?
- Has it recurred?

This ledger drives continuous improvement. Zero corrections is the goal.

### MCP Server Registry

Maintain a registry of:
- Server name, package, version
- Health check endpoint/method
- Recovery procedure
- Last known status
- Failure history

### Tool Routing Research

Continuously gather:
- Performance benchmarks for competing tools
- Reliability metrics
- New tools entering the ecosystem
- Deprecation signals for existing tools

## Important Constraints

- Child projects MUST NOT have local .mcp.json, hooks, or .env
- All hooks MUST be TypeScript/JavaScript with TDD
- All hook output MUST be visible to LLM (stdout/stderr)
- MCP failures MUST self-heal without human intervention
- Tool routing MUST be dynamic, not static preference lists
- Every human correction MUST result in a hook improvement
- API keys MUST exist in both .env AND MCP config

## Remediation Backlog

Current technical debt to address:

1. **Migrate shell hooks to TypeScript** - Current hooks are .sh, need TS
2. **Implement hook test suite** - TDD infrastructure needed
3. **Build MCP self-heal system** - Auto-recovery on failure
4. **Create tool router** - Dynamic preference engine
5. **Sync API key system** - Dual-write to .env and MCP configs
6. **Correction tracking system** - Ledger for human interventions
7. **Child project enforcement** - Detect/prevent local overrides

## Success Metrics

- Zero human corrections for previously-solved problems
- 100% MCP server uptime via self-healing
- All hooks pass linting and tests
- No child project configuration drift
- Tool routing adapts to ecosystem changes automatically
