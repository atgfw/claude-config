## Context

The spinal cord enforces governance across all child projects. n8n workflows are cloud objects that currently lack comprehensive naming and quality standards. This change extends existing governance patterns (file-governance, n8n-workflow-governance) to cover naming conventions, node documentation, and code node development practices.

**Stakeholders:** All n8n workflow developers, automation engineers, the spinal cord itself

**Constraints:**
- Must integrate with existing hook architecture
- Must not block legitimate workflow operations
- Must support the existing primordial pipeline and hierarchical testing gates

## Goals / Non-Goals

**Goals:**
- Consistent, descriptive n8n object naming across all workflows
- Self-documenting workflows via mandatory node notes
- Centralized, testable logic in code nodes
- Local development and linting for code node JavaScript
- Clear tool preference hierarchies for object modification

**Non-Goals:**
- Migrating existing workflows (warn-only for legacy objects)
- Enforcing code node logic for trivial operations (single-field mappings are fine)
- Blocking code node content that passes linting (linting gates, not bans)

## Decisions

### Decision 1: Tag Syntax Reservation
**What:** Reserve `[TAG]` syntax for systems lacking built-in tag features
**Why:** n8n has native tags; using bracket syntax duplicates functionality and creates naming clutter
**Alternatives:** Continue allowing both styles (rejected: inconsistency)

### Decision 2: System Name Prefix
**What:** Use full system names (`ServiceTitan_`, `ElevenLabs_`) not abbreviations (`[ST]`, `[EL]`)
**Why:** Clarity and searchability; abbreviations require institutional knowledge
**Alternatives:** Short prefix registry (rejected: adds maintenance overhead)

### Decision 3: Version Number Ban
**What:** Block `v1`, `v2`, `r1`, `r2` patterns in object names globally
**Why:** Version numbers indicate poor lifecycle management; use tags/metadata instead
**Alternatives:** Allow but warn (rejected: slippery slope)

### Decision 4: Snake Case for Node Names
**What:** Enforce snake_case for n8n node names
**Why:** Consistency with file governance; nodes are analogous to functions
**Alternatives:** Allow Title Case (rejected: inconsistent with file governance)

### Decision 5: Code Node Maximization
**What:** Encourage consolidating logic into code nodes
**Why:** Code nodes can be locally tested, linted, and version-controlled more easily
**Alternatives:** Allow inline expressions everywhere (rejected: untestable, hard to maintain)

### Decision 6: Tool Preference Hierarchies
**What:** Define explicit preference chains for cloud/local object modification and ad-hoc code
**Why:** Consistent tooling selection; prefer MCPs over built-in tools
**Alternatives:** Static rules per operation (rejected: tool-router already supports dynamic routing)

### Decision 7: Framework Exception for Tool Requirements
**What:** Allow non-preferred languages when a CLI/tool only supports that framework
**Why:** Some tools (Scrapling CLI, specific MCPs) only support certain languages
**Alternatives:** Strict language enforcement (rejected: would block legitimate tool usage)

**Known exceptions:**
- Scrapling CLI requires Python (no JavaScript alternative)
- Playwright codegen prefers JavaScript/TypeScript (native language)

**Research requirement:** Before adding a framework exception, confirm via research that no preferred-language alternative exists

## Risks / Trade-offs

| Risk | Mitigation |
|------|------------|
| Breaking existing workflows | Warn-only mode for existing workflows; strict mode for new |
| Over-engineering code nodes | Allow simple operations in other nodes; only mandate for complex logic |
| Linting blocking valid n8n patterns | Research n8n-specific JavaScript patterns; allow documented exceptions |
| Framework exceptions becoming loopholes | Require research confirmation before adding exceptions; document rationale |

## Migration Plan

1. **Phase 1: Naming Validation** - Add `n8n_naming_validator` hook (warn mode)
2. **Phase 2: Node Documentation** - Add `n8n_node_note_validator` hook
3. **Phase 3: Code Node Governance** - Extend `code_node_test_validator`, add linting gate
4. **Phase 4: Tool Router Update** - Add new preference hierarchies
5. **Rollback:** Each hook has independent toggle in settings.json

## Open Questions

1. What constitutes "substantial" for node notes? (Proposed: minimum 20 characters, describes purpose)
2. Should legacy workflows be flagged during governance checks? (Proposed: yes, warn-only)
3. Which linting rules should be n8n-specific exceptions? (Requires research)
